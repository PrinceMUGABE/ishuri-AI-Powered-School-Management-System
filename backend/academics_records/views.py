"""
academics_records/views.py
──────────────────────────
All view functions are independent @api_view functions with
granular try/except on every step. Errors are printed to the
terminal AND returned in the user's current language.
"""

import os
import traceback
from datetime import date, timedelta
from decimal import Decimal, InvalidOperation

import openpyxl
from django.db import IntegrityError, transaction
from django.utils import timezone
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academics.models import AcademicYear, ClassLevel, Subject
from accounts.models import User
from notifications.models import NotificationType
from notifications.services import NotificationService
from students.models import Student
from teachers.models import Teacher

from .models import (
    Assignment, AttendanceSession, GradeUpload, StudentAttendance, StudentGrade,
)
from .serializers import (
    AssignmentSerializer, AssignmentUpdateSerializer,
    AttendanceSessionCreateSerializer, AttendanceSessionSerializer,
    GradeApprovalSerializer, GradeUploadSerializer,
    StudentAttendanceSerializer, StudentAttendanceUpdateSerializer,
    StudentGradeSerializer, StudentGradeUpdateSerializer,
)
from .template_views import(
    upload_grade_template_file, upload_attendance_template_file,
    process_grade_template_upload, process_attendance_template_upload
) 
from .translations import get_lang, t

# ── Required Excel columns ────────────────────────────────────────────────────
REQUIRED_EXCEL_COLS = {'roll_number', 'score'}


# ═════════════════════════════════════════════════════════════════════════════
#  HELPERS
# ═════════════════════════════════════════════════════════════════════════════

def _ok(data=None, message="", status_code=status.HTTP_200_OK):
    return Response({"success": True, "message": message, "data": data}, status=status_code)


def _err(message="", status_code=status.HTTP_400_BAD_REQUEST, errors=None):
    payload = {"success": False, "message": message}
    if errors:
        payload["errors"] = errors
    return Response(payload, status=status_code)


def _get_teacher(user, lang):
    """Return (Teacher, None) or (None, Response)."""
    try:
        teacher = Teacher.objects.get(user=user)
        return teacher, None
    except Teacher.DoesNotExist:
        msg = t("teacher_profile_not_found", lang)
        print(f"[academics_records] ⚠  {msg}")
        return None, _err(msg, status.HTTP_404_NOT_FOUND)


def _is_admin(user):
    return user.role == "admin" or user.is_superuser or user.is_staff


def _notify_admins(notification_type, title, message, created_by=None, content_object=None, extra_data=None):
    """Send notification to all admin users."""
    try:
        admins = User.objects.filter(role="admin", status="active")
        for admin in admins:
            NotificationService.create_academic_notification(
                user=admin,
                notification_type=notification_type,
                created_by=created_by,
                extra_data=extra_data or {},
                title=title,
                message=message,
                content_object=content_object,
            )
    except Exception as exc:
        print(f"[academics_records] Notification error: {exc}")


def _notify_user(user, notification_type, title, message, created_by=None, extra_data=None):
    try:
        NotificationService.create_academic_notification(
            user=user,
            notification_type=notification_type,
            created_by=created_by,
            extra_data=extra_data or {},
            title=title,
            message=message,
        )
    except Exception as exc:
        print(f"[academics_records] Notification error: {exc}")


def _compute_discipline(student_id, subject_id=None):
    """
    Simple discipline score computation based on attendance ratio.
    Returns (score, zone) tuple.
    Zone: 0-60 → low, 61-80 → medium, 81-100 → high.
    """
    try:
        qs = StudentAttendance.objects.filter(session__student_id=student_id) \
            if not subject_id else \
            StudentAttendance.objects.filter(session__student_id=student_id, session__subject_id=subject_id)
        # Re-do: filter by student FK on StudentAttendance directly
        qs = StudentAttendance.objects.filter(student_id=student_id)
        if subject_id:
            qs = qs.filter(session__subject_id=subject_id)
        total   = qs.count()
        if total == 0:
            return None, ''
        present = qs.filter(status__in=['present', 'late']).count()
        score   = round((present / total) * 100, 2)
        if score <= 60:
            zone = 'low'
        elif score <= 80:
            zone = 'medium'
        else:
            zone = 'high'
        return score, zone
    except Exception:
        return None, ''


def _auto_grade_letter(score):
    """Return grade letter for a percentage score."""
    if score >= 90: return 'A+'
    if score >= 80: return 'A'
    if score >= 70: return 'B'
    if score >= 60: return 'C'
    if score >= 50: return 'D'
    return 'F'


# ═════════════════════════════════════════════════════════════════════════════
#  GRADE VIEWS
# ═════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_student_grades(request):
    """
    Teacher uploads an Excel file with student grades.
    Required form fields: class_level_id, subject_id, academic_year_id, term (optional)
    Required Excel columns: roll_number, score
    Optional Excel columns: max_score, grade_letter, remarks
    """
    lang = get_lang(request)
    print(f"[upload_student_grades] Lang={lang} | User={request.user}")

    # ── 1. Get teacher profile ────────────────────────────────────────────────
    try:
        teacher = Teacher.objects.get(user=request.user)
        print(f"[upload_student_grades] Teacher found: {teacher}")
    except Teacher.DoesNotExist:
        msg = t("teacher_profile_not_found", lang)
        print(f"[upload_student_grades] ✗ {msg}")
        return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[upload_student_grades] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── 2. Validate required form fields ─────────────────────────────────────
    try:
        class_level_id   = request.data.get('class_level_id')
        subject_id       = request.data.get('subject_id')
        academic_year_id = request.data.get('academic_year_id')
        term             = request.data.get('term', '')

        if not all([class_level_id, subject_id, academic_year_id]):
            msg = t("invalid_data", lang)
            print(f"[upload_student_grades] ✗ {msg} — missing fields")
            return _err(msg + " (class_level_id, subject_id, academic_year_id are required)")

        class_level   = ClassLevel.objects.get(pk=class_level_id)
        subject       = Subject.objects.get(pk=subject_id)
        academic_year = AcademicYear.objects.get(pk=academic_year_id)
        print(f"[upload_student_grades] class_level={class_level}, subject={subject}, year={academic_year}")
    except (ClassLevel.DoesNotExist, Subject.DoesNotExist, AcademicYear.DoesNotExist) as exc:
        msg = t("not_found", lang) + f" ({exc})"
        print(f"[upload_student_grades] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[upload_student_grades] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── 3. Validate uploaded file ─────────────────────────────────────────────
    try:
        excel_file = request.FILES.get('excel_file')
        if not excel_file:
            msg = t("grade_upload_no_file", lang)
            print(f"[upload_student_grades] ✗ {msg}")
            return _err(msg)
        ext = os.path.splitext(excel_file.name)[1].lower()
        if ext not in ['.xlsx', '.xls']:
            msg = t("grade_upload_invalid_ext", lang)
            print(f"[upload_student_grades] ✗ {msg}")
            return _err(msg)
    except Exception as exc:
        msg = t("file_error", lang, error=str(exc))
        print(f"[upload_student_grades] ✗ {msg}")
        return _err(msg)

    # ── 4. Check for duplicate upload ─────────────────────────────────────────
    try:
        if GradeUpload.objects.filter(
            teacher=teacher, class_level=class_level,
            subject=subject, academic_year=academic_year, term=term
        ).exists():
            msg = t("grade_upload_duplicate", lang)
            print(f"[upload_student_grades] ✗ {msg}")
            return _err(msg)
    except Exception as exc:
        msg = t("db_error", lang, error=str(exc))
        print(f"[upload_student_grades] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── 5. Parse Excel file ───────────────────────────────────────────────────
    try:
        wb = openpyxl.load_workbook(excel_file, read_only=True, data_only=True)
        ws = wb.active
        headers = [str(cell.value).strip().lower() if cell.value else '' for cell in next(ws.iter_rows(min_row=1, max_row=1))]
        missing = REQUIRED_EXCEL_COLS - set(headers)
        if missing:
            msg = t("grade_upload_bad_template", lang, cols=", ".join(missing))
            print(f"[upload_student_grades] ✗ {msg}")
            return _err(msg)
        col_idx = {h: i for i, h in enumerate(headers)}
    except Exception as exc:
        msg = t("parse_error", lang, error=str(exc))
        print(f"[upload_student_grades] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg)

    # ── 6. Save GradeUpload & parse rows in transaction ───────────────────────
    try:
        with transaction.atomic():
            grade_upload = GradeUpload.objects.create(
                teacher=teacher,
                academic_year=academic_year,
                class_level=class_level,
                subject=subject,
                excel_file=excel_file,
                term=term,
                status=GradeUpload.Status.PENDING,
                uploaded_by=request.user,
            )
            print(f"[upload_student_grades] GradeUpload created: id={grade_upload.id}")

            grades_saved = 0
            errors_log   = []

            for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
                try:
                    roll_number = str(row[col_idx['roll_number']]).strip() if row[col_idx['roll_number']] else None
                    score_raw   = row[col_idx['score']]

                    if not roll_number or score_raw is None:
                        continue

                    try:
                        score = Decimal(str(score_raw))
                    except InvalidOperation:
                        errors_log.append(f"Row {row_num}: invalid score '{score_raw}'")
                        continue

                    try:
                        student = Student.objects.get(roll_number=roll_number)
                    except Student.DoesNotExist:
                        errors_log.append(f"Row {row_num}: " + t("student_not_found", lang, roll=roll_number))
                        continue

                    max_score    = Decimal(str(row[col_idx['max_score']])) if 'max_score' in col_idx and row[col_idx['max_score']] else Decimal('100')
                    grade_letter = str(row[col_idx['grade_letter']]).strip() if 'grade_letter' in col_idx and row[col_idx['grade_letter']] else ''
                    remarks      = str(row[col_idx['remarks']]).strip() if 'remarks' in col_idx and row[col_idx['remarks']] else ''

                    if not grade_letter:
                        pct = float((score / max_score) * 100)
                        grade_letter = _auto_grade_letter(pct)

                    StudentGrade.objects.create(
                        grade_upload=grade_upload,
                        student=student,
                        score=score,
                        max_score=max_score,
                        grade_letter=grade_letter,
                        remarks=remarks,
                        is_published=False,
                    )
                    grades_saved += 1

                except Exception as row_exc:
                    errors_log.append(f"Row {row_num}: {str(row_exc)}")

        print(f"[upload_student_grades] ✓ {grades_saved} grades saved, {len(errors_log)} row errors")
        if errors_log:
            print(f"[upload_student_grades] Row errors: {errors_log}")

    except IntegrityError as exc:
        msg = t("db_error", lang, error=str(exc))
        print(f"[upload_student_grades] ✗ IntegrityError: {msg}")
        return _err(msg, status.HTTP_409_CONFLICT)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[upload_student_grades] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── 7. Notify admins ──────────────────────────────────────────────────────
    try:
        notif_title = t("notif_grade_upload_title", lang)
        notif_msg   = t("notif_grade_upload_msg", lang,
                        teacher=teacher.full_name, subject=subject.name,
                        class_level=class_level.name, term=term or "—")
        _notify_admins("grade_uploaded", notif_title, notif_msg,
                       created_by=request.user, content_object=grade_upload,
                       extra_data={"grade_upload_id": grade_upload.id})
        print(f"[upload_student_grades] ✓ Admins notified")
    except Exception as exc:
        print(f"[upload_student_grades] ⚠ Notification failed: {exc}")

    success_msg = t("grade_upload_success", lang) + " " + t("grade_upload_saved", lang, count=grades_saved)
    print(f"[upload_student_grades] ✓ Done: {success_msg}")
    return _ok(
        data=GradeUploadSerializer(grade_upload).data,
        message=success_msg,
        status_code=status.HTTP_201_CREATED,
    )


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_grade_uploads(request):
    """Admin: list all grade uploads with optional filters."""
    lang = get_lang(request)
    print(f"[get_all_grade_uploads] Lang={lang} | User={request.user}")

    try:
        if not _is_admin(request.user):
            msg = t("forbidden", lang)
            print(f"[get_all_grade_uploads] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        print(f"[get_all_grade_uploads] ✗ perm check error: {exc}")
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        qs = GradeUpload.objects.select_related(
            'teacher', 'subject', 'class_level', 'academic_year', 'reviewed_by'
        ).all()

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        class_level_id = request.query_params.get('class_level_id')
        if class_level_id:
            qs = qs.filter(class_level_id=class_level_id)

        academic_year_id = request.query_params.get('academic_year_id')
        if academic_year_id:
            qs = qs.filter(academic_year_id=academic_year_id)

        teacher_id = request.query_params.get('teacher_id')
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)

        serializer = GradeUploadSerializer(qs, many=True)
        msg = t("grade_upload_list_fetched", lang)
        print(f"[get_all_grade_uploads] ✓ {qs.count()} records")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_all_grade_uploads] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_grades_for_student(request, student_id):
    """Get all published grades for a specific student (admin, parent, student)."""
    lang = get_lang(request)
    print(f"[get_grades_for_student] Lang={lang} | User={request.user} | student_id={student_id}")

    try:
        student = Student.objects.get(pk=student_id)
    except Student.DoesNotExist:
        msg = t("student_not_found", lang, roll=str(student_id))
        print(f"[get_grades_for_student] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_grades_for_student] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        is_admin       = _is_admin(request.user)
        is_own_student = hasattr(request.user, 'student_profile') and request.user.student_profile.id == student_id
        is_parent      = hasattr(request.user, 'parent_profile') and student.parents.filter(user=request.user).exists()

        if not (is_admin or is_own_student or is_parent):
            msg = t("forbidden", lang)
            print(f"[get_grades_for_student] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)

        qs = StudentGrade.objects.filter(student=student).select_related(
            'grade_upload__subject', 'grade_upload__class_level', 'grade_upload__academic_year'
        )
        if not is_admin:
            qs = qs.filter(is_published=True)

        serializer = StudentGradeSerializer(qs, many=True)
        msg = t("grades_fetched", lang)
        print(f"[get_grades_for_student] ✓ {qs.count()} grades")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_grades_for_student] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_grades(request):
    """Get all grade uploads for the logged-in teacher."""
    lang = get_lang(request)
    print(f"[get_teacher_grades] Lang={lang} | User={request.user}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    try:
        qs = GradeUpload.objects.filter(teacher=teacher).select_related(
            'subject', 'class_level', 'academic_year'
        ).order_by('-created_at')
        serializer = GradeUploadSerializer(qs, many=True)
        msg = t("grade_upload_list_fetched", lang)
        print(f"[get_teacher_grades] ✓ {qs.count()} uploads")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_grades] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_grades_by_class(request, class_level_id):
    """Get grade uploads for the logged-in teacher filtered by class level."""
    lang = get_lang(request)
    print(f"[get_teacher_grades_by_class] Lang={lang} | class_level_id={class_level_id}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    try:
        class_level = ClassLevel.objects.get(pk=class_level_id)
    except ClassLevel.DoesNotExist:
        msg = t("not_found", lang) + " (class_level)"
        print(f"[get_teacher_grades_by_class] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_grades_by_class] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        qs = GradeUpload.objects.filter(teacher=teacher, class_level=class_level).select_related(
            'subject', 'academic_year'
        ).order_by('-created_at')
        serializer = GradeUploadSerializer(qs, many=True)
        msg = t("grade_upload_list_fetched", lang)
        print(f"[get_teacher_grades_by_class] ✓ {qs.count()} uploads")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_grades_by_class] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_grades_by_class_and_subject(request, class_level_id, subject_id):
    """Get grade uploads for the logged-in teacher filtered by class level AND subject."""
    lang = get_lang(request)
    print(f"[get_teacher_grades_by_class_and_subject] Lang={lang}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    try:
        class_level = ClassLevel.objects.get(pk=class_level_id)
        subject     = Subject.objects.get(pk=subject_id)
    except (ClassLevel.DoesNotExist, Subject.DoesNotExist) as exc:
        msg = t("not_found", lang) + f" ({exc})"
        print(f"[get_teacher_grades_by_class_and_subject] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_grades_by_class_and_subject] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        qs = GradeUpload.objects.filter(
            teacher=teacher, class_level=class_level, subject=subject
        ).select_related('academic_year').order_by('-created_at')

        grades = StudentGrade.objects.filter(
            grade_upload__in=qs
        ).select_related('student', 'grade_upload__subject')

        msg = t("grades_fetched", lang)
        print(f"[get_teacher_grades_by_class_and_subject] ✓ {grades.count()} grades")
        return _ok(data={
            "uploads": GradeUploadSerializer(qs, many=True).data,
            "grades":  StudentGradeSerializer(grades, many=True).data,
        }, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_grades_by_class_and_subject] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_student_grade(request, grade_id):
    """Teacher/Admin can update an individual student grade (score, remarks, etc.)."""
    lang = get_lang(request)
    print(f"[update_student_grade] Lang={lang} | grade_id={grade_id}")

    try:
        grade = StudentGrade.objects.select_related('grade_upload__teacher__user').get(pk=grade_id)
    except StudentGrade.DoesNotExist:
        msg = t("grade_not_found", lang)
        print(f"[update_student_grade] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[update_student_grade] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        is_owner = grade.grade_upload.teacher.user == request.user
        if not (_is_admin(request.user) or is_owner):
            msg = t("forbidden", lang)
            print(f"[update_student_grade] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[update_student_grade] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        serializer = StudentGradeUpdateSerializer(grade, data=request.data, partial=True)
        if not serializer.is_valid():
            msg = t("validation_error", lang, error=str(serializer.errors))
            print(f"[update_student_grade] ✗ {msg}")
            return _err(msg, errors=serializer.errors)
        serializer.save()
        msg = t("grade_updated", lang)
        print(f"[update_student_grade] ✓ {msg}")
        return _ok(data=StudentGradeSerializer(grade).data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[update_student_grade] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_reject_grade_upload(request, upload_id):
    """Admin approves or rejects a grade upload."""
    lang = get_lang(request)
    print(f"[approve_reject_grade_upload] Lang={lang} | upload_id={upload_id}")

    try:
        if not _is_admin(request.user):
            msg = t("forbidden", lang)
            print(f"[approve_reject_grade_upload] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        print(f"[approve_reject_grade_upload] ✗ perm: {exc}")
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        grade_upload = GradeUpload.objects.select_related(
            'teacher__user', 'subject', 'class_level', 'academic_year'
        ).get(pk=upload_id)
    except GradeUpload.DoesNotExist:
        msg = t("grade_upload_not_found", lang)
        print(f"[approve_reject_grade_upload] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[approve_reject_grade_upload] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        serializer = GradeApprovalSerializer(data=request.data)
        if not serializer.is_valid():
            msg = t("validation_error", lang, error=str(serializer.errors))
            print(f"[approve_reject_grade_upload] ✗ {msg}")
            return _err(msg, errors=serializer.errors)

        action           = serializer.validated_data['action']
        rejection_reason = serializer.validated_data.get('rejection_reason', '')
        admin_notes      = serializer.validated_data.get('admin_notes', '')
    except Exception as exc:
        msg = t("validation_error", lang, error=str(exc))
        print(f"[approve_reject_grade_upload] ✗ {msg}")
        return _err(msg)

    try:
        with transaction.atomic():
            grade_upload.reviewed_by      = request.user
            grade_upload.reviewed_at      = timezone.now()
            grade_upload.admin_notes      = admin_notes
            grade_upload.rejection_reason = rejection_reason

            if action == 'approve':
                if grade_upload.status == GradeUpload.Status.APPROVED:
                    msg = t("grade_already_approved", lang)
                    print(f"[approve_reject_grade_upload] ⚠ {msg}")
                    return _err(msg)

                grade_upload.status = GradeUpload.Status.APPROVED
                grade_upload.save()

                # Publish all grades
                now = timezone.now()
                grade_upload.student_grades.update(is_published=True, published_at=now)

                # Notify teacher
                notif_title = t("notif_grade_approved_title", lang)
                notif_msg   = t("notif_grade_approved_msg", lang,
                                subject=grade_upload.subject.name,
                                class_level=grade_upload.class_level.name)
                _notify_user(grade_upload.teacher.user, "grade_approved",
                             notif_title, notif_msg, created_by=request.user,
                             extra_data={"grade_upload_id": grade_upload.id})

                # Notify each student
                for sg in grade_upload.student_grades.select_related('student__user').all():
                    if sg.student.user:
                        stud_notif_title = t("notif_grade_published_title", lang)
                        stud_notif_msg   = t("notif_grade_published_msg", lang,
                                             subject=grade_upload.subject.name,
                                             term=grade_upload.term or "—")
                        _notify_user(sg.student.user, "grade_uploaded",
                                     stud_notif_title, stud_notif_msg,
                                     created_by=request.user)

                msg = t("grade_approved", lang)
                print(f"[approve_reject_grade_upload] ✓ {msg}")

            else:  # reject
                grade_upload.status = GradeUpload.Status.REJECTED
                grade_upload.save()

                # Notify teacher
                notif_title = t("notif_grade_rejected_title", lang)
                notif_msg   = t("notif_grade_rejected_msg", lang,
                                subject=grade_upload.subject.name,
                                class_level=grade_upload.class_level.name,
                                reason=rejection_reason or "—")
                _notify_user(grade_upload.teacher.user, "grade_uploaded",
                             notif_title, notif_msg, created_by=request.user,
                             extra_data={"grade_upload_id": grade_upload.id})

                msg = t("grade_rejected", lang)
                print(f"[approve_reject_grade_upload] ✓ {msg}")

        return _ok(data=GradeUploadSerializer(grade_upload).data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[approve_reject_grade_upload] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_grade_upload(request, upload_id):
    """Admin deletes a grade upload and all related grades."""
    lang = get_lang(request)
    print(f"[delete_grade_upload] Lang={lang} | upload_id={upload_id}")

    try:
        if not _is_admin(request.user):
            msg = t("forbidden", lang)
            print(f"[delete_grade_upload] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        grade_upload = GradeUpload.objects.get(pk=upload_id)
    except GradeUpload.DoesNotExist:
        msg = t("grade_upload_not_found", lang)
        print(f"[delete_grade_upload] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[delete_grade_upload] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        grade_upload.delete()
        msg = t("grade_deleted", lang)
        print(f"[delete_grade_upload] ✓ {msg}")
        return _ok(message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[delete_grade_upload] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═════════════════════════════════════════════════════════════════════════════
#  ATTENDANCE VIEWS
# ═════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([JSONParser, FormParser])
def create_attendance_session(request):
    """
    Teacher creates an attendance session + optional records in one shot.
    Body: { teacher, class_level, subject, academic_year, date, records: [{student, status}, ...] }
    """
    lang = get_lang(request)
    print(f"[create_attendance_session] Lang={lang} | User={request.user}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    # ── Validate payload ──────────────────────────────────────────────────────
    try:
        data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        data['teacher'] = teacher.id  # Force teacher = requesting teacher (unless admin)

        serializer = AttendanceSessionCreateSerializer(data=data)
        if not serializer.is_valid():
            msg = t("validation_error", lang, error=str(serializer.errors))
            print(f"[create_attendance_session] ✗ {msg}")
            return _err(msg, errors=serializer.errors)
    except Exception as exc:
        msg = t("validation_error", lang, error=str(exc))
        print(f"[create_attendance_session] ✗ {msg}")
        return _err(msg)

    # ── Check duplicate session ───────────────────────────────────────────────
    try:
        vd = serializer.validated_data
        if AttendanceSession.objects.filter(
            teacher=vd.get('teacher', teacher),
            class_level=vd['class_level'],
            subject=vd['subject'],
            date=vd['date'],
            academic_year=vd['academic_year'],
        ).exists():
            msg = t("attendance_session_duplicate", lang)
            print(f"[create_attendance_session] ✗ {msg}")
            return _err(msg)
    except Exception as exc:
        msg = t("db_error", lang, error=str(exc))
        print(f"[create_attendance_session] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── Save session + records ─────────────────────────────────────────────────
    try:
        with transaction.atomic():
            records_data = vd.pop('records', [])
            session = AttendanceSession.objects.create(**vd, created_by=request.user)
            print(f"[create_attendance_session] Session created: id={session.id}")

            for rec in records_data:
                try:
                    StudentAttendance.objects.create(session=session, **rec)
                except Exception as rec_exc:
                    print(f"[create_attendance_session] ⚠ record error: {rec_exc}")
    except IntegrityError as exc:
        msg = t("attendance_session_duplicate", lang)
        print(f"[create_attendance_session] ✗ IntegrityError: {exc}")
        return _err(msg, status.HTTP_409_CONFLICT)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[create_attendance_session] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── Discipline score update ───────────────────────────────────────────────
    try:
        for rec_obj in session.records.all():
            score, zone = _compute_discipline(rec_obj.student_id, session.subject_id)
            if score is not None:
                StudentAttendance.objects.filter(pk=rec_obj.pk).update(
                    discipline_score=score, discipline_zone=zone
                )
        print(f"[create_attendance_session] ✓ Discipline scores updated")
    except Exception as exc:
        print(f"[create_attendance_session] ⚠ discipline calc error: {exc}")

    # ── Notify admins ─────────────────────────────────────────────────────────
    try:
        title = t("notif_attendance_submitted_title", lang)
        msg_n = t("notif_attendance_submitted_msg", lang,
                  teacher=teacher.full_name, subject=session.subject.name,
                  class_level=session.class_level.name, date=str(session.date))
        _notify_admins("attendance_marked", title, msg_n,
                       created_by=request.user, content_object=session,
                       extra_data={"session_id": session.id})
        print(f"[create_attendance_session] ✓ Admins notified")
    except Exception as exc:
        print(f"[create_attendance_session] ⚠ notify error: {exc}")

    # ── Low attendance warning ────────────────────────────────────────────────
    try:
        for rec_obj in session.records.select_related('student').filter(status='absent'):
            score, zone = _compute_discipline(rec_obj.student_id, session.subject_id)
            if score is not None and score < 70:
                warn_title = t("notif_low_attendance_title", lang)
                warn_msg   = t("notif_low_attendance_msg", lang,
                               student=rec_obj.student.full_name,
                               pct=score, subject=session.subject.name)
                _notify_admins("low_attendance_warning", warn_title, warn_msg,
                               extra_data={"student_id": rec_obj.student_id})
        print(f"[create_attendance_session] ✓ Low-attendance warnings checked")
    except Exception as exc:
        print(f"[create_attendance_session] ⚠ warn error: {exc}")

    msg = t("attendance_session_created", lang)
    print(f"[create_attendance_session] ✓ {msg}")
    return _ok(data=AttendanceSessionSerializer(session).data, message=msg, status_code=status.HTTP_201_CREATED)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def submit_attendance_session(request, session_id):
    """Mark an attendance session as submitted (teacher confirms presence)."""
    lang = get_lang(request)
    print(f"[submit_attendance_session] Lang={lang} | session_id={session_id}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    try:
        session = AttendanceSession.objects.get(pk=session_id, teacher=teacher)
    except AttendanceSession.DoesNotExist:
        msg = t("attendance_session_not_found", lang)
        print(f"[submit_attendance_session] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[submit_attendance_session] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        session.is_submitted = True
        session.submitted_at = timezone.now()
        session.save(update_fields=['is_submitted', 'submitted_at'])
        msg = t("attendance_submitted", lang)
        print(f"[submit_attendance_session] ✓ {msg}")
        return _ok(data=AttendanceSessionSerializer(session).data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[submit_attendance_session] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_attendance_sessions(request):
    """Admin: get all attendance sessions with optional filters."""
    lang = get_lang(request)
    print(f"[get_all_attendance_sessions] Lang={lang} | User={request.user}")

    try:
        if not _is_admin(request.user):
            msg = t("forbidden", lang)
            print(f"[get_all_attendance_sessions] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        qs = AttendanceSession.objects.select_related(
            'teacher', 'class_level', 'subject', 'academic_year', 'classroom'
        ).prefetch_related('records__student').all()

        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        class_level_id = request.query_params.get('class_level_id')
        if class_level_id:
            qs = qs.filter(class_level_id=class_level_id)

        teacher_id = request.query_params.get('teacher_id')
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)

        submitted = request.query_params.get('is_submitted')
        if submitted is not None:
            qs = qs.filter(is_submitted=submitted.lower() == 'true')

        serializer = AttendanceSessionSerializer(qs, many=True)
        msg = t("attendance_fetched", lang)
        print(f"[get_all_attendance_sessions] ✓ {qs.count()} sessions")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_all_attendance_sessions] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_attendance_sessions(request):
    """Logged-in teacher's own attendance sessions."""
    lang = get_lang(request)
    print(f"[get_teacher_attendance_sessions] Lang={lang} | User={request.user}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    try:
        qs = AttendanceSession.objects.filter(teacher=teacher).select_related(
            'class_level', 'subject', 'academic_year'
        ).prefetch_related('records').order_by('-date')

        date_from = request.query_params.get('date_from')
        date_to   = request.query_params.get('date_to')
        if date_from:
            qs = qs.filter(date__gte=date_from)
        if date_to:
            qs = qs.filter(date__lte=date_to)

        serializer = AttendanceSessionSerializer(qs, many=True)
        msg = t("attendance_fetched", lang)
        print(f"[get_teacher_attendance_sessions] ✓ {qs.count()} sessions")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_attendance_sessions] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_attendance_by_subject(request, subject_id):
    """Logged-in teacher's attendance sessions filtered by subject."""
    lang = get_lang(request)
    print(f"[get_teacher_attendance_by_subject] Lang={lang} | subject_id={subject_id}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    try:
        subject = Subject.objects.get(pk=subject_id)
    except Subject.DoesNotExist:
        msg = t("not_found", lang) + " (subject)"
        print(f"[get_teacher_attendance_by_subject] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_attendance_by_subject] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        qs = AttendanceSession.objects.filter(
            teacher=teacher, subject=subject
        ).select_related('class_level', 'academic_year').prefetch_related('records').order_by('-date')

        serializer = AttendanceSessionSerializer(qs, many=True)
        msg = t("attendance_fetched", lang)
        print(f"[get_teacher_attendance_by_subject] ✓ {qs.count()} sessions")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_attendance_by_subject] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_student_attendance(request, record_id):
    """Teacher/Admin updates a single student attendance record."""
    lang = get_lang(request)
    print(f"[update_student_attendance] Lang={lang} | record_id={record_id}")

    try:
        record = StudentAttendance.objects.select_related('session__teacher__user').get(pk=record_id)
    except StudentAttendance.DoesNotExist:
        msg = t("attendance_record_not_found", lang)
        print(f"[update_student_attendance] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[update_student_attendance] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        is_owner = record.session.teacher.user == request.user
        if not (_is_admin(request.user) or is_owner):
            msg = t("forbidden", lang)
            print(f"[update_student_attendance] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[update_student_attendance] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        serializer = StudentAttendanceUpdateSerializer(record, data=request.data, partial=True)
        if not serializer.is_valid():
            msg = t("validation_error", lang, error=str(serializer.errors))
            print(f"[update_student_attendance] ✗ {msg}")
            return _err(msg, errors=serializer.errors)
        serializer.save()

        # Recompute discipline
        try:
            score, zone = _compute_discipline(record.student_id, record.session.subject_id)
            if score is not None:
                StudentAttendance.objects.filter(pk=record.pk).update(
                    discipline_score=score, discipline_zone=zone
                )
        except Exception as disc_exc:
            print(f"[update_student_attendance] ⚠ discipline recompute: {disc_exc}")

        msg = t("attendance_updated", lang)
        print(f"[update_student_attendance] ✓ {msg}")
        return _ok(data=StudentAttendanceSerializer(record).data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[update_student_attendance] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_student_attendance(request, session_id):
    """Add a single student attendance record to an existing session."""
    lang = get_lang(request)
    print(f"[add_student_attendance] Lang={lang} | session_id={session_id}")

    try:
        session = AttendanceSession.objects.get(pk=session_id)
    except AttendanceSession.DoesNotExist:
        msg = t("attendance_session_not_found", lang)
        print(f"[add_student_attendance] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[add_student_attendance] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        is_owner = session.teacher.user == request.user
        if not (_is_admin(request.user) or is_owner):
            msg = t("forbidden", lang)
            print(f"[add_student_attendance] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[add_student_attendance] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        data = dict(request.data)
        data['session'] = session_id
        serializer = StudentAttendanceSerializer(data=data)
        if not serializer.is_valid():
            msg = t("validation_error", lang, error=str(serializer.errors))
            print(f"[add_student_attendance] ✗ {msg}")
            return _err(msg, errors=serializer.errors)

        student_id = serializer.validated_data['student'].id
        if StudentAttendance.objects.filter(session=session, student_id=student_id).exists():
            msg = t("attendance_already_exists", lang)
            print(f"[add_student_attendance] ✗ {msg}")
            return _err(msg, status.HTTP_409_CONFLICT)

        record = serializer.save()
        msg = t("attendance_added", lang)
        print(f"[add_student_attendance] ✓ {msg}")
        return _ok(data=StudentAttendanceSerializer(record).data, message=msg, status_code=status.HTTP_201_CREATED)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[add_student_attendance] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_attendance_session(request, session_id):
    """Admin deletes an entire attendance session and all records."""
    lang = get_lang(request)
    print(f"[delete_attendance_session] Lang={lang} | session_id={session_id}")

    try:
        if not _is_admin(request.user):
            msg = t("forbidden", lang)
            print(f"[delete_attendance_session] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        session = AttendanceSession.objects.get(pk=session_id)
    except AttendanceSession.DoesNotExist:
        msg = t("attendance_session_not_found", lang)
        print(f"[delete_attendance_session] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[delete_attendance_session] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        session.delete()
        msg = t("attendance_deleted", lang)
        print(f"[delete_attendance_session] ✓ {msg}")
        return _ok(message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[delete_attendance_session] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_student_attendance_record(request, record_id):
    """Admin deletes a single student attendance record."""
    lang = get_lang(request)
    print(f"[delete_student_attendance_record] Lang={lang} | record_id={record_id}")

    try:
        if not _is_admin(request.user):
            msg = t("forbidden", lang)
            print(f"[delete_student_attendance_record] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        record = StudentAttendance.objects.get(pk=record_id)
    except StudentAttendance.DoesNotExist:
        msg = t("attendance_record_not_found", lang)
        print(f"[delete_student_attendance_record] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[delete_student_attendance_record] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        record.delete()
        msg = t("attendance_record_deleted", lang)
        print(f"[delete_student_attendance_record] ✓ {msg}")
        return _ok(message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[delete_student_attendance_record] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_attendance_summary(request, student_id):
    """Get attendance summary + discipline info for a specific student."""
    lang = get_lang(request)
    print(f"[get_student_attendance_summary] Lang={lang} | student_id={student_id}")

    try:
        student = Student.objects.get(pk=student_id)
    except Student.DoesNotExist:
        msg = t("student_not_found", lang, roll=str(student_id))
        print(f"[get_student_attendance_summary] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_student_attendance_summary] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        is_admin_user  = _is_admin(request.user)
        is_own_student = hasattr(request.user, 'student_profile') and request.user.student_profile.id == student_id
        is_parent      = hasattr(request.user, 'parent_profile') and student.parents.filter(user=request.user).exists()

        if not (is_admin_user or is_own_student or is_parent):
            # Check if requesting user is the teacher of one of the sessions
            try:
                teacher = Teacher.objects.get(user=request.user)
                is_teacher_of_student = AttendanceSession.objects.filter(
                    teacher=teacher, records__student=student
                ).exists()
                if not is_teacher_of_student:
                    raise PermissionError
            except (Teacher.DoesNotExist, PermissionError):
                msg = t("forbidden", lang)
                print(f"[get_student_attendance_summary] ✗ {msg}")
                return _err(msg, status.HTTP_403_FORBIDDEN)

        records = StudentAttendance.objects.filter(student=student).select_related(
            'session__subject', 'session__class_level'
        )
        total   = records.count()
        present = records.filter(status='present').count()
        absent  = records.filter(status='absent').count()
        late    = records.filter(status='late').count()
        excused = records.filter(status='excused').count()

        score, zone = _compute_discipline(student_id)
        msg = t("attendance_fetched", lang)
        print(f"[get_student_attendance_summary] ✓ total={total}")
        return _ok(data={
            "student": {"id": student.id, "name": student.full_name, "roll_number": student.roll_number},
            "summary": {
                "total": total, "present": present, "absent": absent,
                "late": late, "excused": excused,
                "attendance_rate": round((present / total) * 100, 2) if total else 0,
                "discipline_score": score, "discipline_zone": zone,
            },
            "records": StudentAttendanceSerializer(records, many=True).data,
        }, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_student_attendance_summary] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═════════════════════════════════════════════════════════════════════════════
#  ASSIGNMENT VIEWS
# ═════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_assignment(request):
    """
    Teacher uploads a PDF assignment for a class/subject.
    Required fields: class_level_id, subject_id, academic_year_id, title
    Required file: pdf_file
    """
    lang = get_lang(request)
    print(f"[upload_assignment] Lang={lang} | User={request.user}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    # ── Validate file ─────────────────────────────────────────────────────────
    try:
        pdf_file = request.FILES.get('pdf_file')
        if not pdf_file:
            msg = t("assignment_no_file", lang)
            print(f"[upload_assignment] ✗ {msg}")
            return _err(msg)
        ext = os.path.splitext(pdf_file.name)[1].lower()
        if ext != '.pdf':
            msg = t("assignment_invalid_ext", lang)
            print(f"[upload_assignment] ✗ {msg}")
            return _err(msg)
    except Exception as exc:
        msg = t("file_error", lang, error=str(exc))
        print(f"[upload_assignment] ✗ {msg}")
        return _err(msg)

    # ── Validate required fields ──────────────────────────────────────────────
    try:
        class_level_id   = request.data.get('class_level_id')
        subject_id       = request.data.get('subject_id')
        academic_year_id = request.data.get('academic_year_id')
        title            = request.data.get('title', '').strip()

        if not all([class_level_id, subject_id, academic_year_id, title]):
            msg = t("invalid_data", lang) + " (class_level_id, subject_id, academic_year_id, title required)"
            print(f"[upload_assignment] ✗ {msg}")
            return _err(msg)

        class_level   = ClassLevel.objects.get(pk=class_level_id)
        subject       = Subject.objects.get(pk=subject_id)
        academic_year = AcademicYear.objects.get(pk=academic_year_id)
    except (ClassLevel.DoesNotExist, Subject.DoesNotExist, AcademicYear.DoesNotExist) as exc:
        msg = t("not_found", lang) + f" ({exc})"
        print(f"[upload_assignment] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[upload_assignment] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── Create assignment ─────────────────────────────────────────────────────
    try:
        assignment = Assignment.objects.create(
            teacher=teacher,
            class_level=class_level,
            subject=subject,
            academic_year=academic_year,
            title=title,
            description=request.data.get('description', ''),
            instructions=request.data.get('instructions', ''),
            pdf_file=pdf_file,
            due_date=request.data.get('due_date') or None,
            total_marks=request.data.get('total_marks') or None,
            status=Assignment.Status.ACTIVE,
            uploaded_by=request.user,
        )
        print(f"[upload_assignment] ✓ Created assignment id={assignment.id}")
    except IntegrityError as exc:
        msg = t("db_error", lang, error=str(exc))
        print(f"[upload_assignment] ✗ IntegrityError: {msg}")
        return _err(msg, status.HTTP_409_CONFLICT)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[upload_assignment] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    # ── Notify admins ─────────────────────────────────────────────────────────
    try:
        title_n = t("notif_assignment_admin_title", lang)
        msg_n   = t("notif_assignment_admin_msg", lang,
                    teacher=teacher.full_name, title=assignment.title,
                    subject=subject.name, class_level=class_level.name)
        _notify_admins("assignment_created", title_n, msg_n,
                       created_by=request.user, content_object=assignment,
                       extra_data={"assignment_id": assignment.id})
        print(f"[upload_assignment] ✓ Admins notified")
    except Exception as exc:
        print(f"[upload_assignment] ⚠ notify admin: {exc}")

    # ── Notify students in that class (if they have user accounts) ────────────
    try:
        students_with_accounts = Student.objects.filter(
            current_class_level=class_level,
            user__isnull=False,
            status='active',
        ).select_related('user')

        due_str = str(assignment.due_date) if assignment.due_date else "—"
        notif_title = t("notif_assignment_uploaded_title", lang)
        notif_msg   = t("notif_assignment_uploaded_msg", lang,
                        title=assignment.title, subject=subject.name,
                        class_level=class_level.name, due_date=due_str)

        for stud in students_with_accounts:
            _notify_user(stud.user, "assignment_created",
                         notif_title, notif_msg,
                         created_by=request.user,
                         extra_data={"assignment_id": assignment.id})
        print(f"[upload_assignment] ✓ {students_with_accounts.count()} students notified")
    except Exception as exc:
        print(f"[upload_assignment] ⚠ notify students: {exc}")

    msg = t("assignment_uploaded", lang)
    print(f"[upload_assignment] ✓ {msg}")
    return _ok(data=AssignmentSerializer(assignment).data, message=msg, status_code=status.HTTP_201_CREATED)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_assignments(request):
    """Admin: list all assignments with optional filters."""
    lang = get_lang(request)
    print(f"[get_all_assignments] Lang={lang} | User={request.user}")

    try:
        if not _is_admin(request.user):
            msg = t("forbidden", lang)
            print(f"[get_all_assignments] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        qs = Assignment.objects.select_related(
            'teacher', 'class_level__school_level', 'subject', 'academic_year'
        ).all()

        status_f = request.query_params.get('status')
        if status_f:
            qs = qs.filter(status=status_f)

        class_level_id = request.query_params.get('class_level_id')
        if class_level_id:
            qs = qs.filter(class_level_id=class_level_id)

        subject_id = request.query_params.get('subject_id')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)

        teacher_id = request.query_params.get('teacher_id')
        if teacher_id:
            qs = qs.filter(teacher_id=teacher_id)

        overdue_only = request.query_params.get('overdue')
        if overdue_only and overdue_only.lower() == 'true':
            qs = qs.filter(due_date__lt=date.today())

        serializer = AssignmentSerializer(qs, many=True)
        msg = t("assignment_fetched", lang)
        print(f"[get_all_assignments] ✓ {qs.count()} assignments")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_all_assignments] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_assignments(request):
    """Logged-in teacher: all their uploaded assignments."""
    lang = get_lang(request)
    print(f"[get_teacher_assignments] Lang={lang} | User={request.user}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    try:
        qs = Assignment.objects.filter(teacher=teacher).select_related(
            'class_level__school_level', 'subject', 'academic_year'
        ).order_by('-created_at')
        serializer = AssignmentSerializer(qs, many=True)
        msg = t("assignment_fetched", lang)
        print(f"[get_teacher_assignments] ✓ {qs.count()} assignments")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_assignments] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_assignments_by_subject(request, subject_id):
    """Logged-in teacher: assignments filtered by subject."""
    lang = get_lang(request)
    print(f"[get_teacher_assignments_by_subject] Lang={lang} | subject_id={subject_id}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    try:
        subject = Subject.objects.get(pk=subject_id)
    except Subject.DoesNotExist:
        msg = t("not_found", lang) + " (subject)"
        print(f"[get_teacher_assignments_by_subject] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_assignments_by_subject] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        qs = Assignment.objects.filter(teacher=teacher, subject=subject).select_related(
            'class_level__school_level', 'academic_year'
        ).order_by('-created_at')
        serializer = AssignmentSerializer(qs, many=True)
        msg = t("assignment_fetched", lang)
        print(f"[get_teacher_assignments_by_subject] ✓ {qs.count()} assignments")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_assignments_by_subject] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_assignments_by_school_level(request, school_level_id):
    """Logged-in teacher: assignments filtered by school level."""
    lang = get_lang(request)
    print(f"[get_teacher_assignments_by_school_level] Lang={lang} | school_level_id={school_level_id}")

    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err

    try:
        qs = Assignment.objects.filter(
            teacher=teacher, class_level__school_level_id=school_level_id
        ).select_related('class_level__school_level', 'subject', 'academic_year').order_by('-created_at')
        serializer = AssignmentSerializer(qs, many=True)
        msg = t("assignment_fetched", lang)
        print(f"[get_teacher_assignments_by_school_level] ✓ {qs.count()} assignments")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_assignments_by_school_level] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_assignment_detail(request, assignment_id):
    """Get assignment details (students in the class can view/download)."""
    lang = get_lang(request)
    print(f"[get_assignment_detail] Lang={lang} | assignment_id={assignment_id}")

    try:
        assignment = Assignment.objects.select_related(
            'teacher', 'class_level__school_level', 'subject', 'academic_year'
        ).get(pk=assignment_id)
    except Assignment.DoesNotExist:
        msg = t("assignment_not_found", lang)
        print(f"[get_assignment_detail] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_assignment_detail] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        is_admin_user = _is_admin(request.user)
        is_teacher    = assignment.teacher.user == request.user
        is_student    = (
            hasattr(request.user, 'student_profile') and
            request.user.student_profile.current_class_level == assignment.class_level
        )
        is_parent = False
        if hasattr(request.user, 'parent_profile'):
            is_parent = Student.objects.filter(
                parents__user=request.user,
                current_class_level=assignment.class_level
            ).exists()

        if not (is_admin_user or is_teacher or is_student or is_parent):
            msg = t("forbidden", lang)
            print(f"[get_assignment_detail] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)

        serializer = AssignmentSerializer(assignment)
        msg = t("assignment_detail_fetched", lang)
        print(f"[get_assignment_detail] ✓ {msg}")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_assignment_detail] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_assignment(request, assignment_id):
    """Teacher/Admin can update assignment metadata (not the file)."""
    lang = get_lang(request)
    print(f"[update_assignment] Lang={lang} | assignment_id={assignment_id}")

    try:
        assignment = Assignment.objects.select_related('teacher__user').get(pk=assignment_id)
    except Assignment.DoesNotExist:
        msg = t("assignment_not_found", lang)
        print(f"[update_assignment] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[update_assignment] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        is_owner = assignment.teacher.user == request.user
        if not (_is_admin(request.user) or is_owner):
            msg = t("forbidden", lang)
            print(f"[update_assignment] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[update_assignment] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        serializer = AssignmentUpdateSerializer(assignment, data=request.data, partial=True)
        if not serializer.is_valid():
            msg = t("validation_error", lang, error=str(serializer.errors))
            print(f"[update_assignment] ✗ {msg}")
            return _err(msg, errors=serializer.errors)
        serializer.save()
        msg = t("assignment_updated", lang)
        print(f"[update_assignment] ✓ {msg}")
        return _ok(data=AssignmentSerializer(assignment).data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[update_assignment] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_assignment(request, assignment_id):
    """Admin (or owning teacher) deletes an assignment."""
    lang = get_lang(request)
    print(f"[delete_assignment] Lang={lang} | assignment_id={assignment_id}")

    try:
        assignment = Assignment.objects.select_related('teacher__user').get(pk=assignment_id)
    except Assignment.DoesNotExist:
        msg = t("assignment_not_found", lang)
        print(f"[delete_assignment] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[delete_assignment] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        is_owner = assignment.teacher.user == request.user
        if not (_is_admin(request.user) or is_owner):
            msg = t("forbidden", lang)
            print(f"[delete_assignment] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[delete_assignment] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        assignment.delete()
        msg = t("assignment_deleted", lang)
        print(f"[delete_assignment] ✓ {msg}")
        return _ok(message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[delete_assignment] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_class_assignments(request, class_level_id):
    """Students/parents: view all active assignments for a class."""
    lang = get_lang(request)
    print(f"[get_class_assignments] Lang={lang} | class_level_id={class_level_id}")

    try:
        class_level = ClassLevel.objects.get(pk=class_level_id)
    except ClassLevel.DoesNotExist:
        msg = t("not_found", lang) + " (class_level)"
        print(f"[get_class_assignments] ✗ {msg}")
        return _err(msg, status.HTTP_404_NOT_FOUND)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_class_assignments] ✗ {msg}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        qs = Assignment.objects.filter(
            class_level=class_level, status=Assignment.Status.ACTIVE
        ).select_related('teacher', 'subject', 'academic_year').order_by('-created_at')

        subject_id = request.query_params.get('subject_id')
        if subject_id:
            qs = qs.filter(subject_id=subject_id)

        serializer = AssignmentSerializer(qs, many=True)
        msg = t("assignment_fetched", lang)
        print(f"[get_class_assignments] ✓ {qs.count()} assignments")
        return _ok(data=serializer.data, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_class_assignments] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_attendance_report(request):
    """
    Admin: teacher attendance report.
    Counts sessions per teacher (submitted = present), grouped by date range.
    """
    lang = get_lang(request)
    print(f"[get_teacher_attendance_report] Lang={lang} | User={request.user}")

    try:
        if not _is_admin(request.user):
            msg = t("forbidden", lang)
            print(f"[get_teacher_attendance_report] ✗ {msg}")
            return _err(msg, status.HTTP_403_FORBIDDEN)
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)

    try:
        date_from = request.query_params.get('date_from', str(date.today().replace(day=1)))
        date_to   = request.query_params.get('date_to',   str(date.today()))

        sessions = AttendanceSession.objects.filter(
            date__gte=date_from, date__lte=date_to
        ).select_related('teacher')

        report = {}
        for session in sessions:
            tid = session.teacher_id
            if tid not in report:
                report[tid] = {
                    "teacher_id":   tid,
                    "teacher_name": session.teacher.full_name,
                    "total_classes": 0,
                    "submitted_classes": 0,
                    "unreported_classes": 0,
                }
            report[tid]["total_classes"] += 1
            if session.is_submitted:
                report[tid]["submitted_classes"] += 1
            else:
                report[tid]["unreported_classes"] += 1

        result = list(report.values())
        msg = t("attendance_fetched", lang)
        print(f"[get_teacher_attendance_report] ✓ {len(result)} teachers")
        return _ok(data={"date_from": date_from, "date_to": date_to, "teachers": result}, message=msg)
    except Exception as exc:
        msg = t("unexpected_error", lang, error=str(exc))
        print(f"[get_teacher_attendance_report] ✗ {msg}\n{traceback.format_exc()}")
        return _err(msg, status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
    


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_grade_template_file(request):
    """
    Enhanced grade upload that processes the filled template file.
    
    Required form fields:
      - excel_file: the filled template file
      - academic_year_id: FK to AcademicYear
      - class_level_id: FK to ClassLevel  
      - subject_id: FK to Subject
      - term: term/trimester (T1, T2, T3)
    
    Optional:
      - classroom_id: FK to ClassRoom
    """
    lang = get_lang(request)
    
    # Get teacher
    try:
        teacher = Teacher.objects.get(user=request.user)
    except Teacher.DoesNotExist:
        return _err(t("teacher_profile_not_found", lang), status.HTTP_403_FORBIDDEN)
    
    # Validate required fields
    excel_file = request.FILES.get('excel_file')
    academic_year_id = request.data.get('academic_year_id')
    class_level_id = request.data.get('class_level_id')
    subject_id = request.data.get('subject_id')
    term = request.data.get('term', '').upper()
    
    if not all([excel_file, academic_year_id, class_level_id, subject_id, term]):
        return _err(t("invalid_data", lang) + " (excel_file, academic_year_id, class_level_id, subject_id, term required)")
    
    # Validate term
    valid_trimesters = ['T1', 'T2', 'T3']
    if term not in valid_trimesters:
        return _err(f"Invalid term. Choose from: {', '.join(valid_trimesters)}")
    
    # Validate file extension
    ext = os.path.splitext(excel_file.name)[1].lower()
    if ext not in ['.xlsx', '.xls']:
        return _err(t("grade_upload_invalid_ext", lang))
    
    # Process the template
    success, message, grade_upload, errors = process_grade_template_upload(
        uploaded_file=excel_file,
        academic_year_id=academic_year_id,
        class_level_id=class_level_id,
        subject_id=subject_id,
        term=term,
        teacher=teacher,
        request_user=request.user,
        lang=lang
    )
    
    if not success:
        return _err(message, errors=errors[:10] if errors else None)
    
    # Notify admins
    try:
        from .views import _notify_admins
        notif_title = t("notif_grade_upload_title", lang)
        notif_msg = t("notif_grade_upload_msg", lang,
                      teacher=teacher.full_name,
                      subject=grade_upload.subject.name,
                      class_level=grade_upload.class_level.name,
                      term=term)
        _notify_admins("grade_uploaded", notif_title, notif_msg,
                       created_by=request.user, content_object=grade_upload,
                       extra_data={"grade_upload_id": grade_upload.id})
    except Exception as e:
        print(f"Notification error: {e}")
    
    return _ok(
        data={
            "grade_upload_id": grade_upload.id,
            "status": grade_upload.status,
            "message": message,
            "warnings": errors[:5] if errors else []
        },
        message=message,
        status_code=status.HTTP_201_CREATED
    )


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_attendance_template_file(request):
    """
    Enhanced attendance upload that processes the filled template file.
    
    Required form fields:
      - excel_file: the filled template file
      - academic_year_id: FK to AcademicYear
      - class_level_id: FK to ClassLevel
      - subject_id: FK to Subject
      - session_date: YYYY-MM-DD (optional, defaults to today)
    
    Optional:
      - classroom_id: FK to ClassRoom
    """
    lang = get_lang(request)
    
    # Get teacher
    try:
        teacher = Teacher.objects.get(user=request.user)
    except Teacher.DoesNotExist:
        return _err(t("teacher_profile_not_found", lang), status.HTTP_403_FORBIDDEN)
    
    # Validate required fields
    excel_file = request.FILES.get('excel_file')
    academic_year_id = request.data.get('academic_year_id')
    class_level_id = request.data.get('class_level_id')
    subject_id = request.data.get('subject_id')
    session_date_str = request.data.get('session_date', str(date.today()))
    
    if not all([excel_file, academic_year_id, class_level_id, subject_id]):
        return _err(t("invalid_data", lang) + " (excel_file, academic_year_id, class_level_id, subject_id required)")
    
    # Validate file extension
    ext = os.path.splitext(excel_file.name)[1].lower()
    if ext not in ['.xlsx', '.xls']:
        return _err(t("grade_upload_invalid_ext", lang))
    
    # Process the template
    success, message, session, errors = process_attendance_template_upload(
        uploaded_file=excel_file,
        academic_year_id=academic_year_id,
        class_level_id=class_level_id,
        subject_id=subject_id,
        session_date_str=session_date_str,
        teacher=teacher,
        request_user=request.user,
        lang=lang
    )
    
    if not success:
        return _err(message, errors=errors[:10] if errors else None)
    
    # Notify admins
    try:
        from .views import _notify_admins
        notif_title = t("notif_attendance_submitted_title", lang)
        notif_msg = t("notif_attendance_submitted_msg", lang,
                      teacher=teacher.full_name,
                      subject=session.subject.name,
                      class_level=session.class_level.name,
                      date=str(session.date))
        _notify_admins("attendance_marked", notif_title, notif_msg,
                       created_by=request.user, content_object=session,
                       extra_data={"session_id": session.id})
    except Exception as e:
        print(f"Notification error: {e}")
    
    return _ok(
        data={
            "session_id": session.id,
            "date": str(session.date),
            "message": message,
            "warnings": errors[:5] if errors else []
        },
        message=message,
        status_code=status.HTTP_201_CREATED
    )
    
    
    


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_current_students(request, class_level_id=None):
    """
    Get current students for the teacher's assigned classes.
    Used for attendance form to pre-populate student list.
    """
    lang = get_lang(request)
    
    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err
    
    try:
        # Get all class levels assigned to this teacher
        if class_level_id:
            class_levels = ClassLevel.objects.filter(
                id=class_level_id,
                teacher_assignments__teacher=teacher,
                teacher_assignments__status='active'
            )
        else:
            class_levels = ClassLevel.objects.filter(
                teacher_assignments__teacher=teacher,
                teacher_assignments__status='active'
            ).distinct()
        
        result = []
        for class_level in class_levels:
            students = Student.objects.filter(
                current_class_level=class_level,
                current_academic_year__is_current=True,
                status='active'
            ).values('id', 'roll_number', 'full_name')
            
            result.append({
                'class_level_id': class_level.id,
                'class_level_name': class_level.name,
                'class_level_code': class_level.code,
                'students': list(students)
            })
        
        return _ok(data=result, message=t("students_fetched", lang))
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)
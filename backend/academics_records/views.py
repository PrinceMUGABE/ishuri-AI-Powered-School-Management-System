# academics_records/views.py

import os
import traceback
from datetime import date, datetime
from decimal import Decimal, InvalidOperation
from django.db import models

import openpyxl
from django.db import transaction, IntegrityError
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from academics.models import AcademicYear, ClassLevel, Subject, Term, SchoolLevel, ClassRoom
from accounts.models import User
from students.models import Student, Parent
from teachers.models import Teacher, TeacherAssignment

from .models import (
    GradeUpload, GradeUploadStatus, GradeType,
    StudentGrade, AttendanceSession, StudentAttendance,
    Assignment
)
from .calculations import GradeCalculator, DisciplineCalculator, PerformanceReportGenerator
from .translations import t, get_lang


# ============================================================
# HELPER FUNCTIONS
# ============================================================

def _ok(data=None, message="", status_code=status.HTTP_200_OK):
    return Response({"success": True, "message": message, "data": data}, status=status_code)


def _err(message="", status_code=status.HTTP_400_BAD_REQUEST, errors=None):
    payload = {"success": False, "message": message}
    if errors:
        payload["errors"] = errors
    return Response(payload, status=status_code)


def _get_teacher(user, lang):
    try:
        teacher = Teacher.objects.get(user=user)
        return teacher, None
    except Teacher.DoesNotExist:
        return None, _err(t("teacher_profile_not_found", lang), status.HTTP_404_NOT_FOUND)


def _is_admin(user):
    return user.role == "admin" or user.is_superuser or user.is_staff


def _auto_grade_letter(score):
    if score >= 90: return 'A+'
    if score >= 80: return 'A'
    if score >= 70: return 'B'
    if score >= 60: return 'C'
    if score >= 50: return 'D'
    return 'F'


def _notify_admins(notification_type, title, message, created_by=None, extra_data=None):
    """Send notification to all admin users"""
    try:
        from notifications.services import NotificationService
        admins = User.objects.filter(role="admin", status="active")
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                notification_type=notification_type,
                title=title,
                message=message,
                priority='medium',
                created_by=created_by,
                data=extra_data or {}
            )
    except Exception as exc:
        print(f"[Notification error] {exc}")


def _notify_user(user, notification_type, title, message, created_by=None, extra_data=None):
    try:
        from notifications.services import NotificationService
        NotificationService.create_notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            priority='medium',
            created_by=created_by,
            data=extra_data or {}
        )
    except Exception as exc:
        print(f"[Notification error] {exc}")


# ============================================================
# GRADE UPLOAD VIEWS
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_grades(request):
    """Teacher uploads grades Excel file"""
    lang = get_lang(request)
    
    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err
    
    # Validate required fields
    academic_year_id = request.data.get('academic_year_id')
    term_id = request.data.get('term_id')
    class_level_id = request.data.get('class_level_id')
    subject_id = request.data.get('subject_id')
    grade_type = request.data.get('grade_type', GradeType.ASSIGNMENT)
    excel_file = request.FILES.get('excel_file')
    
    if not all([academic_year_id, class_level_id, subject_id, excel_file]):
        return _err(t("invalid_data", lang) + " (academic_year_id, class_level_id, subject_id, excel_file required)")
    
    try:
        academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        term = get_object_or_404(Term, id=term_id) if term_id else None
        class_level = get_object_or_404(ClassLevel, id=class_level_id)
        subject = get_object_or_404(Subject, id=subject_id)
        school_level = class_level.school_level
        
        # Verify teacher is assigned to this subject/class
        teacher_assignment = TeacherAssignment.objects.filter(
            teacher=teacher,
            academic_year=academic_year,
            class_level=class_level,
            subject=subject,
            status='active'
        ).first()
        
        if not teacher_assignment:
            return _err(t("teacher_not_assigned", lang, subject=subject.name, class_level=class_level.name), 
                       status.HTTP_403_FORBIDDEN)
        
        # Validate grade type
        if grade_type not in [c[0] for c in GradeType.choices]:
            return _err(f"Invalid grade_type. Choose from: {', '.join([c[0] for c in GradeType.choices])}")
        
        weight = Decimal(str(request.data.get('weight_percentage', GradeType.get_default_weight(grade_type))))
        
        # Check total weight doesn't exceed 100%
        existing_weight = GradeUpload.objects.filter(
            teacher=teacher,
            academic_year=academic_year,
            term=term,
            class_level=class_level,
            subject=subject,
            status=GradeUploadStatus.APPROVED
        ).aggregate(total=models.Sum('weight_percentage'))['total'] or Decimal('0')
        
        if existing_weight + weight > Decimal('100'):
            return _err(f"Total weight would exceed 100% (current: {existing_weight}%, adding: {weight}%)")
        
        # Check for duplicate grade type
        if GradeUpload.objects.filter(
            teacher=teacher, academic_year=academic_year, term=term,
            class_level=class_level, subject=subject, grade_type=grade_type
        ).exists():
            return _err(f"A {grade_type} grade upload already exists for this subject/class/term")
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    # Parse Excel file
    try:
        wb = openpyxl.load_workbook(excel_file, data_only=True)
        ws = wb.active
        
        # Find headers (look for roll_number column)
        headers = []
        for row in ws.iter_rows(min_row=1, max_row=10, values_only=True):
            if row and any(cell and 'roll' in str(cell).lower() for cell in row):
                headers = [str(cell).strip().lower() if cell else '' for cell in row]
                break
        
        if not headers:
            headers = [str(cell.value).strip().lower() if cell.value else '' for cell in ws[1]]
        
        col_map = {}
        for idx, h in enumerate(headers):
            if 'roll' in h:
                col_map['roll_number'] = idx
            elif 'score' in h:
                col_map['score'] = idx
            elif 'max' in h:
                col_map['max_score'] = idx
            elif 'remark' in h:
                col_map['remarks'] = idx
        
        if 'roll_number' not in col_map or 'score' not in col_map:
            return _err(t("grade_upload_bad_template", lang, cols="roll_number, score"))
        
        # Get students in this class
        students_in_class = {s.roll_number: s for s in Student.objects.filter(
            current_class_level=class_level,
            current_academic_year=academic_year,
            status='active'
        )}
        
        # Parse grades
        grades_data = []
        invalid_students = []
        
        for row_num, row in enumerate(ws.iter_rows(min_row=2, values_only=True), start=2):
            if not row or all(cell is None or str(cell).strip() == '' for cell in row[:3]):
                continue
            
            roll_number = str(row[col_map['roll_number']]).strip() if col_map['roll_number'] < len(row) and row[col_map['roll_number']] else None
            if not roll_number:
                continue
            
            if roll_number not in students_in_class:
                invalid_students.append(roll_number)
                continue
            
            score_raw = row[col_map['score']] if col_map['score'] < len(row) else None
            if score_raw is None:
                continue
            
            try:
                score = Decimal(str(score_raw))
                if score < 0 or score > 100:
                    return _err(f"Row {row_num}: Score must be between 0 and 100")
            except InvalidOperation:
                return _err(f"Row {row_num}: Invalid score value '{score_raw}'")
            
            max_score = Decimal('100')
            if 'max_score' in col_map and col_map['max_score'] < len(row) and row[col_map['max_score']]:
                try:
                    max_score = Decimal(str(row[col_map['max_score']]))
                except:
                    pass
            
            remarks = ""
            if 'remarks' in col_map and col_map['remarks'] < len(row) and row[col_map['remarks']]:
                remarks = str(row[col_map['remarks']])
            
            grades_data.append({
                'student': students_in_class[roll_number],
                'score': score,
                'max_score': max_score,
                'remarks': remarks
            })
        
        if invalid_students:
            return _err(t("students_not_in_class", lang, students=", ".join(invalid_students[:5]), class_level=class_level.name))
        
        if not grades_data:
            return _err(t("grade_upload_no_data", lang))
        
    except Exception as exc:
        return _err(t("parse_error", lang, error=str(exc)))
    
    # Save grade upload and grades
    try:
        with transaction.atomic():
            grade_upload = GradeUpload.objects.create(
                teacher=teacher,
                academic_year=academic_year,
                term=term,
                school_level=school_level,
                class_level=class_level,
                subject=subject,
                classroom=teacher_assignment.classrooms.first(),
                grade_type=grade_type,
                weight_percentage=weight,
                assessment_date=request.data.get('assessment_date') or date.today(),
                excel_file=excel_file,
                status=GradeUploadStatus.PENDING,
                uploaded_by=request.user
            )
            
            for gd in grades_data:
                StudentGrade.objects.create(
                    grade_upload=grade_upload,
                    student=gd['student'],
                    score=gd['score'],
                    max_score=gd['max_score'],
                    remarks=gd['remarks']
                )
            
            # Notify admins
            _notify_admins(
                'grade_uploaded',
                t("notif_grade_upload_title", lang),
                t("notif_grade_upload_msg", lang, teacher=teacher.full_name, 
                  subject=subject.name, class_level=class_level.name),
                created_by=request.user,
                extra_data={'grade_upload_id': grade_upload.id}
            )
            
        return _ok(data={'id': grade_upload.id, 'status': grade_upload.status}, 
                   message=t("grade_upload_success", lang), 
                   status_code=status.HTTP_201_CREATED)
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def approve_grade_upload(request, upload_id):
    """Admin approves a grade upload"""
    lang = get_lang(request)
    
    if not _is_admin(request.user):
        return _err(t("forbidden", lang), status.HTTP_403_FORBIDDEN)
    
    grade_upload = get_object_or_404(GradeUpload, id=upload_id)
    
    if grade_upload.status == GradeUploadStatus.APPROVED:
        return _err("Grade upload already approved", status.HTTP_400_BAD_REQUEST)
    
    action = request.data.get('action')
    rejection_reason = request.data.get('rejection_reason', '')
    
    with transaction.atomic():
        if action == 'approve':
            grade_upload.status = GradeUploadStatus.APPROVED
            grade_upload.student_grades.update(is_published=True, published_at=timezone.now())
            message = t("grade_approved", lang)
        else:
            grade_upload.status = GradeUploadStatus.REJECTED
            grade_upload.rejection_reason = rejection_reason
            message = t("grade_rejected", lang)
        
        grade_upload.reviewed_by = request.user
        grade_upload.reviewed_at = timezone.now()
        grade_upload.save()
        
        # Notify teacher
        _notify_user(
            grade_upload.teacher.user,
            'grade_reviewed',
            f"Grade Upload {action}d",
            f"Your grade upload for {grade_upload.subject.name} has been {action}d." +
            (f" Reason: {rejection_reason}" if rejection_reason else ""),
            created_by=request.user
        )
    
    return _ok(message=message)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_grade_uploads(request):
    """Get grade uploads (filtered by role)"""
    lang = get_lang(request)
    
    if _is_admin(request.user):
        uploads = GradeUpload.objects.all().select_related('teacher', 'subject', 'class_level', 'academic_year')
    else:
        teacher, err = _get_teacher(request.user, lang)
        if err:
            return err
        uploads = GradeUpload.objects.filter(teacher=teacher).select_related('subject', 'class_level', 'academic_year')
    
    # Apply filters
    status_filter = request.query_params.get('status')
    if status_filter:
        uploads = uploads.filter(status=status_filter)
    
    class_level_id = request.query_params.get('class_level_id')
    if class_level_id:
        uploads = uploads.filter(class_level_id=class_level_id)
    
    subject_id = request.query_params.get('subject_id')
    if subject_id:
        uploads = uploads.filter(subject_id=subject_id)
    
    academic_year_id = request.query_params.get('academic_year_id')
    if academic_year_id:
        uploads = uploads.filter(academic_year_id=academic_year_id)
    
    # Serialize
    result = []
    for u in uploads:
        result.append({
            'id': u.id,
            'teacher': u.teacher.full_name,
            'academic_year': u.academic_year.name,
            'term': u.term.name if u.term else None,
            'class_level': u.class_level.name,
            'subject': u.subject.name,
            'grade_type': u.get_grade_type_display(),
            'weight_percentage': float(u.weight_percentage),
            'status': u.status,
            'created_at': u.created_at.isoformat(),
            'grades_count': u.student_grades.count()
        })
    
    return _ok(data=result, message=t("grade_upload_list_fetched", lang))


# ============================================================
# PERFORMANCE VIEWS (REAL-TIME CALCULATIONS)
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_performance(request, student_id=None):
    """
    Get student performance - ALL CALCULATED IN REAL-TIME.
    No data stored in database - purely computed from source data.
    """
    lang = get_lang(request)
    user = request.user
    
    try:
        # Determine which student to view with permission checks
        if student_id:
            if user.role == 'admin':
                student = get_object_or_404(Student, id=student_id)
            elif user.role == 'teacher':
                student = get_object_or_404(Student, id=student_id)
                teacher = get_object_or_404(Teacher, user=user)
                # Verify teacher teaches this student
                teaches = TeacherAssignment.objects.filter(
                    teacher=teacher,
                    class_level=student.current_class_level,
                    status='active'
                ).exists()
                if not teaches:
                    return _err(t("forbidden", lang), status.HTTP_403_FORBIDDEN)
            elif user.role == 'parent':
                parent = get_object_or_404(Parent, user=user)
                if not parent.students.filter(id=student_id).exists():
                    return _err(t("forbidden", lang), status.HTTP_403_FORBIDDEN)
                student = get_object_or_404(Student, id=student_id)
            else:
                return _err(t("forbidden", lang), status.HTTP_403_FORBIDDEN)
        else:
            # Self view
            if hasattr(user, 'student_profile'):
                student = user.student_profile
            else:
                return _err("No student profile found", status.HTTP_404_NOT_FOUND)
        
        # Get query parameters
        academic_year_id = request.query_params.get('academic_year_id')
        term_id = request.query_params.get('term_id')
        
        if not academic_year_id:
            academic_year = AcademicYear.objects.filter(is_current=True).first()
            if not academic_year:
                return _err("No academic year specified and no current year found")
        else:
            academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        
        term = get_object_or_404(Term, id=term_id) if term_id else None
        
        # Generate complete report in real-time
        report = PerformanceReportGenerator.get_full_report(student, academic_year, term)
        
        return _ok(data=report, message=t("performance_fetched", lang))
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subject_performance(request, student_id, subject_id):
    """Get detailed subject performance - REAL-TIME calculation"""
    lang = get_lang(request)
    
    try:
        student = get_object_or_404(Student, id=student_id)
        subject = get_object_or_404(Subject, id=subject_id)
        
        academic_year_id = request.query_params.get('academic_year_id')
        term_id = request.query_params.get('term_id')
        
        if not academic_year_id:
            academic_year = AcademicYear.objects.filter(is_current=True).first()
        else:
            academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        
        term = get_object_or_404(Term, id=term_id) if term_id else None
        
        # Calculate in real-time
        grade_result = GradeCalculator.get_subject_result(student, subject, academic_year, term)
        discipline_result = DisciplineCalculator.get_subject_discipline(student, subject, academic_year, term)
        
        return _ok(data={
            'student': {
                'id': student.id,
                'name': student.full_name,
                'roll_number': student.roll_number
            },
            'subject': {
                'id': subject.id,
                'name': subject.name,
                'code': subject.code,
                'pass_mark': float(subject.pass_mark)
            },
            'academic_year': academic_year.name,
            'term': term.name if term else None,
            'grades': grade_result,
            'discipline': discipline_result,
            'generated_at': timezone.now().isoformat()
        }, message=t("performance_fetched", lang))
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_class_performance(request, class_level_id):
    """Get performance summary for all students in a class"""
    lang = get_lang(request)
    
    try:
        class_level = get_object_or_404(ClassLevel, id=class_level_id)
        
        academic_year_id = request.query_params.get('academic_year_id')
        term_id = request.query_params.get('term_id')
        
        if not academic_year_id:
            academic_year = AcademicYear.objects.filter(is_current=True).first()
        else:
            academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        
        term = get_object_or_404(Term, id=term_id) if term_id else None
        
        students = Student.objects.filter(
            current_class_level=class_level,
            current_academic_year=academic_year,
            status='active'
        )
        
        results = []
        for student in students:
            performance = GradeCalculator.get_overall_performance(student, academic_year, term)
            discipline = DisciplineCalculator.get_attendance_summary(student, academic_year, term)
            
            results.append({
                'student_id': student.id,
                'student_name': student.full_name,
                'roll_number': student.roll_number,
                'overall_average': performance['overall_average'],
                'grade_letter': performance['grade_letter'],
                'subjects_passed': performance['subjects_passed'],
                'subjects_failed': performance['subjects_failed'],
                'attendance_rate': discipline['attendance_rate'],
                'discipline_score': discipline['discipline_score']
            })
        
        # Sort by overall average
        results.sort(key=lambda x: x['overall_average'] or 0, reverse=True)
        
        # Add rank
        for idx, result in enumerate(results, 1):
            result['rank'] = idx
        
        return _ok(data={
            'class_level': class_level.name,
            'academic_year': academic_year.name,
            'term': term.name if term else None,
            'total_students': len(results),
            'students': results
        }, message=t("performance_fetched", lang))
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# ATTENDANCE VIEWS
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_attendance(request):
    """Teacher uploads attendance Excel file"""
    lang = get_lang(request)
    
    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err
    
    academic_year_id = request.data.get('academic_year_id')
    class_level_id = request.data.get('class_level_id')
    subject_id = request.data.get('subject_id')
    session_date = request.data.get('session_date', str(date.today()))
    excel_file = request.FILES.get('excel_file')
    
    if not all([academic_year_id, class_level_id, subject_id, excel_file]):
        return _err(t("invalid_data", lang))
    
    try:
        academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        class_level = get_object_or_404(ClassLevel, id=class_level_id)
        subject = get_object_or_404(Subject, id=subject_id)
        session_date = datetime.strptime(session_date, '%Y-%m-%d').date()
        
        # Check for duplicate
        if AttendanceSession.objects.filter(
            teacher=teacher, class_level=class_level, 
            subject=subject, session_date=session_date
        ).exists():
            return _err("Attendance already recorded for this date")
        
        # Parse Excel file
        wb = openpyxl.load_workbook(excel_file, data_only=True)
        ws = wb.active
        
        # Find headers
        headers = [str(cell.value).strip().lower() if cell.value else '' for cell in ws[1]]
        col_map = {}
        for idx, h in enumerate(headers):
            if 'roll' in h:
                col_map['roll_number'] = idx
            elif 'status' in h:
                col_map['status'] = idx
            elif 'remark' in h:
                col_map['remarks'] = idx
        
        if 'roll_number' not in col_map:
            return _err(t("attendance_upload_bad_template", lang, cols="roll_number, status"))
        
        # Get students
        students_map = {s.roll_number: s for s in Student.objects.filter(
            current_class_level=class_level, current_academic_year=academic_year, status='active'
        )}
        
        attendance_data = []
        for row in ws.iter_rows(min_row=2, values_only=True):
            roll_number = str(row[col_map['roll_number']]).strip() if row[col_map['roll_number']] else None
            if not roll_number or roll_number not in students_map:
                continue
            
            status_raw = str(row[col_map.get('status', 1)]).strip().lower() if col_map.get('status') and row[col_map.get('status')] else 'present'
            status_map = {'present': 'present', 'absent': 'absent', 'late': 'late', 'excused': 'excused', '1': 'present', '0': 'absent', 'true': 'present', 'false': 'absent', 'yes': 'present', 'no': 'absent'}
            status = status_map.get(status_raw, 'present')
            
            remarks = str(row[col_map.get('remarks', 2)]).strip() if col_map.get('remarks') and row[col_map.get('remarks')] else ''
            
            attendance_data.append({
                'student': students_map[roll_number],
                'status': status,
                'remarks': remarks
            })
        
        if not attendance_data:
            return _err(t("attendance_upload_no_data", lang))
        
        # Save session and records
        with transaction.atomic():
            session = AttendanceSession.objects.create(
                teacher=teacher,
                academic_year=academic_year,
                school_level=class_level.school_level,
                class_level=class_level,
                subject=subject,
                session_date=session_date,
                excel_file=excel_file,
                is_submitted=True,
                submitted_at=timezone.now(),
                created_by=request.user
            )
            
            for ad in attendance_data:
                StudentAttendance.objects.create(
                    session=session,
                    student=ad['student'],
                    status=ad['status'],
                    remarks=ad['remarks']
                )
        
        return _ok(data={'session_id': session.id, 'records': len(attendance_data)}, 
                   message="Attendance uploaded successfully", status_code=status.HTTP_201_CREATED)
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_attendance(request, student_id):
    """Get attendance summary for a student"""
    lang = get_lang(request)
    
    try:
        student = get_object_or_404(Student, id=student_id)
        
        academic_year_id = request.query_params.get('academic_year_id')
        academic_year = get_object_or_404(AcademicYear, id=academic_year_id) if academic_year_id else AcademicYear.objects.filter(is_current=True).first()
        
        summary = DisciplineCalculator.get_attendance_summary(student, academic_year)
        
        # Get detailed records
        records = StudentAttendance.objects.filter(
            student=student,
            session__academic_year=academic_year
        ).select_related('session__subject', 'session__teacher').order_by('-session__session_date')
        
        records_data = []
        for r in records:
            records_data.append({
                'date': r.session.session_date.isoformat(),
                'subject': r.session.subject.name,
                'teacher': r.session.teacher.full_name,
                'status': r.status,
                'remarks': r.remarks
            })
        
        return _ok(data={
            'summary': summary,
            'records': records_data
        })
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# ASSIGNMENT VIEWS
# ============================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_assignment(request):
    """Teacher uploads an assignment PDF"""
    lang = get_lang(request)
    
    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err
    
    title = request.data.get('title')
    class_level_id = request.data.get('class_level_id')
    subject_id = request.data.get('subject_id')
    academic_year_id = request.data.get('academic_year_id')
    pdf_file = request.FILES.get('pdf_file')
    
    if not all([title, class_level_id, subject_id, academic_year_id, pdf_file]):
        return _err(t("invalid_data", lang))
    
    try:
        class_level = get_object_or_404(ClassLevel, id=class_level_id)
        subject = get_object_or_404(Subject, id=subject_id)
        academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        
        # Verify teacher is assigned
        if not TeacherAssignment.objects.filter(
            teacher=teacher, class_level=class_level, subject=subject, status='active'
        ).exists():
            return _err(t("teacher_not_assigned", lang, subject=subject.name, class_level=class_level.name), 
                       status.HTTP_403_FORBIDDEN)
        
        assignment = Assignment.objects.create(
            teacher=teacher,
            academic_year=academic_year,
            school_level=class_level.school_level,
            class_level=class_level,
            subject=subject,
            title=title,
            description=request.data.get('description', ''),
            instructions=request.data.get('instructions', ''),
            pdf_file=pdf_file,
            due_date=request.data.get('due_date') or None,
            due_time=request.data.get('due_time') or None,
            total_marks=request.data.get('total_marks') or None,
            uploaded_by=request.user
        )
        
        # Notify students in this class
        students = Student.objects.filter(
            current_class_level=class_level,
            current_academic_year=academic_year,
            status='active',
            user__isnull=False
        )
        
        for student in students:
            _notify_user(
                student.user,
                'assignment_created',
                f"New Assignment: {title}",
                f"A new assignment has been posted for {subject.name}",
                created_by=request.user,
                extra_data={'assignment_id': assignment.id}
            )
        
        return _ok(data={'id': assignment.id, 'title': title}, 
                   message="Assignment uploaded successfully", status_code=status.HTTP_201_CREATED)
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_assignments(request):
    """Get assignments based on role"""
    lang = get_lang(request)
    user = request.user
    
    try:
        if user.role == 'student':
            student = user.student_profile
            assignments = Assignment.objects.filter(
                class_level=student.current_class_level,
                status='active'
            ).select_related('teacher', 'subject')
            
            # Filter out expired
            from django.utils import timezone
            from datetime import date
            current_date = date.today()
            current_time = timezone.now().time()
            
            assignments = [
                a for a in assignments 
                if not (a.due_date and a.due_date < current_date) and
                not (a.due_date == current_date and a.due_time and a.due_time < current_time)
            ]
            
        elif user.role == 'parent':
            parent = user.parent_profile
            student_ids = parent.students.values_list('id', flat=True)
            assignments = Assignment.objects.filter(
                class_level__students__id__in=student_ids,
                status='active'
            ).distinct().select_related('teacher', 'subject')
        else:
            teacher, err = _get_teacher(user, lang)
            if err:
                return err
            assignments = Assignment.objects.filter(teacher=teacher).select_related('subject', 'class_level')
        
        result = []
        for a in assignments:
            result.append({
                'id': a.id,
                'title': a.title,
                'description': a.description,
                'subject': a.subject.name,
                'teacher': a.teacher.full_name,
                'due_date': str(a.due_date) if a.due_date else None,
                'due_time': str(a.due_time) if a.due_time else None,
                'total_marks': float(a.total_marks) if a.total_marks else None,
                'pdf_url': a.pdf_file.url if a.pdf_file else None,
                'created_at': a.created_at.isoformat()
            })
        
        return _ok(data=result, message="Assignments fetched successfully")
        
    except Exception as exc:
        return _err(t("unexpected_error", lang, error=str(exc)), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ============================================================
# TEACHER STUDENTS VIEW
# ============================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_students(request):
    """Get students for teacher's current classes"""
    lang = get_lang(request)
    
    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err
    
    academic_year_id = request.query_params.get('academic_year_id')
    academic_year = get_object_or_404(AcademicYear, id=academic_year_id) if academic_year_id else AcademicYear.objects.filter(is_current=True).first()
    
    # Get teacher's assignments
    assignments = TeacherAssignment.objects.filter(
        teacher=teacher,
        academic_year=academic_year,
        status='active'
    ).select_related('class_level')
    
    result = []
    for assignment in assignments:
        students = Student.objects.filter(
            current_class_level=assignment.class_level,
            current_academic_year=academic_year,
            status='active'
        ).values('id', 'full_name', 'roll_number')
        
        result.append({
            'class_level_id': assignment.class_level.id,
            'class_level_name': assignment.class_level.name,
            'subject_id': assignment.subject.id,
            'subject_name': assignment.subject.name,
            'students': list(students)
        })
    
    return _ok(data=result, message="Students fetched successfully")
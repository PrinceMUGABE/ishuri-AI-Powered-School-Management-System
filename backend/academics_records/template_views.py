# academics_records/template_views.py (enhanced version)

"""
Admin-facing endpoints for generating downloadable Excel templates
for grade recording and attendance recording.

Rwandan academic trimesters are pre-defined (T1, T2, T3) with
approximate date ranges that teachers can choose from.

Endpoints:
  GET  /api/academics-records/templates/grades/
  GET  /api/academics-records/templates/attendance/
  GET  /api/academics-records/templates/trimesters/
"""

import io
import calendar
from datetime import date, datetime
from decimal import Decimal
import os

from django.http import HttpResponse
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response

from openpyxl import Workbook, load_workbook
from openpyxl.styles import (
    Font, PatternFill, Alignment, Border, Side, Protection
)
from openpyxl.utils import get_column_letter

from academics.models import AcademicYear, ClassLevel, Subject, ClassRoom
from students.models import Student

from .translations import get_lang, t

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


# ─────────────────────────────────────────────────────────────────────────────
#  Rwandan school trimester definitions
#  Typical structure for Rwanda's 3-term academic year:
#    T1: Jan – Apr   (roughly ~15 weeks)
#    T2: May – Aug   (roughly ~14 weeks)
#    T3: Sep – Nov   (roughly ~12 weeks)
# ─────────────────────────────────────────────────────────────────────────────
RWANDA_TRIMESTERS = [
    {
        "code": "T1",
        "label_en": "Trimester 1 (January to April)",
        "label_fr": "Trimestre 1 (Janvier à Avril)",
        "label_rw": "Igice cya 1 (Ukwakira ukuboza)",
        "month_start": 1,
        "month_end": 4,
    },
    {
        "code": "T2",
        "label_en": "Trimester 2 (May to August)",
        "label_fr": "Trimestre 2 (Mai à Août)",
        "label_rw": "Igice cya 2 (Gicurasi Kanama)",
        "month_start": 5,
        "month_end": 8,
    },
    {
        "code": "T3",
        "label_en": "Trimester 3 (September to November)",
        "label_fr": "Trimestre 3 (Septembre à Novembre)",
        "label_rw": "Igice cya 3 (Nzeri Ugushyingo)",
        "month_start": 9,
        "month_end": 11,
    },
]


def _trimester_dates(academic_year: AcademicYear, trimester_code: str):
    """
    Return (start_date, end_date) for the given trimester inside the
    supplied academic year. We clamp against the year's own start/end.
    """
    ay_start = academic_year.start_date
    ay_end = academic_year.end_date
    year = ay_start.year

    tri = next((t for t in RWANDA_TRIMESTERS if t["code"] == trimester_code), None)
    if not tri:
        return ay_start, ay_end

    # Build approximate dates
    start = date(year, tri["month_start"], 1)
    # Last day of month_end
    last_day = calendar.monthrange(year, tri["month_end"])[1]
    end = date(year, tri["month_end"], last_day)

    # Clamp to the academic year boundaries
    start = max(start, ay_start)
    end = min(end, ay_end)
    return start, end


def get_trimester_label(tri, lang="en"):
    """Get trimester label in the requested language."""
    if lang == "fr":
        return tri.get("label_fr", tri.get("label_en", tri["code"]))
    elif lang == "rw":
        return tri.get("label_rw", tri.get("label_en", tri["code"]))
    return tri.get("label_en", tri["code"])


# ─────────────────────────────────────────────────────────────────────────────
#  Shared openpyxl style helpers
# ─────────────────────────────────────────────────────────────────────────────
_HEADER_FILL  = PatternFill("solid", start_color="1F4E79")   # dark blue
_META_FILL    = PatternFill("solid", start_color="D6E4F0")   # light blue
_COL_HDR_FILL = PatternFill("solid", start_color="2E75B6")   # mid blue
_ALT_FILL     = PatternFill("solid", start_color="EBF3FB")   # very light blue
_LOCK_FILL    = PatternFill("solid", start_color="F2F2F2")   # light grey (read-only)
_GREEN_FILL   = PatternFill("solid", start_color="E2EFDA")   # light green (input)

_WHITE_BOLD   = Font(name="Arial", bold=True, color="FFFFFF", size=11)
_DARK_BOLD    = Font(name="Arial", bold=True, color="1F4E79", size=10)
_DARK_REG     = Font(name="Arial", color="404040", size=10)
_RED_BOLD     = Font(name="Arial", bold=True, color="C00000", size=10)

_CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)
_LEFT   = Alignment(horizontal="left",   vertical="center", wrap_text=True)

_THIN_BORDER = Border(
    left=Side(style="thin"), right=Side(style="thin"),
    top=Side(style="thin"),  bottom=Side(style="thin"),
)


def _apply_border(ws, row, col_start, col_end):
    for c in range(col_start, col_end + 1):
        ws.cell(row=row, column=c).border = _THIN_BORDER


def _meta_row(ws, row, label, value, col_label=1, col_value=2, col_end=7, lang="en"):
    """Write a metadata label+value pair with styling."""
    lbl = ws.cell(row=row, column=col_label, value=label)
    lbl.font = _DARK_BOLD
    lbl.fill = _META_FILL
    lbl.alignment = _LEFT
    lbl.border = _THIN_BORDER

    val = ws.cell(row=row, column=col_value, value=value)
    val.font = _DARK_REG
    val.fill = _META_FILL
    val.alignment = _LEFT
    val.border = _THIN_BORDER

    # Merge value cell across remaining columns for readability
    if col_end > col_value:
        ws.merge_cells(
            start_row=row, start_column=col_value,
            end_row=row,   end_column=col_end
        )


# ─────────────────────────────────────────────────────────────────────────────
#  GRADE TEMPLATE GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def _build_grade_template(
    academic_year: AcademicYear,
    class_level: ClassLevel,
    subject: Subject,
    trimester_code: str,
    classroom=None,
    lang="en",
) -> bytes:
    """
    Generate and return the bytes of a formatted .xlsx grade template.
    """
    tri = next((t for t in RWANDA_TRIMESTERS if t["code"] == trimester_code), None)
    tri_label = get_trimester_label(tri, lang) if tri else trimester_code
    tri_start, tri_end = _trimester_dates(academic_year, trimester_code)

    students = (
        Student.objects
        .filter(
            current_class_level=class_level,
            current_academic_year=academic_year,
            status="active",
        )
        .order_by("full_name")
        .values("id", "roll_number", "full_name")
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Grades Template"

    # ── Title banner ──────────────────────────────────────────────────────────
    ws.merge_cells("A1:H1")
    title = ws["A1"]
    title.value = "STUDENT GRADES RECORDING TEMPLATE"
    title.font = Font(name="Arial", bold=True, color="FFFFFF", size=14)
    title.fill = _HEADER_FILL
    title.alignment = _CENTER
    ws.row_dimensions[1].height = 30

    # Subtitle
    ws.merge_cells("A2:H2")
    sub = ws["A2"]
    sub.value = f"École Les Hirondelles de Don Bosco – Grade Entry Form ({lang.upper()})"
    sub.font = Font(name="Arial", italic=True, color="1F4E79", size=10)
    sub.fill = _META_FILL
    sub.alignment = _CENTER

    # ── Metadata block (rows 4-11) ─────────────────────────────────────────
    META_ROWS = [
        ("Academic Year:",        str(academic_year.name)),
        ("Trimester:",            tri_label),
        ("Trimester Start Date:", str(tri_start)),
        ("Trimester End Date:",   str(tri_end)),
        ("School Level:",         str(class_level.school_level.name)),
        ("Class Level:",          f"{class_level.name} ({class_level.code})"),
        ("Subject:",              f"{subject.name} ({subject.code})"),
        ("Classroom:",            str(classroom.name) if classroom else "—"),
    ]
    for i, (lbl, val) in enumerate(META_ROWS, start=4):
        _meta_row(ws, i, lbl, val, col_end=8, lang=lang)

    # ── Instructions (row 13) ─────────────────────────────────────────────
    ws.merge_cells("A13:H13")
    inst = ws["A13"]
    inst.value = (
        "⚠ INSTRUCTIONS: Fill in the 'Score' column only. "
        "Roll Number and Student Name are read-only identifiers. "
        "Do NOT modify headers or metadata rows. "
        "Valid scores: 0–100. Max Score default is 100. "
        "Grade letter will be auto-calculated by the system on upload if left blank."
    )
    inst.font = _RED_BOLD
    inst.fill = PatternFill("solid", start_color="FFF2CC")
    inst.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[13].height = 35

    # ── Column headers (row 15) ───────────────────────────────────────────
    HEADERS = ["#", "Student ID", "Roll Number", "Student Full Name", 
               "Score (0–100)", "Max Score", "Remarks", "Grade Letter*"]
    for col, hdr in enumerate(HEADERS, start=1):
        cell = ws.cell(row=15, column=col, value=hdr)
        cell.font = _WHITE_BOLD
        cell.fill = _COL_HDR_FILL
        cell.alignment = _CENTER
        cell.border = _THIN_BORDER
    ws.row_dimensions[15].height = 22

    # ── Student rows ──────────────────────────────────────────────────────
    for row_offset, stu in enumerate(students):
        r = 16 + row_offset
        fill = _ALT_FILL if row_offset % 2 == 0 else PatternFill("solid", start_color="FFFFFF")

        # # (serial)
        c = ws.cell(row=r, column=1, value=row_offset + 1)
        c.font = _DARK_REG; c.fill = _LOCK_FILL; c.alignment = _CENTER; c.border = _THIN_BORDER

        # Student ID (hidden reference)
        c = ws.cell(row=r, column=2, value=stu["id"])
        c.font = _DARK_REG; c.fill = _LOCK_FILL; c.alignment = _CENTER; c.border = _THIN_BORDER

        # Roll number (locked, pre-filled)
        c = ws.cell(row=r, column=3, value=stu["roll_number"])
        c.font = _DARK_BOLD; c.fill = _LOCK_FILL; c.alignment = _CENTER; c.border = _THIN_BORDER

        # Full name (locked)
        c = ws.cell(row=r, column=4, value=stu["full_name"])
        c.font = _DARK_REG; c.fill = _LOCK_FILL; c.alignment = _LEFT; c.border = _THIN_BORDER

        # Score (teacher fills this — green)
        c = ws.cell(row=r, column=5, value=None)
        c.font = _DARK_REG; c.fill = _GREEN_FILL; c.alignment = _CENTER; c.border = _THIN_BORDER

        # Max score default 100
        c = ws.cell(row=r, column=6, value=100)
        c.font = _DARK_REG; c.fill = _GREEN_FILL; c.alignment = _CENTER; c.border = _THIN_BORDER

        # Remarks
        c = ws.cell(row=r, column=7, value="")
        c.font = _DARK_REG; c.fill = _GREEN_FILL; c.alignment = _LEFT; c.border = _THIN_BORDER

        # Grade letter — system fills on upload; teacher may optionally fill
        c = ws.cell(row=r, column=8, value="")
        c.font = _DARK_REG; c.fill = _LOCK_FILL; c.alignment = _CENTER; c.border = _THIN_BORDER

    # Footer note
    footer_row = 16 + len(students) + 1
    ws.merge_cells(f"A{footer_row}:H{footer_row}")
    ft = ws.cell(row=footer_row, column=1,
                 value="* Grade letter is auto-assigned by system if left blank. "
                       "Accepted values: A+, A, B, C, D, F")
    ft.font = Font(name="Arial", italic=True, color="7F7F7F", size=9)
    ft.alignment = _LEFT

    # ── Column widths ─────────────────────────────────────────────────────
    col_widths = [5, 12, 18, 36, 16, 12, 28, 14]
    for i, w in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    # ── Freeze panes at row 16 ────────────────────────────────────────────
    ws.freeze_panes = "A16"

    # ── Hidden metadata sheet for system use ─────────────────────────────
    meta_ws = wb.create_sheet("_meta")
    meta_ws["A1"] = "template_type";      meta_ws["B1"] = "grades"
    meta_ws["A2"] = "academic_year_id";   meta_ws["B2"] = academic_year.id
    meta_ws["A3"] = "academic_year_name"; meta_ws["B3"] = academic_year.name
    meta_ws["A4"] = "class_level_id";     meta_ws["B4"] = class_level.id
    meta_ws["A5"] = "class_level_code";   meta_ws["B5"] = class_level.code
    meta_ws["A6"] = "subject_id";         meta_ws["B6"] = subject.id
    meta_ws["A7"] = "subject_code";       meta_ws["B7"] = subject.code
    meta_ws["A8"] = "trimester";          meta_ws["B8"] = trimester_code
    meta_ws["A9"] = "tri_start";          meta_ws["B9"] = str(tri_start)
    meta_ws["A10"] = "tri_end";           meta_ws["B10"] = str(tri_end)
    meta_ws["A11"] = "school_level_name"; meta_ws["B11"] = class_level.school_level.name
    meta_ws.sheet_state = "hidden"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
#  ATTENDANCE TEMPLATE GENERATOR
# ─────────────────────────────────────────────────────────────────────────────

def _build_attendance_template(
    academic_year: AcademicYear,
    class_level: ClassLevel,
    subject: Subject,
    session_date: date,
    trimester_code: str,
    classroom=None,
    lang="en",
) -> bytes:
    """
    Generate and return the bytes of a formatted .xlsx attendance template.
    """
    tri = next((t for t in RWANDA_TRIMESTERS if t["code"] == trimester_code), None)
    tri_label = get_trimester_label(tri, lang) if tri else trimester_code

    students = (
        Student.objects
        .filter(
            current_class_level=class_level,
            current_academic_year=academic_year,
            status="active",
        )
        .order_by("full_name")
        .values("id", "roll_number", "full_name")
    )

    wb = Workbook()
    ws = wb.active
    ws.title = "Attendance Template"

    # ── Title banner ──────────────────────────────────────────────────────
    _ATTEND_FILL = PatternFill("solid", start_color="1E5631")   # dark green
    ws.merge_cells("A1:H1")
    title = ws["A1"]
    title.value = "STUDENT ATTENDANCE RECORDING TEMPLATE"
    title.font = Font(name="Arial", bold=True, color="FFFFFF", size=14)
    title.fill = _ATTEND_FILL
    title.alignment = _CENTER
    ws.row_dimensions[1].height = 30

    ws.merge_cells("A2:H2")
    sub = ws["A2"]
    sub.value = f"École Les Hirondelles de Don Bosco – Attendance Form ({lang.upper()})"
    sub.font = Font(name="Arial", italic=True, color="1E5631", size=10)
    sub.fill = PatternFill("solid", start_color="D9EAD3")
    sub.alignment = _CENTER

    # ── Metadata ──────────────────────────────────────────────────────────
    ATT_META_FILL = PatternFill("solid", start_color="D9EAD3")
    META_ROWS = [
        ("Academic Year:",  str(academic_year.name)),
        ("Trimester:",      tri_label),
        ("Session Date:",   str(session_date)),
        ("School Level:",   str(class_level.school_level.name)),
        ("Class Level:",    f"{class_level.name} ({class_level.code})"),
        ("Subject:",        f"{subject.name} ({subject.code})"),
        ("Classroom:",      str(classroom.name) if classroom else "—"),
    ]
    for i, (lbl, val) in enumerate(META_ROWS, start=4):
        lbl_c = ws.cell(row=i, column=1, value=lbl)
        lbl_c.font = Font(name="Arial", bold=True, color="1E5631", size=10)
        lbl_c.fill = ATT_META_FILL
        lbl_c.alignment = _LEFT
        lbl_c.border = _THIN_BORDER

        val_c = ws.cell(row=i, column=2, value=val)
        val_c.font = _DARK_REG
        val_c.fill = ATT_META_FILL
        val_c.alignment = _LEFT
        val_c.border = _THIN_BORDER
        ws.merge_cells(start_row=i, start_column=2, end_row=i, end_column=8)

    # ── Instructions ──────────────────────────────────────────────────────
    ws.merge_cells("A12:H12")
    inst = ws["A12"]
    inst.value = (
        "⚠ INSTRUCTIONS: Fill the 'Status' column for each student. "
        "Accepted values: present | absent | late | excused (case-insensitive). "
        "Default is 'present'. Do NOT modify Roll Number, Name, or header rows."
    )
    inst.font = _RED_BOLD
    inst.fill = PatternFill("solid", start_color="FFF2CC")
    inst.alignment = Alignment(horizontal="left", vertical="center", wrap_text=True)
    ws.row_dimensions[12].height = 30

    # ── Column headers ────────────────────────────────────────────────────
    ATT_HDR_FILL = PatternFill("solid", start_color="2D6A4F")
    HEADERS = ["#", "Student ID", "Roll Number", "Student Full Name", 
               "Status", "Remarks", "", ""]
    for col, hdr in enumerate(HEADERS, start=1):
        cell = ws.cell(row=14, column=col, value=hdr)
        cell.font = _WHITE_BOLD
        cell.fill = ATT_HDR_FILL
        cell.alignment = _CENTER
        cell.border = _THIN_BORDER
    ws.row_dimensions[14].height = 22

    # Merge unused header columns
    ws.merge_cells("G14:H14")

    # ── Student rows ──────────────────────────────────────────────────────
    GREEN_INPUT = PatternFill("solid", start_color="D9EAD3")
    for row_offset, stu in enumerate(students):
        r = 15 + row_offset
        alt = PatternFill("solid", start_color="EAF4EA") if row_offset % 2 == 0 else PatternFill("solid", start_color="FFFFFF")

        c = ws.cell(row=r, column=1, value=row_offset + 1)
        c.font = _DARK_REG; c.fill = _LOCK_FILL; c.alignment = _CENTER; c.border = _THIN_BORDER

        c = ws.cell(row=r, column=2, value=stu["id"])
        c.font = _DARK_REG; c.fill = _LOCK_FILL; c.alignment = _CENTER; c.border = _THIN_BORDER

        c = ws.cell(row=r, column=3, value=stu["roll_number"])
        c.font = _DARK_BOLD; c.fill = _LOCK_FILL; c.alignment = _CENTER; c.border = _THIN_BORDER

        c = ws.cell(row=r, column=4, value=stu["full_name"])
        c.font = _DARK_REG; c.fill = _LOCK_FILL; c.alignment = _LEFT; c.border = _THIN_BORDER

        # Status — default "present", teacher can change
        c = ws.cell(row=r, column=5, value="present")
        c.font = _DARK_REG; c.fill = GREEN_INPUT; c.alignment = _CENTER; c.border = _THIN_BORDER

        c = ws.cell(row=r, column=6, value="")
        c.font = _DARK_REG; c.fill = GREEN_INPUT; c.alignment = _LEFT; c.border = _THIN_BORDER

        # Merge columns 7-8 for spacious remarks
        ws.merge_cells(start_row=r, start_column=6, end_row=r, end_column=8)

    # ── Column widths ─────────────────────────────────────────────────────
    col_widths = [5, 12, 18, 36, 18, 45, 1, 1]
    for i, w in enumerate(col_widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w

    ws.freeze_panes = "A15"

    # ── Hidden metadata sheet ─────────────────────────────────────────────
    meta_ws = wb.create_sheet("_meta")
    meta_ws["A1"] = "template_type";      meta_ws["B1"] = "attendance"
    meta_ws["A2"] = "academic_year_id";   meta_ws["B2"] = academic_year.id
    meta_ws["A3"] = "academic_year_name"; meta_ws["B3"] = academic_year.name
    meta_ws["A4"] = "class_level_id";     meta_ws["B4"] = class_level.id
    meta_ws["A5"] = "class_level_code";   meta_ws["B5"] = class_level.code
    meta_ws["A6"] = "subject_id";         meta_ws["B6"] = subject.id
    meta_ws["A7"] = "subject_code";       meta_ws["B7"] = subject.code
    meta_ws["A8"] = "session_date";       meta_ws["B8"] = str(session_date)
    meta_ws["A9"] = "trimester";          meta_ws["B9"] = trimester_code
    meta_ws["A10"] = "school_level_name"; meta_ws["B10"] = class_level.school_level.name
    meta_ws.sheet_state = "hidden"

    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


# ─────────────────────────────────────────────────────────────────────────────
#  GRADE TEMPLATE UPLOAD PROCESSOR (enhanced)
# ─────────────────────────────────────────────────────────────────────────────

def process_grade_template_upload(uploaded_file, academic_year_id, class_level_id, 
                                   subject_id, term, teacher, request_user, lang="en"):
    """
    Process a filled grade template Excel file.
    Extracts grades and creates/updates StudentGrade records.
    
    Returns: (success, message, grade_upload_obj, errors)
    """
    from django.core.files.base import ContentFile
    import os
    from decimal import InvalidOperation
    from .models import GradeUpload, StudentGrade
    from academics.models import AcademicYear, ClassLevel, Subject
    from students.models import Student
    
    errors = []
    
    # Validate required IDs
    try:
        academic_year = AcademicYear.objects.get(pk=academic_year_id)
        class_level = ClassLevel.objects.get(pk=class_level_id)
        subject = Subject.objects.get(pk=subject_id)
    except (AcademicYear.DoesNotExist, ClassLevel.DoesNotExist, Subject.DoesNotExist) as e:
        return False, t("not_found", lang) + f" ({e})", None, errors
    
    # Check for duplicate upload
    if GradeUpload.objects.filter(
        teacher=teacher, class_level=class_level,
        subject=subject, academic_year=academic_year, term=term
    ).exists():
        return False, t("grade_upload_duplicate", lang), None, errors
    
    # Load workbook
    try:
        wb = load_workbook(uploaded_file, data_only=True)
        ws = wb.active
        
        # Check for metadata sheet
        if "_meta" in wb.sheetnames:
            meta_ws = wb["_meta"]
            # Verify metadata matches expected values
            # (optional validation)
    except Exception as e:
        return False, t("parse_error", lang, error=str(e)), None, errors
    
    # Find headers
    headers = []
    for row in ws.iter_rows(min_row=1, max_row=20, values_only=True):
        if row and any(cell and "roll" in str(cell).lower() for cell in row):
            headers = [str(cell).strip().lower() if cell else '' for cell in row]
            break
    
    if not headers:
        # Try row 15 as default (from template)
        headers = [str(cell.value).strip().lower() if cell.value else '' 
                   for cell in ws[15] if cell]
    
    # Map expected columns
    col_map = {}
    for idx, h in enumerate(headers):
        h_lower = h.lower()
        if 'roll' in h_lower or 'roll_number' in h_lower:
            col_map['roll_number'] = idx
        elif 'name' in h_lower and 'student' in h_lower:
            col_map['student_name'] = idx
        elif 'score' in h_lower:
            col_map['score'] = idx
        elif 'max_score' in h_lower or 'max score' in h_lower:
            col_map['max_score'] = idx
        elif 'remark' in h_lower:
            col_map['remarks'] = idx
        elif 'grade' in h_lower and 'letter' in h_lower:
            col_map['grade_letter'] = idx
        elif 'student id' in h_lower or 'student_id' in h_lower:
            col_map['student_id'] = idx
    
    if 'roll_number' not in col_map or 'score' not in col_map:
        return False, t("grade_upload_bad_template", lang, cols="roll_number, score"), None, errors
    
    # Create GradeUpload record
    try:
        # Save file to model
        from django.core.files.base import ContentFile
        
        grade_upload = GradeUpload.objects.create(
            teacher=teacher,
            academic_year=academic_year,
            class_level=class_level,
            subject=subject,
            term=term,
            status=GradeUpload.Status.PENDING,
            uploaded_by=request_user,
        )
        
        # Save the file
        file_content = uploaded_file.read()
        grade_upload.excel_file.save(
            f"grades_{academic_year.name}_{class_level.code}_{subject.code}_{term}.xlsx",
            ContentFile(file_content)
        )
        grade_upload.save()
        
    except Exception as e:
        return False, t("db_error", lang, error=str(e)), None, errors
    
    # Parse student rows
    grades_saved = 0
    row_errors = []
    
    for row_idx, row in enumerate(ws.iter_rows(min_row=16, values_only=True), start=16):
        if not row or all(cell is None or str(cell).strip() == '' for cell in row):
            continue
        
        try:
            # Get roll number
            roll_col = col_map['roll_number']
            roll_number = str(row[roll_col]).strip() if roll_col < len(row) and row[roll_col] else None
            
            if not roll_number:
                continue
            
            # Find student
            try:
                student = Student.objects.get(roll_number=roll_number)
            except Student.DoesNotExist:
                row_errors.append(f"Row {row_idx}: {t('student_not_found', lang, roll=roll_number)}")
                continue
            
            # Get score
            score_col = col_map['score']
            score_raw = row[score_col] if score_col < len(row) else None
            
            if score_raw is None or str(score_raw).strip() == '':
                continue
                
            try:
                score = Decimal(str(score_raw))
                if score < 0 or score > 100:
                    row_errors.append(f"Row {row_idx}: Score must be between 0 and 100")
                    continue
            except InvalidOperation:
                row_errors.append(f"Row {row_idx}: Invalid score value '{score_raw}'")
                continue
            
            # Get max score
            max_score = Decimal('100')
            if 'max_score' in col_map:
                max_col = col_map['max_score']
                if max_col < len(row) and row[max_col]:
                    try:
                        max_score = Decimal(str(row[max_col]))
                    except:
                        pass
            
            # Get remarks
            remarks = ""
            if 'remarks' in col_map:
                rem_col = col_map['remarks']
                if rem_col < len(row) and row[rem_col]:
                    remarks = str(row[rem_col])
            
            # Get or calculate grade letter
            grade_letter = ""
            if 'grade_letter' in col_map:
                gl_col = col_map['grade_letter']
                if gl_col < len(row) and row[gl_col]:
                    grade_letter = str(row[gl_col]).strip().upper()
            
            if not grade_letter:
                percentage = float((score / max_score) * 100)
                grade_letter = _auto_grade_letter(percentage)
            
            # Create grade record
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
            
        except Exception as e:
            row_errors.append(f"Row {row_idx}: {str(e)}")
    
    if grades_saved == 0 and not row_errors:
        return False, t("grade_upload_no_data", lang), None, row_errors
    
    return True, f"{grades_saved} grades processed. {len(row_errors)} errors.", grade_upload, row_errors


def _auto_grade_letter(score):
    """Return grade letter for a percentage score."""
    if score >= 90: return 'A+'
    if score >= 80: return 'A'
    if score >= 70: return 'B'
    if score >= 60: return 'C'
    if score >= 50: return 'D'
    return 'F'


# ─────────────────────────────────────────────────────────────────────────────
#  ATTENDANCE TEMPLATE UPLOAD PROCESSOR
# ─────────────────────────────────────────────────────────────────────────────

def process_attendance_template_upload(uploaded_file, academic_year_id, class_level_id,
                                        subject_id, session_date_str, teacher, 
                                        request_user, lang="en"):
    """
    Process a filled attendance template Excel file.
    Extracts attendance records and creates/updates StudentAttendance records.
    
    Returns: (success, message, session_obj, errors)
    """
    from decimal import InvalidOperation
    from datetime import datetime
    from .models import AttendanceSession, StudentAttendance
    from academics.models import AcademicYear, ClassLevel, Subject, ClassRoom
    from students.models import Student
    
    errors = []
    
    # Validate required IDs
    try:
        academic_year = AcademicYear.objects.get(pk=academic_year_id)
        class_level = ClassLevel.objects.get(pk=class_level_id)
        subject = Subject.objects.get(pk=subject_id)
        
        # Parse session date
        try:
            session_date = datetime.strptime(session_date_str, "%Y-%m-%d").date()
        except ValueError:
            session_date = date.today()
            
    except (AcademicYear.DoesNotExist, ClassLevel.DoesNotExist, Subject.DoesNotExist) as e:
        return False, t("not_found", lang) + f" ({e})", None, errors
    
    # Check for duplicate session
    if AttendanceSession.objects.filter(
        teacher=teacher, class_level=class_level,
        subject=subject, date=session_date, academic_year=academic_year
    ).exists():
        return False, t("attendance_session_duplicate", lang), None, errors
    
    # Load workbook
    try:
        wb = load_workbook(uploaded_file, data_only=True)
        ws = wb.active
    except Exception as e:
        return False, t("parse_error", lang, error=str(e)), None, errors
    
    # Find headers
    headers = []
    for row in ws.iter_rows(min_row=1, max_row=20, values_only=True):
        if row and any(cell and "roll" in str(cell).lower() for cell in row):
            headers = [str(cell).strip().lower() if cell else '' for cell in row]
            break
    
    if not headers:
        headers = [str(cell.value).strip().lower() if cell.value else '' 
                   for cell in ws[14] if cell]
    
    # Map expected columns
    col_map = {}
    for idx, h in enumerate(headers):
        h_lower = h.lower()
        if 'roll' in h_lower or 'roll_number' in h_lower:
            col_map['roll_number'] = idx
        elif 'name' in h_lower and 'student' in h_lower:
            col_map['student_name'] = idx
        elif 'status' in h_lower:
            col_map['status'] = idx
        elif 'remark' in h_lower:
            col_map['remarks'] = idx
        elif 'student id' in h_lower or 'student_id' in h_lower:
            col_map['student_id'] = idx
    
    if 'roll_number' not in col_map:
        return False, t("attendance_upload_bad_template", lang, cols="roll_number, status"), None, errors
    
    # Create AttendanceSession
    try:
        session = AttendanceSession.objects.create(
            teacher=teacher,
            class_level=class_level,
            subject=subject,
            academic_year=academic_year,
            date=session_date,
            created_by=request_user,
            is_submitted=False,
        )
    except Exception as e:
        return False, t("db_error", lang, error=str(e)), None, errors
    
    # Parse student rows
    records_saved = 0
    row_errors = []
    
    valid_statuses = ['present', 'absent', 'late', 'excused']
    
    for row_idx, row in enumerate(ws.iter_rows(min_row=15, values_only=True), start=15):
        if not row or all(cell is None or str(cell).strip() == '' for cell in row[:4]):
            continue
        
        try:
            # Get roll number
            roll_col = col_map['roll_number']
            roll_number = str(row[roll_col]).strip() if roll_col < len(row) and row[roll_col] else None
            
            if not roll_number:
                continue
            
            # Find student
            try:
                student = Student.objects.get(roll_number=roll_number)
            except Student.DoesNotExist:
                row_errors.append(f"Row {row_idx}: {t('student_not_found', lang, roll=roll_number)}")
                continue
            
            # Get status
            status = "present"
            if 'status' in col_map:
                status_col = col_map['status']
                if status_col < len(row) and row[status_col]:
                    status = str(row[status_col]).strip().lower()
                    if status not in valid_statuses:
                        status = "present"
            
            # Get remarks
            remarks = ""
            if 'remarks' in col_map:
                rem_col = col_map['remarks']
                if rem_col < len(row) and row[rem_col]:
                    remarks = str(row[rem_col])
            
            # Check if record already exists
            existing = StudentAttendance.objects.filter(session=session, student=student).first()
            if existing:
                existing.status = status
                existing.remarks = remarks
                existing.save()
            else:
                StudentAttendance.objects.create(
                    session=session,
                    student=student,
                    status=status,
                    remarks=remarks,
                )
            records_saved += 1
            
        except Exception as e:
            row_errors.append(f"Row {row_idx}: {str(e)}")
    
    if records_saved == 0 and not row_errors:
        session.delete()
        return False, t("attendance_upload_no_data", lang), None, row_errors
    
    return True, f"{records_saved} attendance records processed. {len(row_errors)} errors.", session, row_errors


# ─────────────────────────────────────────────────────────────────────────────
#  VIEWS
# ─────────────────────────────────────────────────────────────────────────────

@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_grade_template(request):
    """
    Generate and stream a grades Excel template.

    Query params (all required):
      academic_year_id  – FK to AcademicYear
      class_level_id    – FK to ClassLevel
      subject_id        – FK to Subject
      trimester         – T1 | T2 | T3
      classroom_id      – FK to ClassRoom (optional)
      lang              – en | fr | rw (optional)

    Returns an Excel file download.
    """
    lang = get_lang(request)

    # Permission: admin or teacher
    from .views import _is_admin, _get_teacher
    if not _is_admin(request.user):
        teacher, err = _get_teacher(request.user, lang)
        if err:
            return err

    # Validate params
    ay_id = request.query_params.get("academic_year_id")
    cl_id = request.query_params.get("class_level_id")
    subj_id = request.query_params.get("subject_id")
    trimester = request.query_params.get("trimester", "").upper()
    classroom_id = request.query_params.get("classroom_id")

    if not all([ay_id, cl_id, subj_id, trimester]):
        return Response(
            {"success": False, "message": "Required params: academic_year_id, class_level_id, subject_id, trimester (T1/T2/T3)"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_trimesters = {t["code"] for t in RWANDA_TRIMESTERS}
    if trimester not in valid_trimesters:
        return Response(
            {"success": False, "message": f"Invalid trimester. Choose from: {', '.join(sorted(valid_trimesters))}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        academic_year = AcademicYear.objects.get(pk=ay_id)
        class_level = ClassLevel.objects.select_related("school_level").get(pk=cl_id)
        subject = Subject.objects.get(pk=subj_id)
        classroom = ClassRoom.objects.get(pk=classroom_id) if classroom_id else None
    except (AcademicYear.DoesNotExist, ClassLevel.DoesNotExist,
            Subject.DoesNotExist, ClassRoom.DoesNotExist) as exc:
        return Response(
            {"success": False, "message": f"Not found: {exc}"},
            status=status.HTTP_404_NOT_FOUND,
        )

    xlsx_bytes = _build_grade_template(
        academic_year=academic_year,
        class_level=class_level,
        subject=subject,
        trimester_code=trimester,
        classroom=classroom,
        lang=lang,
    )

    filename = (
        f"grades_template_{academic_year.name}_{class_level.code}"
        f"_{subject.code}_{trimester}.xlsx"
    )
    response = HttpResponse(
        xlsx_bytes,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Content-Length"] = len(xlsx_bytes)
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def download_attendance_template(request):
    """
    Generate and stream an attendance Excel template.

    Query params (all required):
      academic_year_id  – FK to AcademicYear
      class_level_id    – FK to ClassLevel
      subject_id        – FK to Subject
      trimester         – T1 | T2 | T3
      session_date      – YYYY-MM-DD (defaults to today)
      classroom_id      – FK to ClassRoom (optional)
      lang              – en | fr | rw (optional)
    """
    lang = get_lang(request)

    from .views import _is_admin, _get_teacher
    if not _is_admin(request.user):
        teacher, err = _get_teacher(request.user, lang)
        if err:
            return err

    ay_id = request.query_params.get("academic_year_id")
    cl_id = request.query_params.get("class_level_id")
    subj_id = request.query_params.get("subject_id")
    trimester = request.query_params.get("trimester", "").upper()
    session_date_str = request.query_params.get("session_date", str(date.today()))
    classroom_id = request.query_params.get("classroom_id")

    if not all([ay_id, cl_id, subj_id, trimester]):
        return Response(
            {"success": False, "message": "Required params: academic_year_id, class_level_id, subject_id, trimester (T1/T2/T3)"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    valid_trimesters = {t["code"] for t in RWANDA_TRIMESTERS}
    if trimester not in valid_trimesters:
        return Response(
            {"success": False, "message": f"Invalid trimester. Choose from: {', '.join(sorted(valid_trimesters))}"},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        session_date = datetime.strptime(session_date_str, "%Y-%m-%d").date()
    except ValueError:
        return Response(
            {"success": False, "message": "Invalid session_date format. Use YYYY-MM-DD."},
            status=status.HTTP_400_BAD_REQUEST,
        )

    try:
        academic_year = AcademicYear.objects.get(pk=ay_id)
        class_level = ClassLevel.objects.select_related("school_level").get(pk=cl_id)
        subject = Subject.objects.get(pk=subj_id)
        classroom = ClassRoom.objects.get(pk=classroom_id) if classroom_id else None
    except (AcademicYear.DoesNotExist, ClassLevel.DoesNotExist,
            Subject.DoesNotExist, ClassRoom.DoesNotExist) as exc:
        return Response(
            {"success": False, "message": f"Not found: {exc}"},
            status=status.HTTP_404_NOT_FOUND,
        )

    xlsx_bytes = _build_attendance_template(
        academic_year=academic_year,
        class_level=class_level,
        subject=subject,
        session_date=session_date,
        trimester_code=trimester,
        classroom=classroom,
        lang=lang,
    )

    filename = (
        f"attendance_template_{academic_year.name}_{class_level.code}"
        f"_{subject.code}_{session_date_str}.xlsx"
    )
    response = HttpResponse(
        xlsx_bytes,
        content_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    )
    response["Content-Disposition"] = f'attachment; filename="{filename}"'
    response["Content-Length"] = len(xlsx_bytes)
    return response


@api_view(["GET"])
@permission_classes([IsAuthenticated])
def list_trimesters(request):
    """
    Return the list of Rwanda trimester options.
    Useful for populating a dropdown in the front end.
    """
    lang = get_lang(request)
    academic_year_id = request.query_params.get("academic_year_id")
    result = []
    for tri in RWANDA_TRIMESTERS:
        entry = {
            "code": tri["code"],
            "label": get_trimester_label(tri, lang),
            "label_en": tri.get("label_en", tri["code"]),
            "label_fr": tri.get("label_fr", tri["code"]),
            "label_rw": tri.get("label_rw", tri["code"]),
            "month_start": tri["month_start"],
            "month_end": tri["month_end"],
        }
        if academic_year_id:
            try:
                ay = AcademicYear.objects.get(pk=academic_year_id)
                s, e = _trimester_dates(ay, tri["code"])
                entry["start_date"] = str(s)
                entry["end_date"] = str(e)
            except AcademicYear.DoesNotExist:
                pass
        result.append(entry)
    return Response({"success": True, "data": result})





# Add to academics_records/views.py

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_grade_template_file(request):
    """
    Enhanced grade upload that processes the filled template file extracted from Excel.
    
    Required form fields:
      - excel_file: the filled template file
      - academic_year_id: FK to AcademicYear
      - class_level_id: FK to ClassLevel  
      - subject_id: FK to Subject
      - term: term/trimester (T1, T2, T3)
    """
    lang = get_lang(request)
    print(f"[upload_grade_template_file] Lang={lang} | User={request.user}")
    
    # Get teacher
    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err
    
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
    """
    lang = get_lang(request)
    print(f"[upload_attendance_template_file] Lang={lang} | User={request.user}")
    
    # Get teacher
    teacher, err = _get_teacher(request.user, lang)
    if err:
        return err
    
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
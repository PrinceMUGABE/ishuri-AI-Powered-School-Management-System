"""
dashboard/utils.py

Pure-computation helpers. Every function queries the DB and returns a plain
Python dict ready to be handed to a serializer or returned as JSON.
"""

from datetime import date, timedelta
from decimal import Decimal

from django.db.models import (
    Count, Sum, Avg, Q, F, DecimalField, ExpressionWrapper,
    Value, IntegerField
)
from django.db.models.functions import TruncMonth, Coalesce
from django.utils import timezone


# ─────────────────────────────────────────────────────────────────────────────
# Lazy imports (avoid circular imports at module load time)
# ─────────────────────────────────────────────────────────────────────────────

def _user_model():
    from accounts.models import User
    return User


def _academic_models():
    from academics.models import (
        AcademicYear, Term, SchoolLevel, ClassLevel,
        ClassRoom, Subject, ClassLevelSubject
    )
    return AcademicYear, Term, SchoolLevel, ClassLevel, ClassRoom, Subject, ClassLevelSubject


def _student_models():
    from students.models import Student, Parent, StudentParent
    return Student, Parent, StudentParent


def _teacher_models():
    from teachers.models import Teacher, TeacherAssignment, TeacherTimetable
    return Teacher, TeacherAssignment, TeacherTimetable


def _records_models():
    from academics_records.models import (
        GradeUpload, StudentGrade, AttendanceSession, StudentAttendance
    )
    return GradeUpload, StudentGrade, AttendanceSession, StudentAttendance


def _payment_models():
    from payments.models import StudentPaymentAssignment, PaymentTransaction
    return StudentPaymentAssignment, PaymentTransaction


def _chat_models():
    from chat.models import ChatRoom, Message
    return ChatRoom, Message


# ─────────────────────────────────────────────────────────────────────────────
# Generic helpers
# ─────────────────────────────────────────────────────────────────────────────

def _monthly_trend(queryset, date_field: str, months: int = 12) -> list[dict]:
    """
    Return a list of {month: 'YYYY-MM', count: N} for the last *months* months.
    """
    since = timezone.now() - timedelta(days=months * 30)
    return (
        queryset
        .filter(**{f"{date_field}__gte": since})
        .annotate(month=TruncMonth(date_field))
        .values("month")
        .annotate(count=Count("id"))
        .order_by("month")
        .values("month", "count")
    )


def _safe_percentage(numerator, denominator) -> float:
    try:
        return round(float(numerator) / float(denominator) * 100, 2)
    except (TypeError, ZeroDivisionError, ValueError):
        return 0.0


# ─────────────────────────────────────────────────────────────────────────────
# USER analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_user_analytics() -> dict:
    User = _user_model()
    qs = User.objects.all()

    total = qs.count()

    by_role = dict(qs.values_list("role").annotate(c=Count("id")).values_list("role", "c"))
    by_status = dict(qs.values_list("status").annotate(c=Count("id")).values_list("status", "c"))
    by_language = dict(qs.values_list("language").annotate(c=Count("id")).values_list("language", "c"))

    active_count = by_status.get("active", 0)
    since_30 = timezone.now() - timedelta(days=30)

    raw_trend = list(_monthly_trend(qs, "created_at"))
    monthly = [
        {"month": r["month"].strftime("%Y-%m"), "count": r["count"]}
        for r in raw_trend
    ]

    return {
        "total_users": total,
        "by_role": by_role,
        "by_status": by_status,
        "active_percentage": _safe_percentage(active_count, total),
        "total_staff": qs.filter(is_staff=True).count(),
        "new_last_30_days": qs.filter(created_at__gte=since_30).count(),
        "by_language": by_language,
        "monthly_registrations": monthly,
    }


def get_user_details() -> list[dict]:
    User = _user_model()
    return list(
        User.objects.values(
            "id", "username", "email", "role", "status",
            "language", "is_staff", "created_at", "last_logged_in"
        )
    )


# ─────────────────────────────────────────────────────────────────────────────
# ACADEMIC YEAR analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_academic_year_analytics() -> dict:
    AcademicYear, *_ = _academic_models()
    qs = AcademicYear.objects.annotate(term_count=Count("terms"))

    total = qs.count()
    current = qs.filter(is_current=True).first()

    avg_terms = qs.aggregate(avg=Avg("term_count"))["avg"] or 0

    years_list = list(
        qs.values("id", "name", "start_date", "end_date", "is_current", "term_count")
    )

    return {
        "total_academic_years": total,
        "current_year_name": current.name if current else None,
        "total_terms_current_year": current.terms.count() if current else 0,
        "avg_terms_per_year": round(float(avg_terms), 2),
        "years_list": years_list,
    }


def get_academic_year_details() -> list[dict]:
    AcademicYear, Term, *_ = _academic_models()
    Student, *_ = _student_models()
    Teacher, TeacherAssignment, *_ = _teacher_models()
    
    years = AcademicYear.objects.all()
    result = []
    for y in years:
        result.append({
            "id": y.id,
            "name": y.name,
            "start_date": y.start_date,
            "end_date": y.end_date,
            "is_current": y.is_current,
            "created_at": y.created_at,
            "total_terms": y.terms.count(),
            "total_students": Student.objects.filter(current_academic_year=y).count(),
            "total_teacher_assignments": TeacherAssignment.objects.filter(academic_year=y).count(),
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# TERM analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_term_analytics() -> dict:
    _, Term, *_ = _academic_models()
    qs = Term.objects.select_related("academic_year")

    total = qs.count()
    current = qs.filter(is_current=True).first()

    terms_per_year = list(
        qs.values("academic_year__name")
        .annotate(count=Count("id"))
        .values("academic_year__name", "count")
    )

    # avg duration
    durations = []
    for t in qs:
        delta = (t.end_date - t.start_date).days
        durations.append(delta)
    avg_duration = round(sum(durations) / len(durations), 2) if durations else 0

    return {
        "total_terms": total,
        "current_term_name": str(current) if current else None,
        "avg_duration_days": avg_duration,
        "terms_per_year": terms_per_year,
    }


def get_term_details() -> list[dict]:
    _, Term, *_ = _academic_models()
    result = []
    for t in Term.objects.select_related("academic_year"):
        result.append({
            "id": t.id,
            "name": t.name,
            "academic_year": t.academic_year.name,
            "term_number": t.term_number,
            "start_date": t.start_date,
            "end_date": t.end_date,
            "is_current": t.is_current,
            "duration_days": (t.end_date - t.start_date).days,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# SCHOOL LEVEL analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_school_level_analytics() -> dict:
    _, _, SchoolLevel, *_ = _academic_models()
    Student, *_ = _student_models()

    qs = SchoolLevel.objects.all()
    total = qs.count()
    active = qs.filter(is_active=True).count()

    students_per_level = list(
        Student.objects.filter(current_school_level__isnull=False)
        .values("current_school_level__name")
        .annotate(count=Count("id"))
        .values("current_school_level__name", "count")
    )
    total_students = sum(r["count"] for r in students_per_level)

    class_levels_per = list(
        qs.annotate(cl_count=Count("class_levels"))
        .values("name", "cl_count")
    )

    return {
        "total_school_levels": total,
        "active_school_levels": active,
        "inactive_school_levels": total - active,
        "total_students_across_levels": total_students,
        "students_per_level": students_per_level,
        "class_levels_per_school_level": class_levels_per,
    }


def get_school_level_details() -> list[dict]:
    _, _, SchoolLevel, *_ = _academic_models()
    Student, *_ = _student_models()

    result = []
    for sl in SchoolLevel.objects.prefetch_related("class_levels", "breaks"):
        result.append({
            "id": sl.id,
            "name": sl.name,
            "description": sl.description,
            "is_active": sl.is_active,
            "start_time": sl.start_time,
            "end_time": sl.end_time,
            "net_teaching_minutes_per_day": sl.get_net_teaching_minutes_per_day(),
            "total_class_levels": sl.class_levels.count(),
            "total_active_class_levels": sl.class_levels.filter(is_active=True).count(),
            "total_students": Student.objects.filter(current_school_level=sl).count(),
            "total_breaks": sl.breaks.count(),
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# CLASS LEVEL analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_class_level_analytics() -> dict:
    _, _, _, ClassLevel, _, _, ClassLevelSubject = _academic_models()
    Student, *_ = _student_models()

    qs = ClassLevel.objects.select_related("school_level")
    total = qs.count()
    active = qs.filter(is_active=True).count()

    total_subject_assignments = ClassLevelSubject.objects.count()

    students_per_cl = list(
        Student.objects.filter(current_class_level__isnull=False)
        .values("current_class_level__name")
        .annotate(count=Count("id"))
        .values("current_class_level__name", "count")
    )
    subjects_per_cl = list(
        ClassLevelSubject.objects
        .values("class_level__name")
        .annotate(count=Count("id"))
        .values("class_level__name", "count")
    )

    avg_subjects = round(total_subject_assignments / total, 2) if total else 0

    return {
        "total_class_levels": total,
        "active_class_levels": active,
        "inactive_class_levels": total - active,
        "total_subject_assignments": total_subject_assignments,
        "avg_subjects_per_class": avg_subjects,
        "students_per_class_level": students_per_cl,
        "subjects_per_class_level": subjects_per_cl,
    }


def get_class_level_details() -> list[dict]:
    _, _, _, ClassLevel, _, _, ClassLevelSubject = _academic_models()
    Student, *_ = _student_models()

    result = []
    for cl in ClassLevel.objects.select_related("school_level").prefetch_related(
        "subjects", "assigned_classrooms"
    ):
        total_subjects = cl.subjects.count()
        compulsory = cl.subjects.filter(is_compulsory=True).count()
        weekly_hours = float(
            cl.subjects.aggregate(total=Coalesce(Sum("hours_per_week"), 0.0))["total"]
        )
        result.append({
            "id": cl.id,
            "name": cl.name,
            "code": cl.code,
            "school_level": cl.school_level.name,
            "is_active": cl.is_active,
            "total_subjects": total_subjects,
            "compulsory_subjects": compulsory,
            "total_classrooms": cl.assigned_classrooms.count(),
            "total_students": Student.objects.filter(current_class_level=cl).count(),
            "weekly_teaching_hours": weekly_hours,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# CLASSROOM analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_classroom_analytics() -> dict:
    _, _, _, _, ClassRoom, *_ = _academic_models()

    qs = ClassRoom.objects.all()
    total = qs.count()
    active = qs.filter(status="active").count()
    assigned = qs.filter(assigned_class_level__isnull=False).count()

    total_capacity = qs.aggregate(t=Coalesce(Sum("capacity"), 0))["t"]
    avg_capacity = qs.aggregate(a=Avg("capacity"))["a"] or 0

    by_type = dict(
        qs.values_list("room_type")
        .annotate(c=Count("id"))
        .values_list("room_type", "c")
    )

    return {
        "total_classrooms": total,
        "active_classrooms": active,
        "inactive_classrooms": total - active,
        "assigned_classrooms": assigned,
        "unassigned_classrooms": total - assigned,
        "total_capacity": total_capacity,
        "avg_capacity": round(float(avg_capacity), 2),
        "by_room_type": by_type,
        "utilization_rate": _safe_percentage(assigned, total),
    }


def get_classroom_details() -> list[dict]:
    _, _, _, _, ClassRoom, *_ = _academic_models()
    result = []
    for r in ClassRoom.objects.select_related("assigned_class_level"):
        result.append({
            "id": r.id,
            "name": r.name,
            "code": r.code,
            "room_type": r.room_type,
            "capacity": r.capacity,
            "status": r.status,
            "assigned_class_level": r.assigned_class_level.name if r.assigned_class_level else None,
            "created_at": r.created_at,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# SUBJECT analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_subject_analytics() -> dict:
    _, _, _, _, _, Subject, ClassLevelSubject = _academic_models()

    qs = Subject.objects.all()
    total = qs.count()
    active = qs.filter(status="active").count()

    avg_pass_mark = qs.aggregate(avg=Avg("pass_mark"))["avg"] or 0

    subjects_by_count = list(
        ClassLevelSubject.objects
        .values("subject__name")
        .annotate(count=Count("class_level"))
        .order_by("-count")
        .values("subject__name", "count")
    )

    most_assigned = subjects_by_count[:10]

    return {
        "total_subjects": total,
        "active_subjects": active,
        "inactive_subjects": total - active,
        "avg_pass_mark": round(float(avg_pass_mark), 2),
        "subjects_by_class_level_count": subjects_by_count,
        "most_assigned_subjects": most_assigned,
    }


def get_subject_details() -> list[dict]:
    _, _, _, _, _, Subject, ClassLevelSubject = _academic_models()
    Teacher, TeacherAssignment, *_ = _teacher_models()

    result = []
    for s in Subject.objects.prefetch_related("class_levels", "teacher_assignments"):
        result.append({
            "id": s.id,
            "name": s.name,
            "code": s.code,
            "pass_mark": s.pass_mark,
            "status": s.status,
            "description": s.description,
            "total_class_levels": s.class_levels.count(),
            "total_teachers": s.teacher_assignments.values("teacher").distinct().count(),
            "created_at": s.created_at,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# STUDENT analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_student_analytics() -> dict:
    Student, Parent, StudentParent = _student_models()

    qs = Student.objects.all()
    total = qs.count()

    since_30 = timezone.now().date() - timedelta(days=30)
    since_90 = timezone.now().date() - timedelta(days=90)

    by_status = dict(
        qs.values_list("status").annotate(c=Count("id")).values_list("status", "c")
    )
    active = by_status.get("active", 0)

    students_per_cl = list(
        qs.filter(current_class_level__isnull=False)
        .values("current_class_level__name")
        .annotate(count=Count("id"))
        .values("current_class_level__name", "count")
    )
    students_per_sl = list(
        qs.filter(current_school_level__isnull=False)
        .values("current_school_level__name")
        .annotate(count=Count("id"))
        .values("current_school_level__name", "count")
    )
    students_per_ay = list(
        qs.filter(current_academic_year__isnull=False)
        .values("current_academic_year__name")
        .annotate(count=Count("id"))
        .values("current_academic_year__name", "count")
    )

    raw_trend = list(_monthly_trend(qs, "created_at"))
    monthly = [
        {"month": r["month"].strftime("%Y-%m"), "count": r["count"]}
        for r in raw_trend
    ]

    ages = [s.age for s in qs if s.age is not None]
    avg_age = round(sum(ages) / len(ages), 2) if ages else 0

    students_with_parents = (
        StudentParent.objects.values("student").distinct().count()
    )

    return {
        "total_students": total,
        "active_students": active,
        "inactive_students": by_status.get("inactive", 0),
        "transferred_students": by_status.get("transferred", 0),
        "graduated_students": by_status.get("graduated", 0),
        "active_percentage": _safe_percentage(active, total),
        "students_per_class_level": students_per_cl,
        "students_per_school_level": students_per_sl,
        "students_per_academic_year": students_per_ay,
        "new_enrollments_last_30_days": qs.filter(enrollment_date__gte=since_30).count(),
        "new_enrollments_last_90_days": qs.filter(enrollment_date__gte=since_90).count(),
        "monthly_enrollment_trend": monthly,
        "avg_age": avg_age,
        "students_with_parents": students_with_parents,
        "students_without_parents": total - students_with_parents,
    }


def get_student_details() -> list[dict]:
    Student, _, StudentParent = _student_models()
    result = []
    for s in Student.objects.select_related(
        "current_academic_year", "current_school_level", "current_class_level"
    ):
        result.append({
            "id": s.id,
            "full_name": s.full_name,
            "roll_number": s.roll_number,
            "email": s.email,
            "phone_number": s.phone_number,
            "birth_date": s.birth_date,
            "age": s.age,
            "status": s.status,
            "enrollment_date": s.enrollment_date,
            "current_academic_year": s.current_academic_year.name if s.current_academic_year else None,
            "current_school_level": s.current_school_level.name if s.current_school_level else None,
            "current_class_level": s.current_class_level.name if s.current_class_level else None,
            "total_parents": s.student_parents.count(),
            "created_at": s.created_at,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# PARENT analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_parent_analytics() -> dict:
    _, Parent, StudentParent = _student_models()

    qs = Parent.objects.all()
    total = qs.count()
    active = qs.filter(status="active").count()

    by_rel = dict(
        qs.values_list("relationship_type")
        .annotate(c=Count("id"))
        .values_list("relationship_type", "c")
    )

    with_account = qs.filter(user__isnull=False).count()

    child_counts = list(
        StudentParent.objects
        .values("parent")
        .annotate(c=Count("student"))
        .values_list("c", flat=True)
    )
    avg_children = round(sum(child_counts) / len(child_counts), 2) if child_counts else 0

    return {
        "total_parents": total,
        "active_parents": active,
        "inactive_parents": total - active,
        "by_relationship_type": by_rel,
        "parents_with_user_account": with_account,
        "avg_children_per_parent": avg_children,
    }


def get_parent_details() -> list[dict]:
    _, Parent, _ = _student_models()
    result = []
    for p in Parent.objects.prefetch_related("parent_students"):
        result.append({
            "id": p.id,
            "full_name": p.full_name,
            "phone_number": p.phone_number,
            "email": p.email,
            "relationship_type": p.relationship_type,
            "status": p.status,
            "total_children": p.parent_students.count(),
            "created_at": p.created_at,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_teacher_analytics() -> dict:
    Teacher, TeacherAssignment, _ = _teacher_models()

    qs = Teacher.objects.all()
    total = qs.count()

    by_status = dict(
        qs.values_list("status").annotate(c=Count("id")).values_list("status", "c")
    )
    by_gender = dict(
        qs.values_list("gender").annotate(c=Count("id")).values_list("gender", "c")
    )
    by_edu = dict(
        qs.values_list("education_level").annotate(c=Count("id")).values_list("education_level", "c")
    )

    active = by_status.get("active", 0)

    salary_agg = qs.aggregate(
        avg_salary=Avg("salary"),
        total_salary=Sum("salary"),
        avg_hours=Avg("work_hours_per_week"),
    )

    since_30 = date.today() - timedelta(days=30)
    since_90 = date.today() - timedelta(days=90)

    raw_trend = list(_monthly_trend(qs, "created_at"))
    monthly = [
        {"month": r["month"].strftime("%Y-%m"), "count": r["count"]}
        for r in raw_trend
    ]

    teachers_with_assignments = (
        TeacherAssignment.objects
        .filter(status="active")
        .values("teacher")
        .distinct()
        .count()
    )
    total_active_assignments = TeacherAssignment.objects.filter(status="active").count()
    avg_assignments = round(total_active_assignments / active, 2) if active else 0

    return {
        "total_teachers": total,
        "active_teachers": active,
        "inactive_teachers": by_status.get("inactive", 0),
        "on_leave": by_status.get("on_leave", 0),
        "suspended": by_status.get("suspended", 0),
        "active_percentage": _safe_percentage(active, total),
        "by_gender": by_gender,
        "by_education_level": by_edu,
        "by_status": by_status,
        "avg_work_hours_per_week": round(float(salary_agg["avg_hours"] or 0), 2),
        "avg_salary": round(float(salary_agg["avg_salary"] or 0), 2),
        "total_salary_budget": round(float(salary_agg["total_salary"] or 0), 2),
        "new_hires_last_30_days": qs.filter(hire_date__gte=since_30).count(),
        "new_hires_last_90_days": qs.filter(hire_date__gte=since_90).count(),
        "monthly_hire_trend": monthly,
        "teachers_with_assignments": teachers_with_assignments,
        "avg_assignments_per_teacher": avg_assignments,
    }


def get_teacher_details() -> list[dict]:
    Teacher, TeacherAssignment, _ = _teacher_models()
    result = []
    for t in Teacher.objects.prefetch_related("specializations", "assignments"):
        result.append({
            "id": t.id,
            "full_name": t.full_name,
            "email": t.email,
            "phone_number": t.phone_number,
            "gender": t.gender,
            "status": t.status,
            "education_level": t.education_level,
            "work_hours_per_week": float(t.work_hours_per_week),
            "salary": t.salary,
            "hire_date": t.hire_date,
            "age": t.age,
            "total_specializations": t.specializations.count(),
            "active_assignments": t.assignments.filter(status="active").count(),
            "created_at": t.created_at,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# TEACHER ASSIGNMENT analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_teacher_assignment_analytics() -> dict:
    _, TeacherAssignment, _ = _teacher_models()

    qs = TeacherAssignment.objects.all()
    total = qs.count()

    by_status = dict(
        qs.values_list("status").annotate(c=Count("id")).values_list("status", "c")
    )

    per_teacher = list(
        qs.values("teacher__first_name", "teacher__last_name")
        .annotate(count=Count("id"))
        .order_by("-count")
        .values("teacher__first_name", "teacher__last_name", "count")
    )
    # Convert to full name
    for item in per_teacher:
        item["teacher"] = f"{item.pop('teacher__first_name', '')} {item.pop('teacher__last_name', '')}".strip()
    
    per_subject = list(
        qs.values("subject__name")
        .annotate(count=Count("id"))
        .order_by("-count")
        .values("subject__name", "count")
    )
    per_cl = list(
        qs.values("class_level__name")
        .annotate(count=Count("id"))
        .order_by("-count")
        .values("class_level__name", "count")
    )

    return {
        "total_assignments": total,
        "active_assignments": by_status.get("active", 0),
        "inactive_assignments": by_status.get("inactive", 0),
        "completed_assignments": by_status.get("completed", 0),
        "assignments_per_teacher": per_teacher,
        "assignments_per_subject": per_subject,
        "assignments_per_class_level": per_cl,
        "assignments_by_status": by_status,
    }


def get_teacher_assignment_details() -> list[dict]:
    _, TeacherAssignment, _ = _teacher_models()
    result = []
    for a in TeacherAssignment.objects.select_related(
        "teacher", "subject", "class_level", "school_level", "academic_year", "term"
    ):
        result.append({
            "id": a.id,
            "teacher": a.teacher.full_name,
            "subject": a.subject.name,
            "class_level": a.class_level.name,
            "school_level": a.school_level.name,
            "academic_year": a.academic_year.name,
            "term": a.term.name,
            "status": a.status,
            "required_hours_per_week": a.required_hours_per_week,
            "teaching_frequency": a.teaching_frequency,
            "assigned_at": a.assigned_at,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# GRADE UPLOAD analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_grade_upload_analytics() -> dict:
    GradeUpload, StudentGrade, *_ = _records_models()

    qs = GradeUpload.objects.all()
    total = qs.count()

    by_status = dict(
        qs.values_list("status").annotate(c=Count("id")).values_list("status", "c")
    )
    by_type = dict(
        qs.values_list("grade_type").annotate(c=Count("id")).values_list("grade_type", "c")
    )

    per_teacher = list(
        qs.values("teacher__first_name", "teacher__last_name")
        .annotate(count=Count("id"))
        .order_by("-count")
        .values("teacher__first_name", "teacher__last_name", "count")
    )
    for item in per_teacher:
        item["teacher"] = f"{item.pop('teacher__first_name', '')} {item.pop('teacher__last_name', '')}".strip()

    per_subject = list(
        qs.values("subject__name")
        .annotate(count=Count("id"))
        .order_by("-count")
        .values("subject__name", "count")
    )

    approved = by_status.get("approved", 0)
    approval_rate = _safe_percentage(approved, total)

    total_grades = StudentGrade.objects.count()
    published = StudentGrade.objects.filter(is_published=True).count()

    return {
        "total_uploads": total,
        "pending_uploads": by_status.get("pending", 0),
        "approved_uploads": approved,
        "rejected_uploads": by_status.get("rejected", 0),
        "needs_review_uploads": by_status.get("needs_review", 0),
        "by_grade_type": by_type,
        "by_status": by_status,
        "uploads_per_teacher": per_teacher,
        "uploads_per_subject": per_subject,
        "approval_rate": approval_rate,
        "total_student_grades": total_grades,
        "published_grades": published,
        "unpublished_grades": total_grades - published,
    }


def get_grade_upload_details() -> list[dict]:
    GradeUpload, StudentGrade, *_ = _records_models()
    result = []
    for g in GradeUpload.objects.select_related(
        "teacher", "subject", "class_level", "academic_year", "term"
    ):
        result.append({
            "id": g.id,
            "teacher": g.teacher.full_name,
            "subject": g.subject.name,
            "class_level": g.class_level.name,
            "academic_year": g.academic_year.name,
            "term": g.term.name if g.term else None,
            "grade_type": g.grade_type,
            "weight_percentage": g.weight_percentage,
            "max_score_possible": g.max_score_possible,
            "status": g.status,
            "assessment_date": g.assessment_date,
            "total_student_grades": g.student_grades.count(),
            "created_at": g.created_at,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# ATTENDANCE analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_attendance_analytics() -> dict:
    _, _, AttendanceSession, StudentAttendance = _records_models()

    sessions = AttendanceSession.objects.all()
    total_sessions = sessions.count()
    submitted = sessions.filter(is_submitted=True).count()

    records = StudentAttendance.objects.all()
    total_records = records.count()

    by_status = dict(
        records.values_list("status").annotate(c=Count("id")).values_list("status", "c")
    )
    present = by_status.get("present", 0)
    absent = by_status.get("absent", 0)

    per_teacher = list(
        sessions.values("teacher__first_name", "teacher__last_name")
        .annotate(count=Count("id"))
        .order_by("-count")
        .values("teacher__first_name", "teacher__last_name", "count")
    )
    for item in per_teacher:
        item["teacher"] = f"{item.pop('teacher__first_name', '')} {item.pop('teacher__last_name', '')}".strip()

    per_subject = list(
        sessions.values("subject__name")
        .annotate(count=Count("id"))
        .order_by("-count")
        .values("subject__name", "count")
    )

    # Monthly trend
    raw_trend = list(_monthly_trend(sessions, "session_date"))
    monthly = [
        {"month": r["month"].strftime("%Y-%m"), "count": r["count"]}
        for r in raw_trend if r["month"]
    ]

    # Students with < 75% attendance rate
    LOW_THRESHOLD = 0.75
    student_sessions = (
        records.values("student")
        .annotate(
            total=Count("id"),
            present=Count("id", filter=Q(status="present"))
        )
    )
    low_attendance = sum(
        1 for r in student_sessions
        if r["total"] > 0 and (r["present"] / r["total"]) < LOW_THRESHOLD
    )

    return {
        "total_sessions": total_sessions,
        "submitted_sessions": submitted,
        "pending_sessions": total_sessions - submitted,
        "total_records": total_records,
        "present_records": present,
        "absent_records": absent,
        "late_records": by_status.get("late", 0),
        "excused_records": by_status.get("excused", 0),
        "overall_attendance_rate": _safe_percentage(present, total_records),
        "overall_absence_rate": _safe_percentage(absent, total_records),
        "sessions_per_teacher": per_teacher,
        "sessions_per_subject": per_subject,
        "monthly_attendance_trend": monthly,
        "students_with_low_attendance": low_attendance,
    }


def get_attendance_session_details() -> list[dict]:
    _, _, AttendanceSession, StudentAttendance = _records_models()
    result = []
    for s in AttendanceSession.objects.select_related(
        "teacher", "subject", "class_level", "academic_year", "term"
    ):
        records = s.records.all()
        total = records.count()
        by_status = dict(
            records.values_list("status")
            .annotate(c=Count("id"))
            .values_list("status", "c")
        )
        present = by_status.get("present", 0)
        result.append({
            "id": s.id,
            "teacher": s.teacher.full_name,
            "subject": s.subject.name,
            "class_level": s.class_level.name,
            "academic_year": s.academic_year.name,
            "term": s.term.name if s.term else None,
            "session_date": s.session_date,
            "is_submitted": s.is_submitted,
            "total_records": total,
            "present_count": present,
            "absent_count": by_status.get("absent", 0),
            "late_count": by_status.get("late", 0),
            "excused_count": by_status.get("excused", 0),
            "attendance_rate": _safe_percentage(present, total),
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# PAYMENT analytics
# ─────────────────────────────────────────────────────────────────────────────

def get_payment_analytics() -> dict:
    StudentPaymentAssignment, PaymentTransaction = _payment_models()

    qs = StudentPaymentAssignment.objects.all()
    total = qs.count()

    by_status = dict(
        qs.values_list("status").annotate(c=Count("id")).values_list("status", "c")
    )

    agg = qs.aggregate(
        total_expected=Coalesce(Sum("total_amount"), Decimal("0")),
        total_collected=Coalesce(Sum("paid_amount"), Decimal("0")),
        total_outstanding=Coalesce(Sum("remaining_amount"), Decimal("0")),
    )
    total_expected = float(agg["total_expected"])
    total_collected = float(agg["total_collected"])

    today = date.today()
    overdue_qs = qs.filter(remaining_amount__gt=0, payment_due_date__lt=today)
    overdue_count = overdue_qs.count()
    overdue_amount = float(
        overdue_qs.aggregate(t=Coalesce(Sum("remaining_amount"), Decimal("0")))["t"]
    )

    per_year = list(
        qs.values("academic_year__name")
        .annotate(
            expected=Sum("total_amount"),
            collected=Sum("paid_amount")
        )
        .values("academic_year__name", "expected", "collected")
    )

    # Convert Decimal to float
    for item in per_year:
        item["expected"] = float(item["expected"] or 0)
        item["collected"] = float(item["collected"] or 0)

    raw_trend = list(
        PaymentTransaction.objects
        .filter(transaction_status="completed", paid_at__isnull=False)
        .annotate(month=TruncMonth("paid_at"))
        .values("month")
        .annotate(total=Sum("amount"))
        .order_by("month")
        .values("month", "total")
    )
    monthly_trend = [
        {"month": r["month"].strftime("%Y-%m"), "total": float(r["total"] or 0)}
        for r in raw_trend if r["month"]
    ]

    return {
        "total_assignments": total,
        "by_status": by_status,
        "total_expected_revenue": total_expected,
        "total_collected_revenue": total_collected,
        "total_outstanding": float(agg["total_outstanding"]),
        "collection_rate": _safe_percentage(total_collected, total_expected),
        "overdue_count": overdue_count,
        "overdue_amount": overdue_amount,
        "completed_payments": by_status.get("completed", 0),
        "partially_paid": by_status.get("partially_paid", 0),
        "waiting_payments": by_status.get("waiting", 0),
        "revenue_per_academic_year": per_year,
        "monthly_collection_trend": monthly_trend,
    }


def get_payment_assignment_details() -> list[dict]:
    StudentPaymentAssignment, _ = _payment_models()
    today = date.today()
    result = []
    for p in StudentPaymentAssignment.objects.select_related(
        "student", "class_level_cost", "academic_year"
    ):
        result.append({
            "id": p.id,
            "student": p.student.full_name,
            "fee_structure": p.class_level_cost.name,
            "academic_year": p.academic_year.name,
            "total_amount": float(p.total_amount),
            "paid_amount": float(p.paid_amount),
            "remaining_amount": float(p.remaining_amount),
            "status": p.status,
            "payment_start_date": p.payment_start_date,
            "payment_due_date": p.payment_due_date,
            "is_overdue": p.is_overdue,
            "created_at": p.created_at,
        })
    return result


# ─────────────────────────────────────────────────────────────────────────────
# OVERALL DASHBOARD OVERVIEW
# ─────────────────────────────────────────────────────────────────────────────

def get_dashboard_overview() -> dict:
    """
    Single call that aggregates top-level KPIs for the main dashboard.
    Designed to power charts, counters, and sparklines on the frontend.
    """
    User = _user_model()
    AcademicYear, Term, SchoolLevel, ClassLevel, ClassRoom, Subject, _ = _academic_models()
    Student, Parent, _ = _student_models()
    Teacher, TeacherAssignment, _ = _teacher_models()
    GradeUpload, StudentGrade, AttendanceSession, StudentAttendance = _records_models()
    StudentPaymentAssignment, _ = _payment_models()

    # ── Users ──────────────────────────────────────────────────────────────
    total_users = User.objects.count()
    users_by_role = dict(
        User.objects.values_list("role").annotate(c=Count("id")).values_list("role", "c")
    )

    # ── Students ──────────────────────────────────────────────────────────
    total_students = Student.objects.count()
    active_students = Student.objects.filter(status="active").count()

    # ── Teachers ──────────────────────────────────────────────────────────
    total_teachers = Teacher.objects.count()
    active_teachers = Teacher.objects.filter(status="active").count()

    # ── Parents ───────────────────────────────────────────────────────────
    total_parents = Parent.objects.count()

    # ── Academics ────────────────────────────────────────────────────────
    current_year = AcademicYear.objects.filter(is_current=True).first()
    current_term = Term.objects.filter(is_current=True).first()

    # ── Class Levels & Subjects ──────────────────────────────────────────
    total_class_levels = ClassLevel.objects.count()
    total_subjects = Subject.objects.count()
    total_classrooms = ClassRoom.objects.count()
    total_school_levels = SchoolLevel.objects.count()

    # ── Assignments ──────────────────────────────────────────────────────
    total_assignments = TeacherAssignment.objects.count()
    active_assignments = TeacherAssignment.objects.filter(status="active").count()

    # ── Grades ───────────────────────────────────────────────────────────
    total_uploads = GradeUpload.objects.count()
    grade_status_dist = dict(
        GradeUpload.objects.values_list("status").annotate(c=Count("id")).values_list("status", "c")
    )
    total_student_grades = StudentGrade.objects.count()
    published_grades = StudentGrade.objects.filter(is_published=True).count()

    # ── Attendance ───────────────────────────────────────────────────────
    total_sessions = AttendanceSession.objects.count()
    attendance_summary = dict(
        StudentAttendance.objects.values_list("status").annotate(c=Count("id")).values_list("status", "c")
    )
    total_att_records = sum(attendance_summary.values())
    present = attendance_summary.get("present", 0)
    overall_att_rate = _safe_percentage(present, total_att_records)

    # ── Payments ─────────────────────────────────────────────────────────
    pay_agg = StudentPaymentAssignment.objects.aggregate(
        expected=Coalesce(Sum("total_amount"), Decimal("0")),
        collected=Coalesce(Sum("paid_amount"), Decimal("0")),
    )
    total_expected = float(pay_agg["expected"])
    total_collected = float(pay_agg["collected"])
    collection_rate = _safe_percentage(total_collected, total_expected)
    today = date.today()
    overdue_payments = StudentPaymentAssignment.objects.filter(
        remaining_amount__gt=0, payment_due_date__lt=today
    ).count()
    payment_status_dist = dict(
        StudentPaymentAssignment.objects.values_list("status")
        .annotate(c=Count("id")).values_list("status", "c")
    )

    # ── Chat ─────────────────────────────────────────────────────────────
    try:
        ChatRoom, Message = _chat_models()
        total_chatrooms = ChatRoom.objects.count()
        total_messages = Message.objects.count()
    except Exception:
        total_chatrooms = 0
        total_messages = 0

    # ── Trends ───────────────────────────────────────────────────────────
    students_by_sl = list(
        Student.objects.filter(current_school_level__isnull=False)
        .values("current_school_level__name")
        .annotate(count=Count("id"))
        .values("current_school_level__name", "count")
    )

    raw_enroll = list(_monthly_trend(Student.objects.all(), "created_at"))
    monthly_enrollment = [
        {"month": r["month"].strftime("%Y-%m"), "count": r["count"]}
        for r in raw_enroll
    ]

    from payments.models import PaymentTransaction
    raw_col = list(
        PaymentTransaction.objects
        .filter(transaction_status="completed", paid_at__isnull=False)
        .annotate(month=TruncMonth("paid_at"))
        .values("month")
        .annotate(total=Sum("amount"))
        .order_by("month")
        .values("month", "total")
    )
    monthly_collection = [
        {"month": r["month"].strftime("%Y-%m"), "total": float(r["total"] or 0)}
        for r in raw_col if r["month"]
    ]

    return {
        # counts
        "total_users": total_users,
        "total_students": total_students,
        "active_students": active_students,
        "total_teachers": total_teachers,
        "active_teachers": active_teachers,
        "total_parents": total_parents,
        # academics
        "current_academic_year": current_year.name if current_year else None,
        "current_term": str(current_term) if current_term else None,
        "total_school_levels": total_school_levels,
        "total_class_levels": total_class_levels,
        "total_classrooms": total_classrooms,
        "total_subjects": total_subjects,
        # assignments & grades
        "total_teacher_assignments": total_assignments,
        "active_teacher_assignments": active_assignments,
        "total_grade_uploads": total_uploads,
        "pending_grade_uploads": grade_status_dist.get("pending", 0),
        "approved_grade_uploads": grade_status_dist.get("approved", 0),
        "total_student_grades": total_student_grades,
        "published_grades": published_grades,
        # attendance
        "total_attendance_sessions": total_sessions,
        "overall_attendance_rate": overall_att_rate,
        # payments
        "total_expected_revenue": total_expected,
        "total_collected_revenue": total_collected,
        "collection_rate": collection_rate,
        "overdue_payments": overdue_payments,
        # chat
        "total_chatrooms": total_chatrooms,
        "total_messages": total_messages,
        # distributions (for charts)
        "students_by_school_level": students_by_sl,
        "users_by_role": users_by_role,
        "payment_status_distribution": payment_status_dist,
        "grade_status_distribution": grade_status_dist,
        "attendance_summary": attendance_summary,
        "monthly_enrollment_trend": monthly_enrollment,
        "monthly_collection_trend": monthly_collection,
    }
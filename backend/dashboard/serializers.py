"""
dashboard/serializers.py

Read-only serializers for the dashboard app.
Each serializer targets a specific model and returns both raw field data
and computed analytics so the frontend can build professional graphs and
detailed report tables from a single API call.
"""

from rest_framework import serializers
from decimal import Decimal


# ---------------------------------------------------------------------------
# Shared helpers
# ---------------------------------------------------------------------------

class PercentageField(serializers.FloatField):
    """Round to 2 dp and never return NaN / Inf."""

    def to_representation(self, value):
        try:
            return round(float(value), 2)
        except (TypeError, ValueError):
            return 0.0


# ===========================================================================
# accounts / User
# ===========================================================================

class UserDetailSerializer(serializers.Serializer):
    """Row-level detail returned in /dashboard/users/ report."""

    id = serializers.IntegerField()
    username = serializers.CharField()
    email = serializers.EmailField(allow_null=True)
    role = serializers.CharField()
    status = serializers.CharField()
    language = serializers.CharField()
    is_staff = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    last_logged_in = serializers.DateTimeField(allow_null=True)


class UserAnalyticsSerializer(serializers.Serializer):
    """Aggregate computations for users."""

    total_users = serializers.IntegerField()

    # By role
    by_role = serializers.DictField(child=serializers.IntegerField())

    # By status
    by_status = serializers.DictField(child=serializers.IntegerField())

    # Active percentage
    active_percentage = PercentageField()

    # Staff count
    total_staff = serializers.IntegerField()

    # New users in last 30 days
    new_last_30_days = serializers.IntegerField()

    # Language distribution
    by_language = serializers.DictField(child=serializers.IntegerField())

    # Monthly registration trend (last 12 months) – list of {month, count}
    monthly_registrations = serializers.ListField(child=serializers.DictField())


class UserReportSerializer(serializers.Serializer):
    users = UserDetailSerializer(many=True)
    analytics = UserAnalyticsSerializer()


# ===========================================================================
# academics / AcademicYear
# ===========================================================================

class AcademicYearDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    is_current = serializers.BooleanField()
    created_at = serializers.DateTimeField()
    total_terms = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_teacher_assignments = serializers.IntegerField()


class AcademicYearAnalyticsSerializer(serializers.Serializer):
    total_academic_years = serializers.IntegerField()
    current_year_name = serializers.CharField(allow_null=True)
    total_terms_current_year = serializers.IntegerField()
    avg_terms_per_year = PercentageField()
    years_list = serializers.ListField(child=serializers.DictField())


class AcademicYearReportSerializer(serializers.Serializer):
    academic_years = AcademicYearDetailSerializer(many=True)
    analytics = AcademicYearAnalyticsSerializer()


# ===========================================================================
# academics / Term
# ===========================================================================

class TermDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    academic_year = serializers.CharField()
    term_number = serializers.IntegerField()
    start_date = serializers.DateField()
    end_date = serializers.DateField()
    is_current = serializers.BooleanField()
    duration_days = serializers.IntegerField()


class TermAnalyticsSerializer(serializers.Serializer):
    total_terms = serializers.IntegerField()
    current_term_name = serializers.CharField(allow_null=True)
    avg_duration_days = PercentageField()
    terms_per_year = serializers.ListField(child=serializers.DictField())


class TermReportSerializer(serializers.Serializer):
    terms = TermDetailSerializer(many=True)
    analytics = TermAnalyticsSerializer()


# ===========================================================================
# academics / SchoolLevel
# ===========================================================================

class SchoolLevelDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    description = serializers.CharField()
    is_active = serializers.BooleanField()
    start_time = serializers.TimeField(allow_null=True)
    end_time = serializers.TimeField(allow_null=True)
    net_teaching_minutes_per_day = serializers.IntegerField()
    total_class_levels = serializers.IntegerField()
    total_active_class_levels = serializers.IntegerField()
    total_students = serializers.IntegerField()
    total_breaks = serializers.IntegerField()


class SchoolLevelAnalyticsSerializer(serializers.Serializer):
    total_school_levels = serializers.IntegerField()
    active_school_levels = serializers.IntegerField()
    inactive_school_levels = serializers.IntegerField()
    total_students_across_levels = serializers.IntegerField()
    students_per_level = serializers.ListField(child=serializers.DictField())
    class_levels_per_school_level = serializers.ListField(child=serializers.DictField())


class SchoolLevelReportSerializer(serializers.Serializer):
    school_levels = SchoolLevelDetailSerializer(many=True)
    analytics = SchoolLevelAnalyticsSerializer()


# ===========================================================================
# academics / ClassLevel
# ===========================================================================

class ClassLevelDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    code = serializers.CharField()
    school_level = serializers.CharField()
    is_active = serializers.BooleanField()
    total_subjects = serializers.IntegerField()
    compulsory_subjects = serializers.IntegerField()
    total_classrooms = serializers.IntegerField()
    total_students = serializers.IntegerField()
    weekly_teaching_hours = serializers.FloatField()


class ClassLevelAnalyticsSerializer(serializers.Serializer):
    total_class_levels = serializers.IntegerField()
    active_class_levels = serializers.IntegerField()
    inactive_class_levels = serializers.IntegerField()
    total_subject_assignments = serializers.IntegerField()
    avg_subjects_per_class = PercentageField()
    students_per_class_level = serializers.ListField(child=serializers.DictField())
    subjects_per_class_level = serializers.ListField(child=serializers.DictField())


class ClassLevelReportSerializer(serializers.Serializer):
    class_levels = ClassLevelDetailSerializer(many=True)
    analytics = ClassLevelAnalyticsSerializer()


# ===========================================================================
# academics / ClassRoom
# ===========================================================================

class ClassRoomDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    code = serializers.CharField()
    room_type = serializers.CharField()
    capacity = serializers.IntegerField()
    status = serializers.CharField()
    assigned_class_level = serializers.CharField(allow_null=True)
    created_at = serializers.DateTimeField()


class ClassRoomAnalyticsSerializer(serializers.Serializer):
    total_classrooms = serializers.IntegerField()
    active_classrooms = serializers.IntegerField()
    inactive_classrooms = serializers.IntegerField()
    assigned_classrooms = serializers.IntegerField()
    unassigned_classrooms = serializers.IntegerField()
    total_capacity = serializers.IntegerField()
    avg_capacity = PercentageField()
    by_room_type = serializers.DictField(child=serializers.IntegerField())
    utilization_rate = PercentageField()


class ClassRoomReportSerializer(serializers.Serializer):
    classrooms = ClassRoomDetailSerializer(many=True)
    analytics = ClassRoomAnalyticsSerializer()


# ===========================================================================
# academics / Subject
# ===========================================================================

class SubjectDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    name = serializers.CharField()
    code = serializers.CharField()
    pass_mark = serializers.DecimalField(max_digits=5, decimal_places=2)
    status = serializers.CharField()
    description = serializers.CharField()
    total_class_levels = serializers.IntegerField()
    total_teachers = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class SubjectAnalyticsSerializer(serializers.Serializer):
    total_subjects = serializers.IntegerField()
    active_subjects = serializers.IntegerField()
    inactive_subjects = serializers.IntegerField()
    avg_pass_mark = PercentageField()
    subjects_by_class_level_count = serializers.ListField(child=serializers.DictField())
    most_assigned_subjects = serializers.ListField(child=serializers.DictField())


class SubjectReportSerializer(serializers.Serializer):
    subjects = SubjectDetailSerializer(many=True)
    analytics = SubjectAnalyticsSerializer()


# ===========================================================================
# students / Student
# ===========================================================================

class StudentDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    roll_number = serializers.CharField()
    email = serializers.EmailField(allow_null=True)
    phone_number = serializers.CharField(allow_null=True)
    birth_date = serializers.DateField(allow_null=True)
    age = serializers.IntegerField(allow_null=True)
    status = serializers.CharField()
    enrollment_date = serializers.DateField()
    current_academic_year = serializers.CharField(allow_null=True)
    current_school_level = serializers.CharField(allow_null=True)
    current_class_level = serializers.CharField(allow_null=True)
    total_parents = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class StudentAnalyticsSerializer(serializers.Serializer):
    total_students = serializers.IntegerField()
    active_students = serializers.IntegerField()
    inactive_students = serializers.IntegerField()
    transferred_students = serializers.IntegerField()
    graduated_students = serializers.IntegerField()
    active_percentage = PercentageField()

    students_per_class_level = serializers.ListField(child=serializers.DictField())
    students_per_school_level = serializers.ListField(child=serializers.DictField())
    students_per_academic_year = serializers.ListField(child=serializers.DictField())

    new_enrollments_last_30_days = serializers.IntegerField()
    new_enrollments_last_90_days = serializers.IntegerField()
    monthly_enrollment_trend = serializers.ListField(child=serializers.DictField())

    avg_age = PercentageField()
    students_with_parents = serializers.IntegerField()
    students_without_parents = serializers.IntegerField()


class StudentReportSerializer(serializers.Serializer):
    students = StudentDetailSerializer(many=True)
    analytics = StudentAnalyticsSerializer()


# ===========================================================================
# students / Parent
# ===========================================================================

class ParentDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    phone_number = serializers.CharField()
    email = serializers.EmailField()
    relationship_type = serializers.CharField()
    status = serializers.CharField()
    total_children = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class ParentAnalyticsSerializer(serializers.Serializer):
    total_parents = serializers.IntegerField()
    active_parents = serializers.IntegerField()
    inactive_parents = serializers.IntegerField()
    by_relationship_type = serializers.DictField(child=serializers.IntegerField())
    parents_with_user_account = serializers.IntegerField()
    avg_children_per_parent = PercentageField()


class ParentReportSerializer(serializers.Serializer):
    parents = ParentDetailSerializer(many=True)
    analytics = ParentAnalyticsSerializer()


# ===========================================================================
# teachers / Teacher
# ===========================================================================

class TeacherDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    full_name = serializers.CharField()
    email = serializers.EmailField()
    phone_number = serializers.CharField()
    gender = serializers.CharField()
    status = serializers.CharField()
    education_level = serializers.CharField()
    work_hours_per_week = serializers.FloatField()
    salary = serializers.DecimalField(max_digits=12, decimal_places=2)
    hire_date = serializers.DateField()
    age = serializers.IntegerField(allow_null=True)
    total_specializations = serializers.IntegerField()
    active_assignments = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class TeacherAnalyticsSerializer(serializers.Serializer):
    total_teachers = serializers.IntegerField()
    active_teachers = serializers.IntegerField()
    inactive_teachers = serializers.IntegerField()
    on_leave = serializers.IntegerField()
    suspended = serializers.IntegerField()
    active_percentage = PercentageField()

    by_gender = serializers.DictField(child=serializers.IntegerField())
    by_education_level = serializers.DictField(child=serializers.IntegerField())
    by_status = serializers.DictField(child=serializers.IntegerField())

    avg_work_hours_per_week = PercentageField()
    avg_salary = PercentageField()
    total_salary_budget = serializers.FloatField()

    new_hires_last_30_days = serializers.IntegerField()
    new_hires_last_90_days = serializers.IntegerField()
    monthly_hire_trend = serializers.ListField(child=serializers.DictField())

    teachers_with_assignments = serializers.IntegerField()
    avg_assignments_per_teacher = PercentageField()


class TeacherReportSerializer(serializers.Serializer):
    teachers = TeacherDetailSerializer(many=True)
    analytics = TeacherAnalyticsSerializer()


# ===========================================================================
# teachers / TeacherAssignment
# ===========================================================================

class TeacherAssignmentDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    teacher = serializers.CharField()
    subject = serializers.CharField()
    class_level = serializers.CharField()
    school_level = serializers.CharField()
    academic_year = serializers.CharField()
    term = serializers.CharField()
    status = serializers.CharField()
    required_hours_per_week = serializers.FloatField()
    teaching_frequency = serializers.CharField()
    assigned_at = serializers.DateTimeField()


class TeacherAssignmentAnalyticsSerializer(serializers.Serializer):
    total_assignments = serializers.IntegerField()
    active_assignments = serializers.IntegerField()
    inactive_assignments = serializers.IntegerField()
    completed_assignments = serializers.IntegerField()

    assignments_per_teacher = serializers.ListField(child=serializers.DictField())
    assignments_per_subject = serializers.ListField(child=serializers.DictField())
    assignments_per_class_level = serializers.ListField(child=serializers.DictField())
    assignments_by_status = serializers.DictField(child=serializers.IntegerField())


class TeacherAssignmentReportSerializer(serializers.Serializer):
    assignments = TeacherAssignmentDetailSerializer(many=True)
    analytics = TeacherAssignmentAnalyticsSerializer()


# ===========================================================================
# academics_records / GradeUpload
# ===========================================================================

class GradeUploadDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    teacher = serializers.CharField()
    subject = serializers.CharField()
    class_level = serializers.CharField()
    academic_year = serializers.CharField()
    term = serializers.CharField(allow_null=True)
    grade_type = serializers.CharField()
    weight_percentage = serializers.DecimalField(max_digits=5, decimal_places=2)
    max_score_possible = serializers.DecimalField(max_digits=6, decimal_places=2)
    status = serializers.CharField()
    assessment_date = serializers.DateField(allow_null=True)
    total_student_grades = serializers.IntegerField()
    created_at = serializers.DateTimeField()


class GradeUploadAnalyticsSerializer(serializers.Serializer):
    total_uploads = serializers.IntegerField()
    pending_uploads = serializers.IntegerField()
    approved_uploads = serializers.IntegerField()
    rejected_uploads = serializers.IntegerField()
    needs_review_uploads = serializers.IntegerField()

    by_grade_type = serializers.DictField(child=serializers.IntegerField())
    by_status = serializers.DictField(child=serializers.IntegerField())

    uploads_per_teacher = serializers.ListField(child=serializers.DictField())
    uploads_per_subject = serializers.ListField(child=serializers.DictField())
    approval_rate = PercentageField()

    total_student_grades = serializers.IntegerField()
    published_grades = serializers.IntegerField()
    unpublished_grades = serializers.IntegerField()


class GradeUploadReportSerializer(serializers.Serializer):
    grade_uploads = GradeUploadDetailSerializer(many=True)
    analytics = GradeUploadAnalyticsSerializer()


# ===========================================================================
# academics_records / AttendanceSession
# ===========================================================================

class AttendanceSessionDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    teacher = serializers.CharField()
    subject = serializers.CharField()
    class_level = serializers.CharField()
    academic_year = serializers.CharField()
    term = serializers.CharField(allow_null=True)
    session_date = serializers.DateField()
    is_submitted = serializers.BooleanField()
    total_records = serializers.IntegerField()
    present_count = serializers.IntegerField()
    absent_count = serializers.IntegerField()
    late_count = serializers.IntegerField()
    excused_count = serializers.IntegerField()
    attendance_rate = PercentageField()


class AttendanceAnalyticsSerializer(serializers.Serializer):
    total_sessions = serializers.IntegerField()
    submitted_sessions = serializers.IntegerField()
    pending_sessions = serializers.IntegerField()

    total_records = serializers.IntegerField()
    present_records = serializers.IntegerField()
    absent_records = serializers.IntegerField()
    late_records = serializers.IntegerField()
    excused_records = serializers.IntegerField()

    overall_attendance_rate = PercentageField()
    overall_absence_rate = PercentageField()

    sessions_per_teacher = serializers.ListField(child=serializers.DictField())
    sessions_per_subject = serializers.ListField(child=serializers.DictField())
    monthly_attendance_trend = serializers.ListField(child=serializers.DictField())
    students_with_low_attendance = serializers.IntegerField()


class AttendanceReportSerializer(serializers.Serializer):
    sessions = AttendanceSessionDetailSerializer(many=True)
    analytics = AttendanceAnalyticsSerializer()


# ===========================================================================
# payments / StudentPaymentAssignment
# ===========================================================================

class PaymentAssignmentDetailSerializer(serializers.Serializer):
    id = serializers.IntegerField()
    student = serializers.CharField()
    fee_structure = serializers.CharField()
    academic_year = serializers.CharField()
    total_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    paid_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    remaining_amount = serializers.DecimalField(max_digits=12, decimal_places=2)
    status = serializers.CharField()
    payment_start_date = serializers.DateField()
    payment_due_date = serializers.DateField()
    is_overdue = serializers.BooleanField()
    created_at = serializers.DateTimeField()


class PaymentAnalyticsSerializer(serializers.Serializer):
    total_assignments = serializers.IntegerField()
    by_status = serializers.DictField(child=serializers.IntegerField())

    total_expected_revenue = serializers.FloatField()
    total_collected_revenue = serializers.FloatField()
    total_outstanding = serializers.FloatField()
    collection_rate = PercentageField()

    overdue_count = serializers.IntegerField()
    overdue_amount = serializers.FloatField()

    completed_payments = serializers.IntegerField()
    partially_paid = serializers.IntegerField()
    waiting_payments = serializers.IntegerField()

    revenue_per_academic_year = serializers.ListField(child=serializers.DictField())
    monthly_collection_trend = serializers.ListField(child=serializers.DictField())


class PaymentReportSerializer(serializers.Serializer):
    payment_assignments = PaymentAssignmentDetailSerializer(many=True)
    analytics = PaymentAnalyticsSerializer()


# ===========================================================================
# Overall Dashboard (summary of everything)
# ===========================================================================

class DashboardOverviewSerializer(serializers.Serializer):
    """
    Returned by GET /dashboard/overview/
    Contains high-level KPIs per domain for the frontend dashboard.
    """

    # Counts
    total_users = serializers.IntegerField()
    total_students = serializers.IntegerField()
    active_students = serializers.IntegerField()
    total_teachers = serializers.IntegerField()
    active_teachers = serializers.IntegerField()
    total_parents = serializers.IntegerField()

    # Academics
    current_academic_year = serializers.CharField(allow_null=True)
    current_term = serializers.CharField(allow_null=True)
    total_school_levels = serializers.IntegerField()
    total_class_levels = serializers.IntegerField()
    total_classrooms = serializers.IntegerField()
    total_subjects = serializers.IntegerField()

    # Assignments & Grades
    total_teacher_assignments = serializers.IntegerField()
    active_teacher_assignments = serializers.IntegerField()
    total_grade_uploads = serializers.IntegerField()
    pending_grade_uploads = serializers.IntegerField()
    approved_grade_uploads = serializers.IntegerField()
    total_student_grades = serializers.IntegerField()
    published_grades = serializers.IntegerField()

    # Attendance
    total_attendance_sessions = serializers.IntegerField()
    overall_attendance_rate = PercentageField()

    # Payments
    total_expected_revenue = serializers.FloatField()
    total_collected_revenue = serializers.FloatField()
    collection_rate = PercentageField()
    overdue_payments = serializers.IntegerField()

    # Communication
    total_chatrooms = serializers.IntegerField()
    total_messages = serializers.IntegerField()

    # Trends (for sparklines / mini charts)
    students_by_school_level = serializers.ListField(child=serializers.DictField())
    users_by_role = serializers.DictField(child=serializers.IntegerField())
    payment_status_distribution = serializers.DictField(child=serializers.IntegerField())
    grade_status_distribution = serializers.DictField(child=serializers.IntegerField())
    attendance_summary = serializers.DictField(child=serializers.IntegerField())
    monthly_enrollment_trend = serializers.ListField(child=serializers.DictField())
    monthly_collection_trend = serializers.ListField(child=serializers.DictField())
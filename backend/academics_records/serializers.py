from rest_framework import serializers
from django.utils import timezone
from .models import (
    GradeUpload, StudentGrade,
    AttendanceSession, StudentAttendance,
    Assignment,
)


# ─────────────────────────────────────────────────────────────
#  GRADE SERIALIZERS
# ─────────────────────────────────────────────────────────────

class StudentGradeSerializer(serializers.ModelSerializer):
    student_name       = serializers.CharField(source='student.full_name',       read_only=True)
    student_roll       = serializers.CharField(source='student.roll_number',     read_only=True)
    subject_name       = serializers.CharField(source='subject.name',            read_only=True)
    class_level_name   = serializers.CharField(source='class_level.name',        read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name',      read_only=True)
    percentage         = serializers.ReadOnlyField()

    class Meta:
        model  = StudentGrade
        fields = [
            'id', 'student', 'student_name', 'student_roll',
            'score', 'max_score', 'grade_letter', 'remarks',
            'is_published', 'published_at', 'percentage',
            'subject_name', 'class_level_name', 'academic_year_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_published', 'published_at', 'created_at', 'updated_at']


class StudentGradeUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentGrade
        fields = ['score', 'max_score', 'grade_letter', 'remarks']


class GradeUploadSerializer(serializers.ModelSerializer):
    teacher_name       = serializers.CharField(source='teacher.full_name',         read_only=True)
    subject_name       = serializers.CharField(source='subject.name',              read_only=True)
    class_level_name   = serializers.CharField(source='class_level.name',          read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name',        read_only=True)
    reviewed_by_name   = serializers.CharField(source='reviewed_by.username',      read_only=True, default=None)
    grade_count        = serializers.SerializerMethodField()

    class Meta:
        model  = GradeUpload
        fields = [
            'id', 'teacher', 'teacher_name', 'academic_year', 'academic_year_name',
            'class_level', 'class_level_name', 'subject', 'subject_name',
            'excel_file', 'status', 'term',
            'reviewed_by', 'reviewed_by_name', 'reviewed_at',
            'rejection_reason', 'admin_notes',
            'uploaded_by', 'grade_count',
            'created_at', 'updated_at',
        ]
        read_only_fields = [
            'id', 'status', 'reviewed_by', 'reviewed_at',
            'rejection_reason', 'admin_notes', 'uploaded_by',
            'created_at', 'updated_at',
        ]

    def get_grade_count(self, obj):
        return obj.student_grades.count()


class GradeApprovalSerializer(serializers.Serializer):
    action          = serializers.ChoiceField(choices=['approve', 'reject'])
    rejection_reason = serializers.CharField(required=False, allow_blank=True)
    admin_notes     = serializers.CharField(required=False, allow_blank=True)


# ─────────────────────────────────────────────────────────────
#  ATTENDANCE SERIALIZERS
# ─────────────────────────────────────────────────────────────

class StudentAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name',   read_only=True)
    student_roll = serializers.CharField(source='student.roll_number', read_only=True)

    class Meta:
        model  = StudentAttendance
        fields = [
            'id', 'session', 'student', 'student_name', 'student_roll',
            'status', 'remarks',
            'discipline_score', 'discipline_zone',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'discipline_score', 'discipline_zone', 'created_at', 'updated_at']


class StudentAttendanceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = StudentAttendance
        fields = ['status', 'remarks']


class AttendanceSessionSerializer(serializers.ModelSerializer):
    teacher_name       = serializers.CharField(source='teacher.full_name',   read_only=True)
    subject_name       = serializers.CharField(source='subject.name',        read_only=True)
    class_level_name   = serializers.CharField(source='class_level.name',    read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name',  read_only=True)
    classroom_name     = serializers.CharField(source='classroom.name',      read_only=True, default=None)
    records            = StudentAttendanceSerializer(many=True, read_only=True)
    present_count      = serializers.SerializerMethodField()
    absent_count       = serializers.SerializerMethodField()
    late_count         = serializers.SerializerMethodField()

    class Meta:
        model  = AttendanceSession
        fields = [
            'id', 'teacher', 'teacher_name', 'class_level', 'class_level_name',
            'subject', 'subject_name', 'academic_year', 'academic_year_name',
            'classroom', 'classroom_name',
            'date', 'start_time', 'end_time', 'notes',
            'is_submitted', 'submitted_at',
            'present_count', 'absent_count', 'late_count',
            'records',
            'created_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'is_submitted', 'submitted_at', 'created_by', 'created_at', 'updated_at']

    def get_present_count(self, obj):
        return obj.records.filter(status='present').count()

    def get_absent_count(self, obj):
        return obj.records.filter(status='absent').count()

    def get_late_count(self, obj):
        return obj.records.filter(status='late').count()


class AttendanceSessionCreateSerializer(serializers.ModelSerializer):
    records = StudentAttendanceSerializer(many=True, write_only=True, required=False)

    class Meta:
        model  = AttendanceSession
        fields = [
            'id', 'teacher', 'class_level', 'subject', 'academic_year', 'classroom',
            'date', 'start_time', 'end_time', 'notes', 'records',
        ]
        read_only_fields = ['id']


# ─────────────────────────────────────────────────────────────
#  ASSIGNMENT SERIALIZERS
# ─────────────────────────────────────────────────────────────

class AssignmentSerializer(serializers.ModelSerializer):
    teacher_name       = serializers.CharField(source='teacher.full_name',   read_only=True)
    subject_name       = serializers.CharField(source='subject.name',        read_only=True)
    class_level_name   = serializers.CharField(source='class_level.name',    read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name',  read_only=True)
    school_level_name  = serializers.SerializerMethodField()
    is_overdue         = serializers.SerializerMethodField()

    class Meta:
        model  = Assignment
        fields = [
            'id', 'teacher', 'teacher_name',
            'class_level', 'class_level_name',
            'subject', 'subject_name',
            'academic_year', 'academic_year_name',
            'school_level_name',
            'title', 'description', 'instructions',
            'pdf_file', 'due_date', 'total_marks',
            'status', 'is_overdue',
            'uploaded_by', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']

    def get_school_level_name(self, obj):
        try:
            return obj.class_level.school_level.name
        except Exception:
            return None

    def get_is_overdue(self, obj):
        if obj.due_date:
            from datetime import date
            return date.today() > obj.due_date
        return False


class AssignmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model  = Assignment
        fields = ['title', 'description', 'instructions', 'due_date', 'total_marks', 'status']
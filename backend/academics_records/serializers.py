# academics_records/serializers.py

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
#  ATTENDANCE SERIALIZERS (CORRECT ORDER)
# ─────────────────────────────────────────────────────────────

# First: Basic serializers
class StudentAttendanceSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_roll = serializers.CharField(source='student.roll_number', read_only=True)

    class Meta:
        model = StudentAttendance
        fields = [
            'id', 'session', 'student', 'student_name', 'student_roll',
            'status', 'remarks', 'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class StudentAttendanceUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAttendance
        fields = ['status', 'remarks']


# Second: Detail serializer for nested records
class StudentAttendanceDetailSerializer(serializers.ModelSerializer):
    student_name = serializers.CharField(source='student.full_name', read_only=True)
    student_roll = serializers.CharField(source='student.roll_number', read_only=True)
    student_id = serializers.IntegerField(source='student.id', read_only=True)
    session_date = serializers.DateField(source='session.session_date', read_only=True)
    
    class Meta:
        model = StudentAttendance
        fields = [
            'id', 'student', 'student_id', 'student_name', 'student_roll',
            'status', 'remarks', 'session_date', 'created_at', 'updated_at'
        ]


# Third: Create serializer for individual records (used within CreateAttendanceSessionSerializer)
class AttendanceRecordCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAttendance
        fields = ['student', 'status', 'remarks']


# Fourth: Main session list serializer
class AttendanceSessionListSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True, default=None)
    
    present_count = serializers.SerializerMethodField()
    absent_count = serializers.SerializerMethodField()
    late_count = serializers.SerializerMethodField()
    excused_count = serializers.SerializerMethodField()
    records_count = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'teacher', 'teacher_name', 'academic_year', 'academic_year_name',
            'term', 'school_level', 'school_level_name', 'class_level', 'class_level_name',
            'subject', 'subject_name', 'classroom', 'classroom_name',
            'session_date', 'start_time', 'end_time', 'notes',
            'is_submitted', 'submitted_at', 'created_at',
            'present_count', 'absent_count', 'late_count', 'excused_count', 'records_count'
        ]
        read_only_fields = ['id', 'is_submitted', 'submitted_at', 'created_at']
    
    def get_present_count(self, obj):
        return obj.records.filter(status='present').count()
    
    def get_absent_count(self, obj):
        return obj.records.filter(status='absent').count()
    
    def get_late_count(self, obj):
        return obj.records.filter(status='late').count()
    
    def get_excused_count(self, obj):
        return obj.records.filter(status='excused').count()
    
    def get_records_count(self, obj):
        return obj.records.count()


# Fifth: Session detail serializer (with nested records)
class AttendanceSessionDetailSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True, default=None)
    records = serializers.SerializerMethodField()
    
    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'teacher', 'teacher_name', 'academic_year', 'academic_year_name',
            'term', 'school_level', 'school_level_name', 'class_level', 'class_level_name',
            'subject', 'subject_name', 'classroom', 'classroom_name',
            'session_date', 'start_time', 'end_time', 'notes',
            'is_submitted', 'submitted_at', 'created_at', 'records'
        ]
    
    def get_records(self, obj):
        records = obj.records.select_related('student').all()
        return StudentAttendanceDetailSerializer(records, many=True).data


# Sixth: Create session serializer (uses AttendanceRecordCreateSerializer)
class CreateAttendanceSessionSerializer(serializers.ModelSerializer):
    records = AttendanceRecordCreateSerializer(many=True, write_only=True)
    
    class Meta:
        model = AttendanceSession
        fields = [
            'academic_year', 'term', 'school_level', 'class_level',
            'subject', 'classroom', 'session_date', 'start_time',
            'end_time', 'notes', 'records'
        ]
    
    def create(self, validated_data):
        records_data = validated_data.pop('records')
        from .views import _get_teacher
        from rest_framework import status
        
        # Get teacher from request
        teacher, _ = _get_teacher(self.context['request'].user, 'en')
        validated_data['teacher'] = teacher
        validated_data['is_submitted'] = True
        validated_data['submitted_at'] = timezone.now()
        validated_data['created_by'] = self.context['request'].user
        
        session = AttendanceSession.objects.create(**validated_data)
        
        for record_data in records_data:
            StudentAttendance.objects.create(session=session, **record_data)
        
        return session


class AttendanceRecordUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = StudentAttendance
        fields = ['status', 'remarks']


# Keep the original AttendanceSessionSerializer for backward compatibility
class AttendanceSessionSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True, default=None)
    present_count = serializers.SerializerMethodField()
    absent_count = serializers.SerializerMethodField()
    late_count = serializers.SerializerMethodField()

    class Meta:
        model = AttendanceSession
        fields = [
            'id', 'teacher', 'teacher_name', 'class_level', 'class_level_name',
            'subject', 'subject_name', 'academic_year', 'academic_year_name',
            'classroom', 'classroom_name',
            'session_date', 'start_time', 'end_time', 'notes',
            'is_submitted', 'submitted_at',
            'present_count', 'absent_count', 'late_count',
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
        model = AttendanceSession
        fields = [
            'id', 'teacher', 'class_level', 'subject', 'academic_year', 'classroom',
            'session_date', 'start_time', 'end_time', 'notes', 'records',
        ]
        read_only_fields = ['id']


# ─────────────────────────────────────────────────────────────
#  ASSIGNMENT SERIALIZERS
# ─────────────────────────────────────────────────────────────

class AssignmentSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True, default=None)
    pdf_url = serializers.SerializerMethodField()
    is_overdue = serializers.SerializerMethodField()
    
    class Meta:
        model = Assignment
        fields = [
            'id', 'teacher', 'teacher_name', 'academic_year', 'academic_year_name',
            'term', 'school_level', 'school_level_name', 'class_level', 'class_level_name',
            'subject', 'subject_name', 'classroom', 'classroom_name',
            'title', 'description', 'instructions', 'pdf_file', 'pdf_url',
            'due_date', 'due_time', 'total_marks', 'status', 'is_overdue',
            'uploaded_by', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'uploaded_by', 'created_at', 'updated_at']
    
    def get_pdf_url(self, obj):
        if obj.pdf_file and hasattr(obj.pdf_file, 'url'):
            return obj.pdf_file.url
        return None
    
    def get_is_overdue(self, obj):
        from datetime import date
        if obj.due_date and obj.status == 'active':
            return date.today() > obj.due_date
        return False


class AssignmentCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = [
            'academic_year', 'term', 'school_level', 'class_level',
            'subject', 'classroom', 'title', 'description', 'instructions',
            'pdf_file', 'due_date', 'due_time', 'total_marks'
        ]


class AssignmentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Assignment
        fields = ['title', 'description', 'instructions', 'due_date', 'due_time', 'total_marks', 'status']
    class Meta:
        model  = Assignment
        fields = ['title', 'description', 'instructions', 'due_date', 'total_marks', 'status']
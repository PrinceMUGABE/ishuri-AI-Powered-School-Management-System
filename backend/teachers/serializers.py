from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import (
    Teacher, TeacherAssignment, SchoolDaySetting, Holiday,
    TeacherTimetable
)
from academics.models import SchoolLevel, ClassLevel, Subject, AcademicYear
from accounts.models import User


class TeacherSerializer(serializers.ModelSerializer):
    """Serializer for Teacher model."""
    
    age = serializers.IntegerField(read_only=True)
    user_id = serializers.IntegerField(source='user.id', read_only=True)
    username = serializers.CharField(source='user.username', read_only=True)
    
    class Meta:
        model = Teacher
        fields = [
            'id', 'user', 'user_id', 'username', 'full_name', 'email', 'phone_number',
            'address', 'gender', 'education_level', 'qualification', 'specialization',
            'experience_years', 'birth_date', 'age', 'hire_date', 'status', 'bio',
            'profile_picture', 'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at', 'created_by', 'age', 'user']
    
    def validate_email(self, value):
        """Validate email uniqueness."""
        value = value.lower().strip()
        if Teacher.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError('A teacher with this email already exists')
        return value
    
    def validate_phone_number(self, value):
        """Validate phone number uniqueness."""
        import re
        value = re.sub(r'\s+', '', value)
        if Teacher.objects.filter(phone_number=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError('A teacher with this phone number already exists')
        return value
    
    def validate_birth_date(self, value):
        """Validate birth date."""
        if value:
            today = timezone.now().date()
            age = today.year - value.year
            if today.month < value.month or (today.month == value.month and today.day < value.day):
                age -= 1
            
            if age < 18:
                raise serializers.ValidationError('Teacher must be at least 18 years old')
            if age > 80:
                raise serializers.ValidationError('Invalid birth date')
        return value

class TeacherCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new teacher (without user field)."""
    
    class Meta:
        model = Teacher
        fields = [
            'full_name', 'email', 'phone_number', 'address', 'gender',
            'education_level', 'qualification', 'specialization', 'experience_years',
            'birth_date', 'hire_date', 'status', 'bio', 'profile_picture'
        ]
    
    def validate_email(self, value):
        """Validate email uniqueness."""
        value = value.lower().strip()
        if Teacher.objects.filter(email=value).exists():
            raise serializers.ValidationError('A teacher with this email already exists')
        return value
    
    def validate_phone_number(self, value):
        """Validate phone number uniqueness."""
        import re
        value = re.sub(r'\s+', '', value)
        if Teacher.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('A teacher with this phone number already exists')
        return value
    
    def validate_birth_date(self, value):
        """Validate birth date."""
        if value:
            today = timezone.now().date()
            age = today.year - value.year
            if today.month < value.month or (today.month == value.month and today.day < value.day):
                age -= 1
            
            if age < 18:
                raise serializers.ValidationError('Teacher must be at least 18 years old')
            if age > 80:
                raise serializers.ValidationError('Invalid birth date')
        return value

class TeacherProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for teacher profile update."""
    
    class Meta:
        model = Teacher
        fields = [
            'full_name', 'phone_number', 'address', 'gender', 'qualification',
            'specialization', 'bio', 'profile_picture'
        ]
    
    def validate_phone_number(self, value):
        """Validate phone number."""
        import re
        value = re.sub(r'\s+', '', value)
        if Teacher.objects.filter(phone_number=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError('A teacher with this phone number already exists')
        return value


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for TeacherAssignment model."""
    
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True, allow_null=True)
    
    class Meta:
        model = TeacherAssignment
        fields = [
            'id', 'teacher', 'teacher_name', 'school_level', 'school_level_name',
            'class_level', 'class_level_name', 'subject', 'subject_name',
            'status', 'academic_year', 'academic_year_name', 'hours_per_week',
            'notes', 'assigned_at', 'updated_at', 'assigned_by'
        ]
        read_only_fields = ['id', 'assigned_at', 'updated_at', 'assigned_by']
    
    def validate(self, data):
        """Validate assignment."""
        # Check duplicate
        if TeacherAssignment.objects.filter(
            teacher=data.get('teacher'),
            school_level=data.get('school_level'),
            class_level=data.get('class_level'),
            subject=data.get('subject'),
            academic_year=data.get('academic_year')
        ).exists():
            raise serializers.ValidationError('This assignment already exists for the teacher')
        
        # Validate class level belongs to school level
        if data.get('class_level') and data.get('school_level'):
            if data['class_level'].school_level != data['school_level']:
                raise serializers.ValidationError({
                    'class_level': f'Class level "{data["class_level"].name}" does not belong to school level "{data["school_level"].name}"'
                })
        
        # Validate teacher is active
        if data.get('teacher') and data['teacher'].status != 'active':
            raise serializers.ValidationError({
                'teacher': 'Cannot assign subjects to an inactive teacher'
            })
        
        return data


class SchoolDaySettingSerializer(serializers.ModelSerializer):
    """Serializer for SchoolDaySetting model."""
    
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    day_name = serializers.SerializerMethodField()
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    
    class Meta:
        model = SchoolDaySetting
        fields = [
            'id', 'school_level', 'school_level_name', 'day_of_week', 'day_name',
            'is_school_day', 'start_time', 'end_time', 'morning_break_start',
            'morning_break_end', 'lunch_break_start', 'lunch_break_end',
            'afternoon_break_start', 'afternoon_break_end', 'events',
            'academic_year', 'academic_year_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_day_name(self, obj):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.day_of_week] if 0 <= obj.day_of_week < len(days) else str(obj.day_of_week)


class HolidaySerializer(serializers.ModelSerializer):
    """Serializer for Holiday model."""
    
    school_level_name = serializers.CharField(source='school_level.name', read_only=True, allow_null=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    
    class Meta:
        model = Holiday
        fields = [
            'id', 'name', 'date', 'is_recurring', 'description',
            'school_level', 'school_level_name', 'academic_year',
            'academic_year_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


class TeacherTimetableSerializer(serializers.ModelSerializer):
    """Serializer for TeacherTimetable model."""
    
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TeacherTimetable
        fields = [
            'id', 'teacher', 'teacher_name', 'day_of_week', 'day_name',
            'start_time', 'end_time', 'subject', 'subject_name',
            'class_level', 'class_level_name', 'classroom', 'classroom_name',
            'assignment', 'academic_year', 'week_number', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_day_name(self, obj):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.day_of_week] if 0 <= obj.day_of_week < len(days) else str(obj.day_of_week)
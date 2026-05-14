from rest_framework import serializers
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import authenticate
from django.core.files.base import ContentFile
import base64
import os
import re

from .models import (
    Teacher, TeacherDocument, TeacherAssignment, TeacherTimetable
)
from academics.models import SchoolLevel, ClassLevel, Subject, AcademicYear, Term, ClassRoom
from accounts.models import User


class Base64ImageField(serializers.ImageField):
    """Custom field to handle base64 encoded images"""
    
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:image'):
            format, imgstr = data.split(';base64,')
            ext = format.split('/')[-1]
            data = ContentFile(base64.b64decode(imgstr), name=f'temp.{ext}')
        return super().to_internal_value(data)


class Base64FileField(serializers.FileField):
    """Custom field to handle base64 encoded files"""
    
    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:'):
            # Handle base64 file
            try:
                format, data_str = data.split(';base64,')
                file_data = base64.b64decode(data_str)
                
                # Extract file extension from mime type
                mime_type = format.split(':')[1]
                ext = mime_type.split('/')[1] if '/' in mime_type else 'pdf'
                
                # Generate filename
                filename = f"document.{ext}"
                data = ContentFile(file_data, name=filename)
            except Exception as e:
                raise serializers.ValidationError(f"Invalid file data: {str(e)}")
        
        return super().to_internal_value(data)


class TeacherDocumentSerializer(serializers.ModelSerializer):
    """Serializer for teacher documents"""
    
    file_url = serializers.CharField(read_only=True)
    file_name = serializers.CharField(read_only=True)
    file_size = serializers.IntegerField(read_only=True)
    file_extension = serializers.CharField(read_only=True)
    uploaded_by_name = serializers.CharField(source='uploaded_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = TeacherDocument
        fields = [
            'id', 'document_type', 'title', 'description', 'file', 'file_url',
            'file_name', 'file_size', 'file_extension', 'uploaded_at',
            'uploaded_by', 'uploaded_by_name'
        ]
        read_only_fields = ['id', 'uploaded_at', 'uploaded_by', 'file_url', 'file_name', 'file_size', 'file_extension']
    
    def create(self, validated_data):
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)


class TeacherSpecializationSerializer(serializers.ModelSerializer):
    """Serializer for subject specializations"""
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'pass_mark']


class UserInfoSerializer(serializers.ModelSerializer):
    """Serializer for user account information"""
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'status', 'language', 'last_logged_in']
        read_only_fields = ['id', 'username', 'email', 'role', 'status', 'language', 'last_logged_in']


class TeacherSerializer(serializers.ModelSerializer):
    """Enhanced Teacher serializer with all related information"""
    
    age = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    qualification_document_url = serializers.SerializerMethodField()
    qualification_document_name = serializers.SerializerMethodField()
    specializations_detail = TeacherSpecializationSerializer(source='specializations', many=True, read_only=True)
    specializations_ids = serializers.PrimaryKeyRelatedField(
        source='specializations',
        queryset=Subject.objects.filter(status='active'),
        many=True,
        write_only=True,
        required=False
    )
    user_info = UserInfoSerializer(source='user', read_only=True)
    
    class Meta:
        model = Teacher
        fields = [
            'id', 'user', 'user_info', 'first_name', 'last_name', 'middle_name',
            'full_name', 'email', 'phone_number', 'address', 'gender',
            'salary', 'work_hours_per_week', 'specializations', 'specializations_ids',
            'specializations_detail', 'education_level', 'qualifications',
            'qualification_document', 'qualification_document_url', 'qualification_document_name',
            'birth_date', 'age', 'hire_date', 'status', 'profile_picture',
            'profile_picture_url', 'bio', 'created_at', 'updated_at', 'created_by'
        ]
        read_only_fields = ['id', 'age', 'created_at', 'updated_at', 'created_by', 'user']
    
    def get_profile_picture_url(self, obj):
        """Get profile picture URL or return base64 if needed"""
        if obj.profile_picture and obj.profile_picture.name:
            try:
                return obj.profile_picture.url
            except:
                return None
        return None
    
    def get_qualification_document_url(self, obj):
        """Get qualification document URL"""
        if obj.qualification_document and obj.qualification_document.name:
            try:
                return obj.qualification_document.url
            except:
                return None
        return None
    
    def get_qualification_document_name(self, obj):
        """Get qualification document file name"""
        if obj.qualification_document and obj.qualification_document.name:
            return os.path.basename(obj.qualification_document.name)
        return None
    
    def validate_email(self, value):
        """Validate email uniqueness"""
        value = value.lower().strip()
        if Teacher.objects.filter(email=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError('A teacher with this email already exists')
        return value
    
    def validate_phone_number(self, value):
        """Validate phone number uniqueness"""
        value = re.sub(r'\s+', '', value)
        if Teacher.objects.filter(phone_number=value).exclude(id=self.instance.id if self.instance else None).exists():
            raise serializers.ValidationError('A teacher with this phone number already exists')
        return value
    
    def validate_birth_date(self, value):
        """Validate birth date"""
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
    
    def validate(self, data):
        """Cross-field validation"""
        # Check if work_hours_per_week is reasonable
        if data.get('work_hours_per_week', 0) > 60:
            raise serializers.ValidationError({
                'work_hours_per_week': 'Work hours per week cannot exceed 60 hours'
            })
        
        return data
    
    def create(self, validated_data):
        """Create teacher with specializations"""
        specializations = validated_data.pop('specializations', [])
        teacher = super().create(validated_data)
        teacher.specializations.set(specializations)
        return teacher
    
    def update(self, instance, validated_data):
        """Update teacher with specializations"""
        specializations = validated_data.pop('specializations', None)
        teacher = super().update(instance, validated_data)
        if specializations is not None:
            teacher.specializations.set(specializations)
        return teacher


class TeacherCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating a new teacher"""
    
    specializations_ids = serializers.PrimaryKeyRelatedField(
        source='specializations',
        queryset=Subject.objects.filter(status='active'),
        many=True,
        required=False
    )
    
    class Meta:
        model = Teacher
        fields = [
            'first_name', 'last_name', 'middle_name', 'email', 'phone_number',
            'address', 'gender', 'salary', 'work_hours_per_week',
            'specializations_ids', 'education_level', 'qualifications',
            'qualification_document', 'birth_date', 'hire_date', 'status',
            'profile_picture', 'bio'
        ]
    
    def validate_email(self, value):
        value = value.lower().strip()
        if Teacher.objects.filter(email=value).exists():
            raise serializers.ValidationError('A teacher with this email already exists')
        return value
    
    def validate_phone_number(self, value):
        value = re.sub(r'\s+', '', value)
        if Teacher.objects.filter(phone_number=value).exists():
            raise serializers.ValidationError('A teacher with this phone number already exists')
        return value
    
    def validate_birth_date(self, value):
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
    """Serializer for teacher profile update"""
    
    profile_picture = Base64ImageField(required=False, allow_null=True)
    
    class Meta:
        model = Teacher
        fields = [
            'first_name', 'last_name', 'middle_name', 'phone_number',
            'address', 'gender', 'qualifications', 'bio', 'profile_picture'
        ]
    
    def validate_phone_number(self, value):
        value = re.sub(r'\s+', '', value)
        if Teacher.objects.filter(phone_number=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('A teacher with this phone number already exists')
        return value


class ChangePasswordSerializer(serializers.Serializer):
    """Serializer for changing password"""
    
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    confirm_password = serializers.CharField(required=True, write_only=True, min_length=8)
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return data


class TeacherAssignmentSerializer(serializers.ModelSerializer):
    """Serializer for TeacherAssignment model"""
    
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)
    assigned_by_name = serializers.CharField(source='assigned_by.username', read_only=True, allow_null=True)
    
    class Meta:
        model = TeacherAssignment
        fields = [
            'id', 'teacher', 'teacher_name', 'academic_year', 'academic_year_name',
            'term', 'term_name', 'school_level', 'school_level_name',
            'class_level', 'class_level_name', 'classroom', 'classroom_name',
            'subject', 'subject_name', 'status', 'hours_per_week',
            'notes', 'assigned_at', 'updated_at', 'assigned_by', 'assigned_by_name'
        ]
        read_only_fields = ['id', 'assigned_at', 'updated_at', 'assigned_by']
    
    def validate(self, data):
        """Validate assignment with error messages"""
        
        # Check if class level belongs to school level
        if data.get('class_level') and data.get('school_level'):
            if data['class_level'].school_level != data['school_level']:
                raise serializers.ValidationError({
                    'class_level': f'Class level "{data["class_level"].name}" does not belong to school level "{data["school_level"].name}"'
                })
        
        # Check if classroom is active
        if data.get('classroom') and data['classroom'].status != 'active':
            raise serializers.ValidationError({
                'classroom': f'Classroom "{data["classroom"].name}" is not active'
            })
        
        # Check if teacher is active
        if data.get('teacher') and data['teacher'].status != 'active':
            raise serializers.ValidationError({
                'teacher': f'Teacher "{data["teacher"].full_name}" is not active'
            })
        
        # Check if teacher specializes in this subject
        # if data.get('teacher') and data.get('subject'):
        #     if not data['teacher'].specializations.filter(id=data['subject'].id).exists():
        #         raise serializers.ValidationError({
        #             'subject': f'Teacher "{data["teacher"].full_name}" is not specialized in "{data["subject"].name}"'
        #         })
        
        # Check for duplicate assignment
        if TeacherAssignment.objects.filter(
            teacher=data.get('teacher'),
            academic_year=data.get('academic_year'),
            term=data.get('term'),
            class_level=data.get('class_level'),
            subject=data.get('subject')
        ).exists():
            raise serializers.ValidationError(
                'This assignment already exists for the teacher in this term'
            )
        
        # Check classroom conflict
        classroom_conflict = TeacherAssignment.objects.filter(
            academic_year=data.get('academic_year'),
            term=data.get('term'),
            classroom=data.get('classroom'),
            status='active'
        ).exclude(id=self.instance.id if self.instance else None)
        
        if classroom_conflict.exists():
            conflict_teacher = classroom_conflict.first().teacher.full_name
            raise serializers.ValidationError({
                'classroom': f'Classroom "{data["classroom"].name}" is already assigned to teacher "{conflict_teacher}" for this term'
            })
        
        return data


class TeacherTimetableSerializer(serializers.ModelSerializer):
    """Serializer for TeacherTimetable model"""
    
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        model = TeacherTimetable
        fields = [
            'id', 'teacher', 'teacher_name', 'assignment', 'academic_year',
            'academic_year_name', 'term', 'term_name', 'day_of_week', 'day_name',
            'start_time', 'end_time', 'week_number', 'subject', 'subject_name',
            'class_level', 'class_level_name', 'classroom', 'classroom_name',
            'school_level', 'school_level_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_day_name(self, obj):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[obj.day_of_week] if 0 <= obj.day_of_week < len(days) else str(obj.day_of_week)
    
    

# ==================== HOLIDAY SERIALIZER ====================

class HolidaySerializer(serializers.ModelSerializer):
    """Serializer for Holiday model"""
    
    school_level_name = serializers.CharField(source='school_level.name', read_only=True, allow_null=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    
    class Meta:
        from academics.models import Holiday
        model = Holiday
        fields = [
            'id', 'name', 'date', 'is_recurring', 'description',
            'school_level', 'school_level_name', 'academic_year',
            'academic_year_name', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def validate_date(self, value):
        """Validate holiday date is within academic year"""
        academic_year = self.initial_data.get('academic_year')
        if academic_year:
            from academics.models import AcademicYear
            try:
                year = AcademicYear.objects.get(id=academic_year)
                if value < year.start_date or value > year.end_date:
                    raise serializers.ValidationError(
                        f'Holiday date must be within academic year ({year.start_date} to {year.end_date})'
                    )
            except AcademicYear.DoesNotExist:
                pass
        return value


# ==================== SCHOOL DAY SETTING SERIALIZER ====================

class SchoolDaySettingSerializer(serializers.ModelSerializer):
    """Serializer for SchoolDaySetting model"""
    
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    day_name = serializers.SerializerMethodField()
    
    class Meta:
        from academics.models import SchoolDaySetting
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
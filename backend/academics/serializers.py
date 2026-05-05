from rest_framework import serializers
from django.core.exceptions import ValidationError
from decimal import Decimal
from .models import (
    AcademicYear, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, ClassLevelCost, ClassRoomSubject
)


# ============ Academic Year Serializers ============
class AcademicYearListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for academic years."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'status', 'status_display', 'is_current']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AcademicYearDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for academic years."""
    
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'status', 'status_display', 'is_current', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


class AcademicYearCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating academic years."""
    
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'status', 'is_current']
    
    def validate(self, data):
        """Validate that end_date is after start_date."""
        if data.get('start_date') and data.get('end_date'):
            if data['end_date'] < data['start_date']:
                raise serializers.ValidationError({
                    'end_date': 'End date must be after start date'
                })
        
        # Check for overlapping academic years
        if data.get('start_date') and data.get('end_date'):
            overlapping = AcademicYear.objects.filter(
                start_date__lte=data['end_date'],
                end_date__gte=data['start_date']
            )
            if self.instance:
                overlapping = overlapping.exclude(id=self.instance.id)
            
            if overlapping.exists():
                raise serializers.ValidationError({
                    'non_field_errors': 'Academic year overlaps with existing year'
                })
        
        return data


# ============ School Level Serializers ============
class SchoolLevelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for school levels."""
    
    level_type_display = serializers.CharField(source='get_level_type_display', read_only=True)
    
    class Meta:
        model = SchoolLevel
        fields = ['id', 'name', 'level_type', 'level_type_display', 'order', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SchoolLevelDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for school levels."""
    
    level_type_display = serializers.CharField(source='get_level_type_display', read_only=True)
    class_levels_count = serializers.SerializerMethodField()
    
    class Meta:
        model = SchoolLevel
        fields = ['id', 'name', 'level_type', 'level_type_display', 'description', 'order', 'is_active', 'class_levels_count', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_class_levels_count(self, obj):
        return obj.class_levels.filter(is_active=True).count()


# ============ Class Level Serializers ============
class ClassLevelListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for class levels."""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    
    class Meta:
        model = ClassLevel
        fields = ['id', 'name', 'code', 'category', 'category_display', 'school_level', 'school_level_name', 'order', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClassLevelDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for class levels."""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    teaching_frequency_display = serializers.CharField(source='get_default_teaching_frequency_display', read_only=True)
    
    class Meta:
        model = ClassLevel
        fields = ['id', 'name', 'code', 'category', 'category_display', 'school_level', 'school_level_name', 'description', 'order', 'is_active', 'default_teaching_frequency', 'teaching_frequency_display', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============ Class Room Serializers ============
class ClassRoomListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for classrooms."""
    
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    class_level_code = serializers.CharField(source='class_level.code', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    shift_display = serializers.CharField(source='get_shift_display', read_only=True)
    
    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'full_name', 'code', 'class_level', 'class_level_name', 'class_level_code', 'room_type', 'room_type_display', 'shift', 'shift_display', 'capacity', 'current_enrollment', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClassRoomDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for classrooms."""
    
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    class_level_code = serializers.CharField(source='class_level.code', read_only=True)
    room_type_display = serializers.CharField(source='get_room_type_display', read_only=True)
    shift_display = serializers.CharField(source='get_shift_display', read_only=True)
    homeroom_teacher_name = serializers.CharField(source='homeroom_teacher.username', read_only=True)
    enrollment_percentage = serializers.SerializerMethodField()
    
    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'full_name', 'code', 'class_level', 'class_level_name', 'class_level_code', 'room_type', 'room_type_display', 'shift', 'shift_display', 'capacity', 'current_enrollment', 'enrollment_percentage', 'homeroom_teacher', 'homeroom_teacher_name', 'is_active', 'description', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']
    
    def get_enrollment_percentage(self, obj):
        if obj.capacity > 0:
            return round((obj.current_enrollment / obj.capacity) * 100, 2)
        return 0


# ============ Subject Serializers ============
class SubjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for subjects."""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    grading_system_display = serializers.CharField(source='get_grading_system_display', read_only=True)
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'category', 'category_display', 'grading_system', 'grading_system_display', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']


class SubjectDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for subjects."""
    
    category_display = serializers.CharField(source='get_category_display', read_only=True)
    grading_system_display = serializers.CharField(source='get_grading_system_display', read_only=True)
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'category', 'category_display', 'description', 'grading_system', 'grading_system_display', 'pass_mark', 'icon', 'color', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============ Class Level Subject Serializers ============
class ClassLevelSubjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for class level subjects."""
    
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    teaching_frequency_display = serializers.CharField(source='get_teaching_frequency_display', read_only=True)
    term_offered_display = serializers.CharField(source='get_term_offered_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    
    class Meta:
        model = ClassLevelSubject
        fields = ['id', 'class_level', 'class_level_name', 'subject', 'subject_name', 'subject_code', 'teaching_frequency', 'teaching_frequency_display', 'hours_per_week', 'is_compulsory', 'term_offered', 'term_offered_display', 'status', 'status_display', 'order']
        read_only_fields = ['id', 'assigned_at', 'updated_at']


class ClassLevelSubjectDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for class level subjects."""
    
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    subject_code = serializers.CharField(source='subject.code', read_only=True)
    teaching_frequency_display = serializers.CharField(source='get_teaching_frequency_display', read_only=True)
    term_offered_display = serializers.CharField(source='get_term_offered_display', read_only=True)
    status_display = serializers.CharField(source='get_status_display', read_only=True)
    hours_per_term = serializers.ReadOnlyField()
    hours_per_academic_year = serializers.ReadOnlyField()
    
    class Meta:
        model = ClassLevelSubject
        fields = ['id', 'class_level', 'class_level_name', 'subject', 'subject_name', 'subject_code', 'teaching_frequency', 'teaching_frequency_display', 'hours_per_week', 'hours_per_day', 'hours_per_term', 'hours_per_academic_year', 'term_offered', 'term_offered_display', 'status', 'status_display', 'is_compulsory', 'notes', 'order', 'assigned_at', 'updated_at']
        read_only_fields = ['id', 'assigned_at', 'updated_at']


# ============ Class Level Cost Serializers ============
class ClassLevelCostListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for class level costs."""
    
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    formatted_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = ClassLevelCost
        fields = ['id', 'class_level', 'class_level_name', 'name', 'payment_type', 'payment_type_display', 'frequency', 'frequency_display', 'amount', 'formatted_amount', 'is_mandatory', 'is_active']
        read_only_fields = ['id', 'created_at', 'updated_at']


class ClassLevelCostDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for class level costs."""
    
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True, allow_null=True)
    payment_type_display = serializers.CharField(source='get_payment_type_display', read_only=True)
    frequency_display = serializers.CharField(source='get_frequency_display', read_only=True)
    formatted_amount = serializers.ReadOnlyField()
    
    class Meta:
        model = ClassLevelCost
        fields = ['id', 'class_level', 'class_level_name', 'academic_year', 'academic_year_name', 'name', 'payment_type', 'payment_type_display', 'frequency', 'frequency_display', 'amount', 'formatted_amount', 'description', 'is_mandatory', 'is_active', 'created_at', 'updated_at']
        read_only_fields = ['id', 'created_at', 'updated_at']


# ============ Class Room Subject Serializers ============
class ClassRoomSubjectListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for classroom subjects."""
    
    class_room_name = serializers.CharField(source='class_room.full_name', read_only=True)
    subject_name = serializers.CharField(source='class_level_subject.subject.name', read_only=True)
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)
    
    class Meta:
        model = ClassRoomSubject
        fields = ['id', 'class_room', 'class_room_name', 'subject_name', 'teacher', 'teacher_name', 'is_active']
        read_only_fields = ['id', 'assigned_at', 'updated_at']


class ClassRoomSubjectDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for classroom subjects."""
    
    class_room_name = serializers.CharField(source='class_room.full_name', read_only=True)
    class_level_name = serializers.CharField(source='class_level_subject.class_level.name', read_only=True)
    subject_name = serializers.CharField(source='class_level_subject.subject.name', read_only=True)
    subject_code = serializers.CharField(source='class_level_subject.subject.code', read_only=True)
    teacher_name = serializers.CharField(source='teacher.username', read_only=True)
    teaching_frequency = serializers.CharField(source='class_level_subject.teaching_frequency', read_only=True)
    
    class Meta:
        model = ClassRoomSubject
        fields = ['id', 'class_room', 'class_room_name', 'class_level_subject', 'class_level_name', 'subject_name', 'subject_code', 'teacher', 'teacher_name', 'teaching_frequency', 'days_of_week', 'start_time', 'end_time', 'is_active', 'assigned_at', 'updated_at']
        read_only_fields = ['id', 'assigned_at', 'updated_at']
        
        
        
        
class ClassLevelCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating class levels."""
    
    class Meta:
        model = ClassLevel
        fields = ['id', 'name', 'code', 'category', 'school_level', 'description', 'order', 'default_teaching_frequency']


class ClassRoomCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating classrooms."""
    
    class Meta:
        model = ClassRoom
        fields = ['id', 'class_level', 'name', 'full_name', 'code', 'room_type', 'shift', 'capacity', 'description', 'homeroom_teacher']


class SubjectCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating subjects."""
    
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'category', 'description', 'grading_system', 'pass_mark', 'icon', 'color']


class ClassLevelSubjectCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating class level subjects."""
    
    class Meta:
        model = ClassLevelSubject
        fields = ['id', 'class_level', 'subject', 'teaching_frequency', 'hours_per_week', 'hours_per_day', 'term_offered', 'is_compulsory', 'order']


class ClassLevelCostCreateUpdateSerializer(serializers.ModelSerializer):
    """Serializer for creating/updating class level costs."""
    
    class Meta:
        model = ClassLevelCost
        fields = ['id', 'class_level', 'academic_year', 'name', 'payment_type', 'frequency', 'amount', 'description', 'is_mandatory']
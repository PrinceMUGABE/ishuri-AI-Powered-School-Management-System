# teachers/serializers.py
from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from django.utils import timezone
from django.core.files.base import ContentFile
import base64
import os
import re

from .models import Teacher, TeacherDocument, TeacherAssignment, TeacherTimetable
from academics.models import (
    SchoolLevel, ClassLevel, Subject, AcademicYear, Term, ClassRoom,
    ClassLevelSubject, Holiday, SchoolDaySetting
)
from accounts.models import User


# ---------------------------------------------------------------------------
# Field helpers
# ---------------------------------------------------------------------------

class Base64FileField(serializers.FileField):
    """Accepts base64-encoded data URIs for document file uploads."""

    def to_internal_value(self, data):
        if isinstance(data, str) and data.startswith('data:'):
            try:
                fmt, data_str = data.split(';base64,')
                file_data = base64.b64decode(data_str)
                mime_type = fmt.split(':')[1]
                ext = mime_type.split('/')[1] if '/' in mime_type else 'pdf'
                data = ContentFile(file_data, name=f'document.{ext}')
            except Exception as exc:
                raise serializers.ValidationError(f'Invalid file data: {exc}')
        return super().to_internal_value(data)


# ---------------------------------------------------------------------------
# Nested read-only serializers
# ---------------------------------------------------------------------------

class TeacherSpecializationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Subject
        fields = ['id', 'name', 'code', 'pass_mark']


class UserInfoSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'status', 'language', 'last_logged_in']
        read_only_fields = fields


class ClassRoomBriefSerializer(serializers.ModelSerializer):
    class Meta:
        model = ClassRoom
        fields = ['id', 'name', 'code', 'room_type', 'capacity', 'status']


# ---------------------------------------------------------------------------
# TeacherDocument
# ---------------------------------------------------------------------------

class TeacherDocumentSerializer(serializers.ModelSerializer):
    file_url = serializers.CharField(read_only=True)
    file_name = serializers.CharField(read_only=True)
    file_size = serializers.IntegerField(read_only=True)
    file_extension = serializers.CharField(read_only=True)
    uploaded_by_name = serializers.CharField(
        source='uploaded_by.username', read_only=True, allow_null=True
    )

    class Meta:
        model = TeacherDocument
        fields = [
            'id', 'document_type', 'title', 'description', 'file', 'file_url',
            'file_name', 'file_size', 'file_extension', 'uploaded_at',
            'uploaded_by', 'uploaded_by_name',
        ]
        read_only_fields = [
            'id', 'uploaded_at', 'uploaded_by',
            'file_url', 'file_name', 'file_size', 'file_extension',
        ]

    def create(self, validated_data):
        validated_data['uploaded_by'] = self.context['request'].user
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Profile picture helpers
# ---------------------------------------------------------------------------

def _decode_profile_picture(data):
    """
    Parse an incoming base64 data URI.

    Returns (bytes, mime_type) or raises ValidationError.
    Accepts:  "data:image/png;base64,iVBOR..."
    """
    if not data:
        return None, ''
    if not isinstance(data, str) or not data.startswith('data:'):
        raise serializers.ValidationError(
            'Profile picture must be a base64 data URI '
            '(e.g. "data:image/png;base64,...")'
        )
    try:
        header, b64str = data.split(';base64,', 1)
        mime = header.split(':', 1)[1]           # e.g. "image/png"
        raw_bytes = base64.b64decode(b64str)
        return raw_bytes, mime
    except Exception as exc:
        raise serializers.ValidationError(f'Invalid profile picture data: {exc}')


def _encode_profile_picture(binary_value, mime):
    """
    Build a base64 data URI from a BinaryField value.

    Returns a string like "data:image/jpeg;base64,..." or None.
    """
    if not binary_value:
        return None
    raw = bytes(binary_value)           # handles both bytes and memoryview (PostgreSQL)
    b64 = base64.b64encode(raw).decode('utf-8')
    mime = mime or 'image/jpeg'
    return f'data:{mime};base64,{b64}'


# ---------------------------------------------------------------------------
# Teacher
# ---------------------------------------------------------------------------

class TeacherSerializer(serializers.ModelSerializer):
    # ---- read-only computed fields ----------------------------------------
    age = serializers.IntegerField(read_only=True)
    full_name = serializers.CharField(read_only=True)
    profile_picture_url = serializers.SerializerMethodField()
    qualification_document_url = serializers.SerializerMethodField()
    qualification_document_name = serializers.SerializerMethodField()

    # ---- specializations ---------------------------------------------------
    specializations_detail = TeacherSpecializationSerializer(
        source='specializations', many=True, read_only=True
    )
    specializations_ids = serializers.PrimaryKeyRelatedField(
        source='specializations',
        queryset=Subject.objects.filter(status='active'),
        many=True, write_only=True, required=False
    )

    # ---- nested user info --------------------------------------------------
    user_info = UserInfoSerializer(source='user', read_only=True)

    # ---- profile_picture: write-only CharField, read via profile_picture_url
    profile_picture = serializers.CharField(
        write_only=True, required=False, allow_null=True, allow_blank=True,
        help_text='Base64 data URI, e.g. "data:image/png;base64,..."'
    )

    class Meta:
        model = Teacher
        fields = [
            'id', 'user', 'user_info',
            'first_name', 'last_name', 'middle_name', 'full_name',
            'email', 'phone_number', 'address', 'gender',
            'salary', 'work_hours_per_week',
            'specializations', 'specializations_ids', 'specializations_detail',
            'education_level', 'qualifications',
            'qualification_document', 'qualification_document_url', 'qualification_document_name',
            'birth_date', 'age', 'hire_date', 'status',
            # write-only input field
            'profile_picture',
            # read-only output field (full data URI)
            'profile_picture_url',
            'bio',
            'created_at', 'updated_at', 'created_by',
        ]
        read_only_fields = [
            'id', 'age', 'created_at', 'updated_at', 'created_by', 'user',
            'profile_picture_url',
        ]

    # ---- serializer method fields -----------------------------------------

    def get_profile_picture_url(self, obj):
        """Return a full base64 data URI, or None."""
        return _encode_profile_picture(obj.profile_picture, obj.profile_picture_mime)

    def get_qualification_document_url(self, obj):
        if obj.qualification_document and obj.qualification_document.name:
            try:
                return obj.qualification_document.url
            except Exception:
                return None
        return None

    def get_qualification_document_name(self, obj):
        if obj.qualification_document and obj.qualification_document.name:
            return os.path.basename(obj.qualification_document.name)
        return None

    # ---- field-level validation -------------------------------------------

    def validate_email(self, value):
        value = value.lower().strip()
        qs = Teacher.objects.filter(email=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError('A teacher with this email already exists')
        return value

    def validate_phone_number(self, value):
        value = re.sub(r'\s+', '', value)
        qs = Teacher.objects.filter(phone_number=value)
        if self.instance:
            qs = qs.exclude(id=self.instance.id)
        if qs.exists():
            raise serializers.ValidationError('A teacher with this phone number already exists')
        return value

    def validate_birth_date(self, value):
        if value:
            today = timezone.now().date()
            age = today.year - value.year
            if (today.month, today.day) < (value.month, value.day):
                age -= 1
            if age < 18:
                raise serializers.ValidationError('Teacher must be at least 18 years old')
            if age > 80:
                raise serializers.ValidationError('Invalid birth date')
        return value

    def validate_profile_picture(self, value):
        """
        Decode the incoming data URI and stash the mime type for use in
        create() / update().  Returns raw bytes (or None).
        """
        if not value:
            # Explicit null/blank — caller wants to clear the picture
            self._profile_picture_bytes = None
            self._profile_picture_mime = ''
            return None
        raw_bytes, mime = _decode_profile_picture(value)
        self._profile_picture_bytes = raw_bytes
        self._profile_picture_mime = mime
        return raw_bytes

    def validate(self, data):
        if data.get('work_hours_per_week', 0) > 60:
            raise serializers.ValidationError(
                {'work_hours_per_week': 'Work hours per week cannot exceed 60 hours'}
            )
        return data

    # ---- create / update --------------------------------------------------

    def _apply_profile_picture(self, validated_data):
        """
        Move the decoded bytes + mime into validated_data under the correct
        model field names, removing the write-only 'profile_picture' key.
        """
        if 'profile_picture' in validated_data:
            validated_data.pop('profile_picture')          # remove write-only key
        if hasattr(self, '_profile_picture_bytes'):
            validated_data['profile_picture'] = self._profile_picture_bytes
            validated_data['profile_picture_mime'] = self._profile_picture_mime

    def create(self, validated_data):
        specializations = validated_data.pop('specializations', [])
        self._apply_profile_picture(validated_data)
        teacher = super().create(validated_data)
        teacher.specializations.set(specializations)
        return teacher

    def update(self, instance, validated_data):
        specializations = validated_data.pop('specializations', None)
        self._apply_profile_picture(validated_data)
        teacher = super().update(instance, validated_data)
        if specializations is not None:
            teacher.specializations.set(specializations)
        return teacher


# ---------------------------------------------------------------------------
# TeacherCreateSerializer
# ---------------------------------------------------------------------------

class TeacherCreateSerializer(serializers.ModelSerializer):
    specializations_ids = serializers.PrimaryKeyRelatedField(
        source='specializations',
        queryset=Subject.objects.filter(status='active'),
        many=True, required=False
    )
    profile_picture = serializers.CharField(
        write_only=True, required=False, allow_null=True, allow_blank=True,
        help_text='Base64 data URI, e.g. "data:image/png;base64,..."'
    )

    class Meta:
        model = Teacher
        fields = [
            'first_name', 'last_name', 'middle_name', 'email', 'phone_number',
            'address', 'gender', 'salary', 'work_hours_per_week',
            'specializations_ids', 'education_level', 'qualifications',
            'qualification_document', 'birth_date', 'hire_date', 'status',
            'profile_picture', 'bio',
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
            if (today.month, today.day) < (value.month, value.day):
                age -= 1
            if age < 18:
                raise serializers.ValidationError('Teacher must be at least 18 years old')
            if age > 80:
                raise serializers.ValidationError('Invalid birth date')
        return value

    def validate_profile_picture(self, value):
        if not value:
            self._profile_picture_bytes = None
            self._profile_picture_mime = ''
            return None
        raw_bytes, mime = _decode_profile_picture(value)
        self._profile_picture_bytes = raw_bytes
        self._profile_picture_mime = mime
        return raw_bytes

    def _apply_profile_picture(self, validated_data):
        if 'profile_picture' in validated_data:
            validated_data.pop('profile_picture')
        if hasattr(self, '_profile_picture_bytes'):
            validated_data['profile_picture'] = self._profile_picture_bytes
            validated_data['profile_picture_mime'] = self._profile_picture_mime

    def create(self, validated_data):
        specializations = validated_data.pop('specializations', [])
        self._apply_profile_picture(validated_data)
        teacher = super().create(validated_data)
        teacher.specializations.set(specializations)
        return teacher


# ---------------------------------------------------------------------------
# TeacherProfileUpdateSerializer
# ---------------------------------------------------------------------------

class TeacherProfileUpdateSerializer(serializers.ModelSerializer):
    profile_picture = serializers.CharField(
        required=False, allow_null=True, allow_blank=True,
        help_text='Base64 data URI, e.g. "data:image/png;base64,..." — send null to clear'
    )
    # Expose the current picture as a read-only data URI on responses
    profile_picture_url = serializers.SerializerMethodField(read_only=True)

    class Meta:
        model = Teacher
        fields = [
            'first_name', 'last_name', 'middle_name', 'phone_number',
            'address', 'gender', 'qualifications', 'bio',
            'profile_picture',       # write-only input
            'profile_picture_url',   # read-only output
        ]

    def get_profile_picture_url(self, obj):
        return _encode_profile_picture(obj.profile_picture, obj.profile_picture_mime)

    def validate_phone_number(self, value):
        value = re.sub(r'\s+', '', value)
        if Teacher.objects.filter(phone_number=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('A teacher with this phone number already exists')
        return value

    def validate_profile_picture(self, value):
        if not value:
            self._profile_picture_bytes = None
            self._profile_picture_mime = ''
            return None
        raw_bytes, mime = _decode_profile_picture(value)
        self._profile_picture_bytes = raw_bytes
        self._profile_picture_mime = mime
        return raw_bytes

    def update(self, instance, validated_data):
        # Swap the write-only key for the real model fields
        if 'profile_picture' in validated_data:
            validated_data.pop('profile_picture')
        if hasattr(self, '_profile_picture_bytes'):
            validated_data['profile_picture'] = self._profile_picture_bytes
            validated_data['profile_picture_mime'] = self._profile_picture_mime
        return super().update(instance, validated_data)


# ---------------------------------------------------------------------------
# ChangePasswordSerializer
# ---------------------------------------------------------------------------

class ChangePasswordSerializer(serializers.Serializer):
    current_password = serializers.CharField(required=True, write_only=True)
    new_password = serializers.CharField(required=True, write_only=True, min_length=8)
    confirm_password = serializers.CharField(required=True, write_only=True, min_length=8)

    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        return data


# ---------------------------------------------------------------------------
# TeacherAssignmentSerializer
# ---------------------------------------------------------------------------

class TeacherAssignmentSerializer(serializers.ModelSerializer):
    """
    Serializer for TeacherAssignment.

    - classrooms is a M2M field: send a list of classroom IDs.
    - hours_per_week is removed; use required_hours_per_week (read-only) instead.
    - teaching_frequency is derived from ClassLevelSubject (read-only).
    """

    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)
    assigned_by_name = serializers.CharField(
        source='assigned_by.username', read_only=True, allow_null=True
    )

    # Classrooms M2M — writable list of IDs
    classrooms = serializers.PrimaryKeyRelatedField(
        queryset=ClassRoom.objects.filter(status='active'),
        many=True,
        required=False
    )
    classrooms_detail = ClassRoomBriefSerializer(source='classrooms', many=True, read_only=True)

    # Derived from ClassLevelSubject — read-only
    required_hours_per_week = serializers.FloatField(read_only=True)
    teaching_frequency = serializers.CharField(read_only=True)

    class Meta:
        model = TeacherAssignment
        fields = [
            'id', 'teacher', 'teacher_name',
            'academic_year', 'academic_year_name',
            'term', 'term_name',
            'school_level', 'school_level_name',
            'class_level', 'class_level_name',
            'classrooms', 'classrooms_detail',
            'subject', 'subject_name',
            'required_hours_per_week', 'teaching_frequency',
            'status', 'notes',
            'assigned_at', 'updated_at',
            'assigned_by', 'assigned_by_name',
        ]
        read_only_fields = [
            'id', 'assigned_at', 'updated_at', 'assigned_by',
            'required_hours_per_week', 'teaching_frequency',
        ]

    def validate(self, data):
        class_level = data.get('class_level') or (self.instance.class_level if self.instance else None)
        school_level = data.get('school_level') or (self.instance.school_level if self.instance else None)
        subject = data.get('subject') or (self.instance.subject if self.instance else None)
        teacher = data.get('teacher') or (self.instance.teacher if self.instance else None)
        classrooms = data.get('classrooms')

        # ----------------------------------------------------------------
        # 1. AUTO-POPULATE classrooms first so downstream checks don't crash
        # ----------------------------------------------------------------
        if not classrooms and class_level:
            auto_rooms = list(
                ClassRoom.objects.filter(
                    assigned_class_level=class_level,
                    status='active'
                )
            )
            if auto_rooms:
                classrooms = auto_rooms
                data['classrooms'] = classrooms
            else:
                raise serializers.ValidationError({
                    'classrooms': (
                        f'No active classrooms are assigned to class level '
                        f'"{class_level.name}". Please assign classrooms to this '
                        f'class level first, or provide classrooms manually.'
                    )
                })
        elif not classrooms:
            raise serializers.ValidationError({
                'classrooms': (
                    'Classrooms are required and could not be auto-populated '
                    'without a class level.'
                )
            })

        # ----------------------------------------------------------------
        # 2. Structural validations
        # ----------------------------------------------------------------

        # class_level must belong to school_level
        if class_level and school_level:
            if class_level.school_level_id != school_level.id:
                raise serializers.ValidationError({
                    'class_level': (
                        f'Class level "{class_level.name}" does not belong to '
                        f'school level "{school_level.name}"'
                    )
                })

        # teacher must be active
        if teacher and teacher.status != 'active':
            raise serializers.ValidationError(
                {'teacher': f'Teacher "{teacher.full_name}" is not active'}
            )

        # All classrooms must be active
        for room in classrooms:
            if room.status != 'active':
                raise serializers.ValidationError(
                    {'classrooms': f'Classroom "{room.name}" is not active'}
                )

        # Subject must be assigned to class level
        if class_level and subject:
            if not ClassLevelSubject.objects.filter(
                class_level=class_level, subject=subject
            ).exists():
                raise serializers.ValidationError({
                    'subject': (
                        f'Subject "{subject.name}" is not assigned to '
                        f'class level "{class_level.name}"'
                    )
                })

        # No duplicate subject → class level in the same term
        academic_year = data.get('academic_year') or (self.instance.academic_year if self.instance else None)
        term = data.get('term') or (self.instance.term if self.instance else None)
        if academic_year and term and class_level and subject:
            qs = TeacherAssignment.objects.filter(
                academic_year=academic_year,
                term=term,
                class_level=class_level,
                subject=subject,
                status='active'
            )
            if self.instance:
                qs = qs.exclude(pk=self.instance.pk)
            if qs.exists():
                raise serializers.ValidationError(
                    f'Subject "{subject.name}" is already assigned to '
                    f'class "{class_level.name}" for this term'
                )

        return data


# ---------------------------------------------------------------------------
# TeacherTimetableSerializer
# ---------------------------------------------------------------------------

class TeacherTimetableSerializer(serializers.ModelSerializer):
    teacher_name = serializers.CharField(source='teacher.full_name', read_only=True)
    subject_name = serializers.CharField(source='subject.name', read_only=True)
    class_level_name = serializers.CharField(source='class_level.name', read_only=True)
    classroom_name = serializers.CharField(source='classroom.name', read_only=True)
    school_level_name = serializers.CharField(source='school_level.name', read_only=True)
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    term_name = serializers.CharField(source='term.name', read_only=True)
    day_name = serializers.CharField(read_only=True)
    duration_minutes = serializers.IntegerField(read_only=True)

    class Meta:
        model = TeacherTimetable
        fields = [
            'id', 'teacher', 'teacher_name', 'assignment',
            'academic_year', 'academic_year_name',
            'term', 'term_name',
            'day_of_week', 'day_name',
            'start_time', 'end_time', 'duration_minutes',
            'subject', 'subject_name',
            'class_level', 'class_level_name',
            'classroom', 'classroom_name',
            'school_level', 'school_level_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']


# ---------------------------------------------------------------------------
# HolidaySerializer
# ---------------------------------------------------------------------------

class HolidaySerializer(serializers.ModelSerializer):
    school_level_name = serializers.CharField(
        source='school_level.name', read_only=True, allow_null=True
    )
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)

    class Meta:
        model = Holiday
        fields = [
            'id', 'name', 'date', 'is_recurring', 'description',
            'school_level', 'school_level_name',
            'academic_year', 'academic_year_name',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def validate_date(self, value):
        academic_year_id = self.initial_data.get('academic_year')
        if academic_year_id:
            try:
                year = AcademicYear.objects.get(id=academic_year_id)
                if value < year.start_date or value > year.end_date:
                    raise serializers.ValidationError(
                        f'Holiday date must be within academic year '
                        f'({year.start_date} to {year.end_date})'
                    )
            except AcademicYear.DoesNotExist:
                pass
        return value


# ---------------------------------------------------------------------------
# SchoolDaySettingSerializer
# ---------------------------------------------------------------------------

class SchoolDaySettingSerializer(serializers.ModelSerializer):
    academic_year_name = serializers.CharField(source='academic_year.name', read_only=True)
    day_type_display = serializers.CharField(source='get_day_type_display', read_only=True)
    weekday_display = serializers.SerializerMethodField()

    class Meta:
        model = SchoolDaySetting
        fields = [
            'id', 'academic_year', 'academic_year_name',
            'day_type', 'day_type_display',
            'weekday', 'weekday_display',
            'specific_date', 'description', 'is_active',
            'created_at', 'updated_at',
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_weekday_display(self, obj):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        if obj.weekday is not None and 0 <= obj.weekday < len(days):
            return days[obj.weekday]
        return None
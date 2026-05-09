from rest_framework import serializers
from django.utils.translation import gettext_lazy as _

from .models import Student, Parent, StudentParent
from academics.models import AcademicYear, SchoolLevel, ClassLevel
from accounts.models import User


# ─────────────────────────────────────────────
# Nested / lightweight serializers
# ─────────────────────────────────────────────

class UserMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'status', 'email', 'language']


class AcademicYearMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = AcademicYear
        fields = ['id', 'name', 'start_date', 'end_date', 'is_current']


class SchoolLevelMinimalSerializer(serializers.ModelSerializer):
    class Meta:
        model = SchoolLevel
        fields = ['id', 'name', 'description', 'is_active']


class ClassLevelMinimalSerializer(serializers.ModelSerializer):
    school_level = SchoolLevelMinimalSerializer(read_only=True)

    class Meta:
        model = ClassLevel
        fields = ['id', 'name', 'code', 'school_level', 'is_active']


# ─────────────────────────────────────────────
# Parent serializers
# ─────────────────────────────────────────────

class ParentMinimalSerializer(serializers.ModelSerializer):
    """Minimal parent info – used inside student detail."""
    relationship_type_display = serializers.CharField(
        source='get_relationship_type_display', read_only=True
    )

    class Meta:
        model = Parent
        fields = [
            'id', 'full_name', 'phone_number', 'email',
            'physical_address', 'relationship_type', 'relationship_type_display', 'status'
        ]


class StudentMinimalSerializer(serializers.ModelSerializer):
    """Minimal student info – used inside parent detail."""
    age = serializers.IntegerField(read_only=True)
    current_class_level = ClassLevelMinimalSerializer(read_only=True)
    current_school_level = SchoolLevelMinimalSerializer(read_only=True)
    current_academic_year = AcademicYearMinimalSerializer(read_only=True)

    class Meta:
        model = Student
        fields = [
            'id', 'full_name', 'roll_number', 'email', 'phone_number',
            'birth_date', 'age', 'status',
            'current_academic_year', 'current_school_level', 'current_class_level'
        ]


class ParentListSerializer(serializers.ModelSerializer):
    relationship_type_display = serializers.CharField(
        source='get_relationship_type_display', read_only=True
    )
    students_count = serializers.SerializerMethodField()

    class Meta:
        model = Parent
        fields = [
            'id', 'full_name', 'phone_number', 'email',
            'relationship_type', 'relationship_type_display',
            'status', 'students_count', 'created_at', 'physical_address'
        ]

    def get_students_count(self, obj):
        return obj.students.count()


class ParentDetailSerializer(serializers.ModelSerializer):
    """Full parent info including all associated students."""
    relationship_type_display = serializers.CharField(
        source='get_relationship_type_display', read_only=True
    )
    user = UserMinimalSerializer(read_only=True)
    students = StudentMinimalSerializer(many=True, read_only=True)
    created_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Parent
        fields = [
            'id', 'user', 'full_name', 'phone_number', 'email',
            'physical_address', 'relationship_type', 'relationship_type_display',
            'status', 'students', 'created_by', 'created_at', 'updated_at'
        ]


class ParentCreateSerializer(serializers.ModelSerializer):
    """Used when creating a parent. student_ids ties parent to student(s)."""
    student_ids = serializers.ListField(
        child=serializers.IntegerField(),
        write_only=True,
        required=True,
        help_text=_('List of student IDs to associate with this parent')
    )

    class Meta:
        model = Parent
        fields = [
            'full_name', 'phone_number', 'email',
            'physical_address', 'relationship_type', 'student_ids'
        ]

    def validate_student_ids(self, value):
        if not value:
            raise serializers.ValidationError(_('At least one student ID is required'))
        existing = Student.objects.filter(id__in=value).values_list('id', flat=True)
        missing = set(value) - set(existing)
        if missing:
            raise serializers.ValidationError(
                _('Students with IDs {} not found').format(list(missing))
            )
        return value

    def validate_email(self, value):
        return value.lower().strip() if value else value

    def create(self, validated_data):
        student_ids = validated_data.pop('student_ids')
        parent = Parent(**validated_data)
        parent.save()
        for sid in student_ids:
            StudentParent.objects.get_or_create(student_id=sid, parent=parent)
        return parent


class ParentUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Parent
        fields = [
            'full_name', 'phone_number', 'email',
            'physical_address', 'relationship_type'
        ]

    def validate_email(self, value):
        return value.lower().strip() if value else value


# ─────────────────────────────────────────────
# Student serializers
# ─────────────────────────────────────────────

class StudentListSerializer(serializers.ModelSerializer):
    age = serializers.IntegerField(read_only=True)
    current_class_level = ClassLevelMinimalSerializer(read_only=True)
    current_school_level = SchoolLevelMinimalSerializer(read_only=True)
    current_academic_year = AcademicYearMinimalSerializer(read_only=True)
    parents_count = serializers.SerializerMethodField()

    class Meta:
        model = Student
        fields = [
            'id', 'full_name', 'roll_number', 'email', 'phone_number',
            'birth_date', 'age', 'status', 'parents_count',
            'current_academic_year', 'current_school_level', 'current_class_level',
            'created_at'
        ]

    def get_parents_count(self, obj):
        return obj.parents.count()


class StudentDetailSerializer(serializers.ModelSerializer):
    """Full student detail including parents and academic placement."""
    age = serializers.IntegerField(read_only=True)
    current_class_level = ClassLevelMinimalSerializer(read_only=True)
    current_school_level = SchoolLevelMinimalSerializer(read_only=True)
    current_academic_year = AcademicYearMinimalSerializer(read_only=True)
    user = UserMinimalSerializer(read_only=True)
    parents = ParentMinimalSerializer(many=True, read_only=True)
    created_by = UserMinimalSerializer(read_only=True)

    class Meta:
        model = Student
        fields = [
            'id', 'user', 'full_name', 'roll_number', 'email', 'phone_number',
            'birth_date', 'age', 'status',
            'current_academic_year', 'current_school_level', 'current_class_level',
            'parents', 'created_by', 'created_at', 'updated_at'
        ]


class StudentCreateSerializer(serializers.ModelSerializer):
    current_academic_year_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicYear.objects.all(),
        source='current_academic_year',
        required=False,
        allow_null=True
    )
    current_school_level_id = serializers.PrimaryKeyRelatedField(
        queryset=SchoolLevel.objects.all(),
        source='current_school_level',
        required=False,
        allow_null=True
    )
    current_class_level_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassLevel.objects.all(),
        source='current_class_level',
        required=False,
        allow_null=True
    )

    class Meta:
        model = Student
        fields = [
            'full_name', 'email', 'phone_number', 'birth_date',
            'current_academic_year_id', 'current_school_level_id', 'current_class_level_id'
        ]

    def validate_email(self, value):
        return value.lower().strip() if value else value

    def validate(self, attrs):
        school_level = attrs.get('current_school_level')
        class_level = attrs.get('current_class_level')
        if school_level and class_level:
            if class_level.school_level != school_level:
                raise serializers.ValidationError({
                    'current_class_level_id': _(
                        'Class level "{}" does not belong to school level "{}"'
                    ).format(class_level.name, school_level.name)
                })
        return attrs


class StudentUpdateSerializer(serializers.ModelSerializer):
    current_academic_year_id = serializers.PrimaryKeyRelatedField(
        queryset=AcademicYear.objects.all(),
        source='current_academic_year',
        required=False,
        allow_null=True
    )
    current_school_level_id = serializers.PrimaryKeyRelatedField(
        queryset=SchoolLevel.objects.all(),
        source='current_school_level',
        required=False,
        allow_null=True
    )
    current_class_level_id = serializers.PrimaryKeyRelatedField(
        queryset=ClassLevel.objects.all(),
        source='current_class_level',
        required=False,
        allow_null=True
    )

    class Meta:
        model = Student
        fields = [
            'full_name', 'email', 'phone_number', 'birth_date',
            'current_academic_year_id', 'current_school_level_id', 'current_class_level_id',
            'status'
        ]

    def validate_email(self, value):
        return value.lower().strip() if value else value

    def validate(self, attrs):
        school_level = attrs.get(
            'current_school_level',
            self.instance.current_school_level if self.instance else None
        )
        class_level = attrs.get(
            'current_class_level',
            self.instance.current_class_level if self.instance else None
        )
        if school_level and class_level:
            if class_level.school_level != school_level:
                raise serializers.ValidationError({
                    'current_class_level_id': _(
                        'Class level "{}" does not belong to school level "{}"'
                    ).format(class_level.name, school_level.name)
                })
        return attrs
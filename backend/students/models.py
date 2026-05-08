from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import RegexValidator, EmailValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date
import re
import uuid

from academics.models import AcademicYear, SchoolLevel, ClassLevel
from accounts.models import User


def generate_roll_number():
    """Generate a unique roll number for students."""
    year = date.today().year
    uid = uuid.uuid4().hex[:6].upper()
    return f"STU-{year}-{uid}"


class Parent(models.Model):
    """
    Parent or Guardian model.
    A parent/guardian can be linked to one or more students.
    """

    class RelationshipType(models.TextChoices):
        FATHER = 'father', _('Father')
        MOTHER = 'mother', _('Mother')
        GUARDIAN = 'guardian', _('Guardian')
        OTHER = 'other', _('Other')

    class Status(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')

    # User account link
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='parent_profile',
        verbose_name=_('user account'),
        null=True,
        blank=True
    )

    # Personal information
    full_name = models.CharField(_('full name'), max_length=200)
    phone_number = models.CharField(
        _('phone number'),
        max_length=20,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^(\+?[0-9]{10,15})$',
                message=_('Phone number must contain 10-15 digits, optionally starting with +')
            )
        ]
    )
    email = models.EmailField(
        _('email address'),
        unique=True,
        validators=[EmailValidator(message=_('Enter a valid email address'))]
    )
    physical_address = models.TextField(_('physical address'), blank=True)
    relationship_type = models.CharField(
        _('relationship type'),
        max_length=20,
        choices=RelationshipType.choices,
        default=RelationshipType.GUARDIAN
    )

    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.INACTIVE
    )

    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_parents',
        verbose_name=_('created by')
    )

    class Meta:
        verbose_name = _('parent')
        verbose_name_plural = _('parents')
        ordering = ['full_name']
        indexes = [
            models.Index(fields=['phone_number']),
            models.Index(fields=['email']),
            models.Index(fields=['status']),
        ]

    def clean(self):
        if self.email:
            self.email = self.email.lower().strip()
        if self.phone_number:
            self.phone_number = re.sub(r'\s+', '', self.phone_number)

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.full_name} ({self.get_relationship_type_display()})"


class Student(models.Model):
    """
    Student model with detailed information.
    """

    class Status(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')

    # User account link
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='student_profile',
        verbose_name=_('user account'),
        null=True,
        blank=True
    )

    # Personal information
    full_name = models.CharField(_('full name'), max_length=200)
    roll_number = models.CharField(
        _('roll number'),
        max_length=30,
        unique=True,
        editable=False
    )
    email = models.EmailField(
        _('email address'),
        unique=True,
        null=True,
        blank=True,
        validators=[EmailValidator(message=_('Enter a valid email address'))]
    )
    phone_number = models.CharField(
        _('phone number'),
        max_length=20,
        unique=True,
        null=True,
        blank=True,
        validators=[
            RegexValidator(
                regex=r'^(\+?[0-9]{10,15})$',
                message=_('Phone number must contain 10-15 digits, optionally starting with +')
            )
        ]
    )
    birth_date = models.DateField(_('birth date'), null=True, blank=True)

    # Academic placement
    current_academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
        verbose_name=_('current academic year')
    )
    current_school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
        verbose_name=_('current school level')
    )
    current_class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='students',
        verbose_name=_('current class level')
    )

    # Parents / Guardians (M2M through StudentParent)
    parents = models.ManyToManyField(
        Parent,
        through='StudentParent',
        related_name='students',
        blank=True,
        verbose_name=_('parents/guardians')
    )

    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.INACTIVE
    )

    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_students',
        verbose_name=_('created by')
    )

    class Meta:
        verbose_name = _('student')
        verbose_name_plural = _('students')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['roll_number']),
            models.Index(fields=['status']),
            models.Index(fields=['current_class_level']),
        ]

    def clean(self):
        if self.email:
            self.email = self.email.lower().strip()
        if self.phone_number:
            self.phone_number = re.sub(r'\s+', '', self.phone_number)

        # Validate birth date
        if self.birth_date:
            today = date.today()
            age = today.year - self.birth_date.year
            if today.month < self.birth_date.month or (
                    today.month == self.birth_date.month and today.day < self.birth_date.day):
                age -= 1
            if age < 3:
                raise ValidationError({'birth_date': _('Student must be at least 3 years old')})
            if age > 35:
                raise ValidationError({'birth_date': _('Invalid birth date for a student')})

        # Validate that class level belongs to school level
        if self.current_class_level and self.current_school_level:
            if self.current_class_level.school_level != self.current_school_level:
                raise ValidationError({
                    'current_class_level': _(
                        'Class level "{}" does not belong to school level "{}"'
                    ).format(self.current_class_level.name, self.current_school_level.name)
                })

    def save(self, *args, **kwargs):
        if not self.roll_number:
            # Ensure uniqueness
            roll = generate_roll_number()
            while Student.objects.filter(roll_number=roll).exists():
                roll = generate_roll_number()
            self.roll_number = roll
        self.clean()
        super().save(*args, **kwargs)

    @property
    def age(self):
        """Auto-calculate age from birth date."""
        if self.birth_date:
            today = date.today()
            age = today.year - self.birth_date.year
            if today.month < self.birth_date.month or (
                    today.month == self.birth_date.month and today.day < self.birth_date.day):
                age -= 1
            return age
        return None

    def __str__(self):
        return f"{self.full_name} ({self.roll_number})"


class StudentParent(models.Model):
    """
    Through model linking students to parents/guardians.
    A student can have multiple parents/guardians and vice versa.
    """

    student = models.ForeignKey(
        Student,
        on_delete=models.CASCADE,
        related_name='student_parents',
        verbose_name=_('student')
    )
    parent = models.ForeignKey(
        Parent,
        on_delete=models.CASCADE,
        related_name='parent_students',
        verbose_name=_('parent/guardian')
    )
    is_primary_contact = models.BooleanField(_('is primary contact'), default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name = _('student parent')
        verbose_name_plural = _('student parents')
        unique_together = [['student', 'parent']]

    def __str__(self):
        return f"{self.parent.full_name} -> {self.student.full_name}"
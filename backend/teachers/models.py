from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator, EmailValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, datetime, timedelta
from decimal import Decimal
import re

from academics.models import SchoolLevel, ClassLevel, Subject
from accounts.models import User


class Teacher(models.Model):
    """Teacher model with detailed information."""
    
    class Gender(models.TextChoices):
        MALE = 'male', _('Male')
        FEMALE = 'female', _('Female')
        OTHER = 'other', _('Other')
    
    class Status(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')
        ON_LEAVE = 'on_leave', _('On Leave')
        SUSPENDED = 'suspended', _('Suspended')
    
    class EducationLevel(models.TextChoices):
        DIPLOMA = 'diploma', _('Diploma')
        BACHELOR = 'bachelor', _("Bachelor's Degree")
        MASTER = 'master', _("Master's Degree")
        DOCTORATE = 'doctorate', _('Doctorate')
        CERTIFICATE = 'certificate', _('Certificate')
    
    # Linked user account
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name='teacher_profile',
        verbose_name=_('user account')
    )
    
    # Personal Information
    full_name = models.CharField(_('full name'), max_length=200)
    email = models.EmailField(
        _('email address'),
        unique=True,
        validators=[EmailValidator(message=_('Enter a valid email address'))]
    )
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
    address = models.TextField(_('address'), blank=True)
    gender = models.CharField(_('gender'), max_length=10, choices=Gender.choices, default=Gender.MALE)
    
    # Education and Professional
    education_level = models.CharField(
        _('education level'),
        max_length=20,
        choices=EducationLevel.choices,
        default=EducationLevel.BACHELOR
    )
    qualification = models.TextField(_('qualification'), blank=True, help_text=_('List of qualifications'))
    specialization = models.CharField(_('specialization'), max_length=200, blank=True)
    experience_years = models.PositiveIntegerField(
        _('experience years'),
        default=0,
        validators=[MinValueValidator(0, message=_('Experience years cannot be negative'))]
    )
    
    # Date fields
    birth_date = models.DateField(_('birth date'), null=True, blank=True)
    hire_date = models.DateField(_('hire date'), default=date.today)
    
    # Status
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE
    )
    
    # Additional info
    bio = models.TextField(_('biography'), blank=True)
    profile_picture = models.ImageField(
        _('profile picture'),
        upload_to='teacher_profiles/',
        null=True,
        blank=True
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_teachers',
        verbose_name=_('created by')
    )
    
    class Meta:
        verbose_name = _('teacher')
        verbose_name_plural = _('teachers')
        ordering = ['full_name']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['status']),
            models.Index(fields=['full_name']),
        ]
    
    def clean(self):
        """Validate teacher data."""
        if self.email:
            self.email = self.email.lower().strip()
        
        if self.phone_number:
            # Remove any spaces from phone number
            self.phone_number = re.sub(r'\s+', '', self.phone_number)
        
        # Validate birth date
        if self.birth_date:
            today = date.today()
            age = today.year - self.birth_date.year
            if today.month < self.birth_date.month or (today.month == self.birth_date.month and today.day < self.birth_date.day):
                age -= 1
            
            if age < 18:
                raise ValidationError({
                    'birth_date': _('Teacher must be at least 18 years old')
                })
            if age > 80:
                raise ValidationError({
                    'birth_date': _('Invalid birth date')
                })
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    @property
    def age(self):
        """Calculate age from birth date."""
        if self.birth_date:
            today = date.today()
            age = today.year - self.birth_date.year
            if today.month < self.birth_date.month or (today.month == self.birth_date.month and today.day < self.birth_date.day):
                age -= 1
            return age
        return None
    
    def __str__(self):
        return self.full_name


class TeacherAssignment(models.Model):
    """
    Assign subjects, class levels, and school levels to teachers.
    """
    
    class AssignmentStatus(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')
        COMPLETED = 'completed', _('Completed')
    
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name='assignments',
        verbose_name=_('teacher')
    )
    school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name=_('school level')
    )
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name=_('class level')
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name=_('subject')
    )
    
    # Assignment details
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=AssignmentStatus.choices,
        default=AssignmentStatus.ACTIVE
    )
    academic_year = models.ForeignKey(
        'academics.AcademicYear',
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name=_('academic year'),
        null=True,
        blank=True
    )
    hours_per_week = models.DecimalField(
        _('hours per week'),
        max_digits=4,
        decimal_places=1,
        default=4.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(40)]
    )
    notes = models.TextField(_('notes'), blank=True)
    
    # Timestamps
    assigned_at = models.DateTimeField(_('assigned at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    assigned_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_teacher_subjects',
        verbose_name=_('assigned by')
    )
    
    class Meta:
        verbose_name = _('teacher assignment')
        verbose_name_plural = _('teacher assignments')
        unique_together = [['teacher', 'school_level', 'class_level', 'subject', 'academic_year']]
        ordering = ['teacher', 'school_level', 'class_level', 'subject']
    
    def clean(self):
        """Validate assignment."""
        # Check if class level belongs to school level
        if self.class_level and self.school_level:
            if self.class_level.school_level != self.school_level:
                raise ValidationError(
                    _('Class level "{class_level}" does not belong to school level "{school_level}"').format(
                        class_level=self.class_level.name,
                        school_level=self.school_level.name
                    )
                )
        
        # Check if teacher is active
        if self.teacher.status != 'active':
            raise ValidationError(
                _('Cannot assign subjects to an inactive teacher')
            )
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.subject.name} - {self.class_level.name}"


class SchoolDaySetting(models.Model):
    """
    Settings for school days, timings, and events.
    """
    
    DAYS_OF_WEEK = [
        (0, _('Monday')),
        (1, _('Tuesday')),
        (2, _('Wednesday')),
        (3, _('Thursday')),
        (4, _('Friday')),
        (5, _('Saturday')),
        (6, _('Sunday')),
    ]
    
    school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.CASCADE,
        related_name='day_settings',
        verbose_name=_('school level')
    )
    day_of_week = models.IntegerField(_('day of week'), choices=DAYS_OF_WEEK)
    is_school_day = models.BooleanField(_('is school day'), default=True)
    
    # Timings
    start_time = models.TimeField(_('start time'), null=True, blank=True)
    end_time = models.TimeField(_('end time'), null=True, blank=True)
    
    # Breaks
    morning_break_start = models.TimeField(_('morning break start'), null=True, blank=True)
    morning_break_end = models.TimeField(_('morning break end'), null=True, blank=True)
    lunch_break_start = models.TimeField(_('lunch break start'), null=True, blank=True)
    lunch_break_end = models.TimeField(_('lunch break end'), null=True, blank=True)
    afternoon_break_start = models.TimeField(_('afternoon break start'), null=True, blank=True)
    afternoon_break_end = models.TimeField(_('afternoon break end'), null=True, blank=True)
    
    # Events
    events = models.JSONField(_('special events'), default=list, blank=True, help_text=_('List of events for this day'))
    
    # Academic year specific
    academic_year = models.ForeignKey(
        'academics.AcademicYear',
        on_delete=models.CASCADE,
        related_name='day_settings',
        verbose_name=_('academic year')
    )
    
    # Timestamps
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('school day setting')
        verbose_name_plural = _('school day settings')
        unique_together = [['school_level', 'day_of_week', 'academic_year']]
        ordering = ['school_level', 'day_of_week']
    
    def clean(self):
        """Validate timings."""
        if self.is_school_day:
            if not self.start_time or not self.end_time:
                raise ValidationError(
                    _('Start time and end time are required for school days')
                )
            
            if self.start_time and self.end_time and self.end_time <= self.start_time:
                raise ValidationError(
                    _('End time must be after start time')
                )
            
            # Validate break times
            if self.morning_break_start and self.morning_break_end:
                if self.morning_break_end <= self.morning_break_start:
                    raise ValidationError({
                        'morning_break_end': _('Morning break end time must be after start time')
                    })
            
            if self.lunch_break_start and self.lunch_break_end:
                if self.lunch_break_end <= self.lunch_break_start:
                    raise ValidationError({
                        'lunch_break_end': _('Lunch break end time must be after start time')
                    })
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK)[self.day_of_week]
        return f"{self.school_level.name} - {day_name}"


class Holiday(models.Model):
    """Model for holidays and days off."""
    
    name = models.CharField(_('name'), max_length=200)
    date = models.DateField(_('date'))
    is_recurring = models.BooleanField(_('is recurring yearly'), default=False)
    description = models.TextField(_('description'), blank=True)
    school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.CASCADE,
        related_name='holidays',
        verbose_name=_('school level'),
        null=True,
        blank=True,
        help_text=_('Leave blank for all school levels')
    )
    academic_year = models.ForeignKey(
        'academics.AcademicYear',
        on_delete=models.CASCADE,
        related_name='holidays',
        verbose_name=_('academic year')
    )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('holiday')
        verbose_name_plural = _('holidays')
        unique_together = [['date', 'school_level', 'academic_year']]
        ordering = ['date']
    
    def __str__(self):
        if self.school_level:
            return f"{self.name} - {self.school_level.name} ({self.date})"
        return f"{self.name} - All Levels ({self.date})"


class TeacherTimetable(models.Model):
    """
    Weekly timetable for teachers.
    """
    
    DAYS_OF_WEEK = [
        (0, _('Monday')),
        (1, _('Tuesday')),
        (2, _('Wednesday')),
        (3, _('Thursday')),
        (4, _('Friday')),
        (5, _('Saturday')),
        (6, _('Sunday')),
    ]
    
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name='timetables',
        verbose_name=_('teacher')
    )
    day_of_week = models.IntegerField(_('day of week'), choices=DAYS_OF_WEEK)
    start_time = models.TimeField(_('start time'))
    end_time = models.TimeField(_('end time'))
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='timetables',
        verbose_name=_('subject')
    )
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='timetables',
        verbose_name=_('class level')
    )
    classroom = models.ForeignKey(
        'academics.ClassRoom',
        on_delete=models.CASCADE,
        related_name='timetables',
        verbose_name=_('classroom')
    )
    assignment = models.ForeignKey(
        TeacherAssignment,
        on_delete=models.CASCADE,
        related_name='timetables',
        verbose_name=_('assignment')
    )
    academic_year = models.ForeignKey(
        'academics.AcademicYear',
        on_delete=models.CASCADE,
        related_name='timetables',
        verbose_name=_('academic year')
    )
    week_number = models.PositiveIntegerField(_('week number'), default=1)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('teacher timetable')
        verbose_name_plural = _('teacher timetables')
        unique_together = [
            ['teacher', 'day_of_week', 'start_time', 'academic_year', 'week_number'],
            ['classroom', 'day_of_week', 'start_time', 'academic_year', 'week_number']
        ]
        ordering = ['teacher', 'day_of_week', 'start_time']
    
    def clean(self):
        """Validate timetable entry."""
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError(
                    _('End time must be after start time')
                )
        
        # Check for overlapping timings
        # Teacher conflict
        teacher_conflict = TeacherTimetable.objects.filter(
            teacher=self.teacher,
            day_of_week=self.day_of_week,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time,
            academic_year=self.academic_year,
            week_number=self.week_number
        ).exclude(id=self.id)
        
        if teacher_conflict.exists():
            raise ValidationError(
                _('Teacher already has a class scheduled at this time')
            )
        
        # Classroom conflict
        classroom_conflict = TeacherTimetable.objects.filter(
            classroom=self.classroom,
            day_of_week=self.day_of_week,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time,
            academic_year=self.academic_year,
            week_number=self.week_number
        ).exclude(id=self.id)
        
        if classroom_conflict.exists():
            raise ValidationError(
                _('Classroom is already occupied at this time')
            )
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK)[self.day_of_week]
        return f"{self.teacher.full_name} - {day_name} - {self.start_time} to {self.end_time}"
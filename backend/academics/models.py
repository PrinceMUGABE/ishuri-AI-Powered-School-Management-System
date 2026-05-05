from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator, DecimalValidator
from decimal import Decimal


class AcademicYear(models.Model):
    """Academic year model."""
    
    class Status(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')
        COMPLETED = 'completed', _('Completed')
    
    name = models.CharField(_('name'), max_length=100, help_text=_('e.g., 2024-2025'))
    start_date = models.DateField(_('start date'))
    end_date = models.DateField(_('end date'))
    status = models.CharField(_('status'), max_length=20, choices=Status.choices, default=Status.INACTIVE)
    is_current = models.BooleanField(_('is current'), default=False)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('academic year')
        verbose_name_plural = _('academic years')
        ordering = ['-start_date']
        unique_together = ['name', 'start_date']
    
    def __str__(self):
        return self.name
    
    def save(self, *args, **kwargs):
        """Ensure only one academic year can be current at a time."""
        if self.is_current:
            AcademicYear.objects.filter(is_current=True).exclude(id=self.id).update(is_current=False)
        super().save(*args, **kwargs)


class SchoolLevel(models.Model):
    """School level model (e.g., Primary, Secondary, High School)."""
    
    class LevelType(models.TextChoices):
        PRE_PRIMARY = 'pre_primary', _('Pre-Primary')
        PRIMARY = 'primary', _('Primary')
        SECONDARY = 'secondary', _('Secondary')
        HIGH_SCHOOL = 'high_school', _('High School')
    
    name = models.CharField(_('name'), max_length=100, help_text=_('e.g., Primary School'))
    level_type = models.CharField(_('level type'), max_length=20, choices=LevelType.choices)
    description = models.TextField(_('description'), blank=True)
    order = models.IntegerField(_('order'), default=0, help_text=_('Display order'))
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('school level')
        verbose_name_plural = _('school levels')
        ordering = ['order', 'name']
    
    def __str__(self):
        return self.name


class ClassLevel(models.Model):
    """Class level model (e.g., Primary 1, Primary 2, Senior 1)."""
    
    class Category(models.TextChoices):
        PRE_PRIMARY = 'pre_primary', _('Pre-Primary')
        PRIMARY = 'primary', _('Primary')
        ORDINARY_LEVEL = 'ordinary_level', _('Ordinary Level (S1-S3)')
        ADVANCED_LEVEL = 'advanced_level', _('Advanced Level (S4-S6)')
    
    class TeachingFrequency(models.TextChoices):
        DAILY = 'daily', _('Daily (Everyday)')
        WEEKLY = 'weekly', _('Weekly (Once a week)')
        BI_WEEKLY = 'bi_weekly', _('Bi-Weekly (Twice a week)')
    
    # Basic information
    name = models.CharField(_('name'), max_length=50, help_text=_('e.g., Primary 1, Senior 1'))
    category = models.CharField(_('category'), max_length=20, choices=Category.choices)
    school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.CASCADE,
        related_name='class_levels',
        verbose_name=_('school level')
    )
    
    # Academic details
    code = models.CharField(_('code'), max_length=20, unique=True, help_text=_('e.g., P1, S1'))
    description = models.TextField(_('description'), blank=True)
    order = models.IntegerField(_('order'), default=0, help_text=_('Display order'))
    is_active = models.BooleanField(_('is active'), default=True)
    
    # Default teaching frequency for subjects in this class level
    default_teaching_frequency = models.CharField(
        _('default teaching frequency'),
        max_length=20,
        choices=TeachingFrequency.choices,
        default=TeachingFrequency.DAILY,
        help_text=_('Default frequency for subjects taught at this level')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('class level')
        verbose_name_plural = _('class levels')
        ordering = ['order', 'name']
        unique_together = ['name', 'school_level']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class ClassRoom(models.Model):
    """Class room/section model (e.g., Primary 1A, Primary 1B, Primary 1C)."""
    
    class RoomType(models.TextChoices):
        STANDARD = 'standard', _('Standard Classroom')
        LABORATORY = 'laboratory', _('Laboratory')
        WORKSHOP = 'workshop', _('Workshop')
        STUDIO = 'studio', _('Studio')
    
    class Shift(models.TextChoices):
        MORNING = 'morning', _('Morning Shift')
        AFTERNOON = 'afternoon', _('Afternoon Shift')
        EVENING = 'evening', _('Evening Shift')
        FULL_DAY = 'full_day', _('Full Day')
    
    # Basic information
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='class_rooms',
        verbose_name=_('class level')
    )
    name = models.CharField(_('name'), max_length=50, help_text=_('e.g., A, B, C, or Alpha, Beta'))
    full_name = models.CharField(_('full name'), max_length=100, blank=True, help_text=_('e.g., Primary 1A'))
    code = models.CharField(_('code'), max_length=20, unique=True, help_text=_('e.g., P1A, P1B'))
    
    # Classroom details
    room_type = models.CharField(_('room type'), max_length=20, choices=RoomType.choices, default=RoomType.STANDARD)
    shift = models.CharField(_('shift'), max_length=20, choices=Shift.choices, default=Shift.MORNING)
    capacity = models.PositiveIntegerField(_('capacity'), default=30, validators=[MinValueValidator(1), MaxValueValidator(100)])
    current_enrollment = models.PositiveIntegerField(_('current enrollment'), default=0)
    
    # Additional info
    homeroom_teacher = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='homeroom_classes',
        verbose_name=_('homeroom teacher'),
        limit_choices_to={'role': 'teacher'}
    )
    is_active = models.BooleanField(_('is active'), default=True)
    description = models.TextField(_('description'), blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('class room')
        verbose_name_plural = _('class rooms')
        ordering = ['class_level', 'name']
        unique_together = ['class_level', 'name']
    
    def __str__(self):
        return self.full_name or f"{self.class_level.name} {self.name}"
    
    def save(self, *args, **kwargs):
        """Auto-generate full_name if not provided."""
        if not self.full_name:
            self.full_name = f"{self.class_level.name} {self.name}"
        super().save(*args, **kwargs)


class Subject(models.Model):
    """Subject model (e.g., Mathematics, English, Physics)."""
    
    class SubjectCategory(models.TextChoices):
        CORE = 'core', _('Core Subject')
        ELECTIVE = 'elective', _('Elective')
        VOCATIONAL = 'vocational', _('Vocational')
        EXTRA_CURRICULAR = 'extra_curricular', _('Extra Curricular')
    
    class GradingSystem(models.TextChoices):
        NUMERIC = 'numeric', _('Numeric (0-100)')
        LETTER = 'letter', _('Letter Grade (A-F)')
        PASS_FAIL = 'pass_fail', _('Pass/Fail')
    
    # Basic information
    name = models.CharField(_('name'), max_length=100, help_text=_('e.g., Mathematics'))
    code = models.CharField(_('code'), max_length=20, unique=True, help_text=_('e.g., MATH101'))
    category = models.CharField(_('category'), max_length=20, choices=SubjectCategory.choices, default=SubjectCategory.CORE)
    
    # Academic details
    description = models.TextField(_('description'), blank=True)
    grading_system = models.CharField(_('grading system'), max_length=20, choices=GradingSystem.choices, default=GradingSystem.NUMERIC)
    pass_mark = models.DecimalField(
        _('pass mark'),
        max_digits=5,
        decimal_places=2,
        default=50.00,
        validators=[MinValueValidator(0), MaxValueValidator(100)]
    )
    
    # Icon and color for UI
    icon = models.CharField(_('icon'), max_length=50, blank=True, help_text=_('FontAwesome icon class'))
    color = models.CharField(_('color'), max_length=20, blank=True, help_text=_('CSS color code'))
    
    # Flags
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('subject')
        verbose_name_plural = _('subjects')
        ordering = ['name']
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class ClassLevelSubject(models.Model):
    """
    Class level subject assignment model.
    Defines which subjects are taught at which class level and how often.
    """
    
    class Status(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')
        DROPPED = 'dropped', _('Dropped')
    
    class Term(models.TextChoices):
        TERM_1 = 'term_1', _('Term 1')
        TERM_2 = 'term_2', _('Term 2')
        TERM_3 = 'term_3', _('Term 3')
        FULL_YEAR = 'full_year', _('Full Year')
    
    # Relationships
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='class_level_subjects',
        verbose_name=_('class level')
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='class_level_subjects',
        verbose_name=_('subject')
    )
    
    # Teaching frequency
    teaching_frequency = models.CharField(
        _('teaching frequency'),
        max_length=20,
        choices=ClassLevel.TeachingFrequency.choices,
        help_text=_('How often this subject is taught')
    )
    
    # Weekly/Daily hours
    hours_per_week = models.DecimalField(
        _('hours per week'),
        max_digits=4,
        decimal_places=1,
        default=4.0,
        validators=[MinValueValidator(0.5), MaxValueValidator(40)]
    )
    hours_per_day = models.DecimalField(
        _('hours per day'),
        max_digits=3,
        decimal_places=1,
        default=1.0,
        validators=[MinValueValidator(0), MaxValueValidator(8)]
    )
    
    # Academic details
    term_offered = models.CharField(_('term offered'), max_length=20, choices=Term.choices, default=Term.FULL_YEAR)
    status = models.CharField(_('status'), max_length=20, choices=Status.choices, default=Status.ACTIVE)
    
    # Additional info
    is_compulsory = models.BooleanField(_('is compulsory'), default=True)
    notes = models.TextField(_('notes'), blank=True)
    
    # Ordering
    order = models.IntegerField(_('order'), default=0, help_text=_('Display order in curriculum'))
    
    # Timestamps
    assigned_at = models.DateTimeField(_('assigned at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('class level subject')
        verbose_name_plural = _('class level subjects')
        ordering = ['class_level', 'order', 'subject__name']
        unique_together = ['class_level', 'subject']
    
    def __str__(self):
        frequency_display = self.get_teaching_frequency_display()
        return f"{self.class_level.name} - {self.subject.name} ({frequency_display})"
    
    @property
    def hours_per_term(self):
        """Calculate total hours per term (assuming 12 weeks per term)."""
        return self.hours_per_week * 12
    
    @property
    def hours_per_academic_year(self):
        """Calculate total hours per academic year (assuming 3 terms)."""
        return self.hours_per_week * 36


class ClassLevelCost(models.Model):
    """Cost/fee structure for each class level."""
    
    class PaymentType(models.TextChoices):
        TUITION = 'tuition', _('Tuition Fee')
        REGISTRATION = 'registration', _('Registration Fee')
        EXAMINATION = 'examination', _('Examination Fee')
        LIBRARY = 'library', _('Library Fee')
        SPORTS = 'sports', _('Sports Fee')
        LABORATORY = 'laboratory', _('Laboratory Fee')
        UNIFORM = 'uniform', _('Uniform Fee')
        TRANSPORT = 'transport', _('Transport Fee')
        MEAL = 'meal', _('Meal Fee')
        OTHER = 'other', _('Other')
    
    class Frequency(models.TextChoices):
        ONE_TIME = 'one_time', _('One Time')
        TERMLY = 'termly', _('Termly')
        ANNUALLY = 'annually', _('Annually')
        MONTHLY = 'monthly', _('Monthly')
    
    # Relationships
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='costs',
        verbose_name=_('class level')
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='class_level_costs',
        verbose_name=_('academic year'),
        null=True,
        blank=True
    )
    
    # Cost details
    name = models.CharField(_('name'), max_length=100, help_text=_('e.g., Primary 1 Tuition'))
    payment_type = models.CharField(_('payment type'), max_length=20, choices=PaymentType.choices)
    frequency = models.CharField(_('frequency'), max_length=20, choices=Frequency.choices)
    
    amount = models.DecimalField(
        _('amount'),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'))]
    )
    
    # Additional info
    description = models.TextField(_('description'), blank=True)
    is_mandatory = models.BooleanField(_('is mandatory'), default=True)
    is_active = models.BooleanField(_('is active'), default=True)
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('class level cost')
        verbose_name_plural = _('class level costs')
        ordering = ['class_level', 'payment_type', 'amount']
    
    def __str__(self):
        return f"{self.class_level.name} - {self.get_payment_type_display()}: {self.amount}"
    
    @property
    def formatted_amount(self):
        return f"RWF {self.amount:,.2f}"


class ClassRoomSubject(models.Model):
    """
    Specific subject assignment to a particular classroom with a specific teacher.
    This extends ClassLevelSubject by assigning to a specific room/class.
    """
    
    # Relationships
    class_room = models.ForeignKey(
        ClassRoom,
        on_delete=models.CASCADE,
        related_name='class_room_subjects',
        verbose_name=_('class room')
    )
    class_level_subject = models.ForeignKey(
        ClassLevelSubject,
        on_delete=models.CASCADE,
        related_name='class_room_subjects',
        verbose_name=_('class level subject')
    )
    teacher = models.ForeignKey(
        'accounts.User',
        on_delete=models.SET_NULL,
        null=True,
        related_name='taught_subjects',
        verbose_name=_('teacher'),
        limit_choices_to={'role': 'teacher'}
    )
    
    # Schedule
    days_of_week = models.JSONField(_('days of week'), default=list, help_text=_('List of days (0-6)'))
    start_time = models.TimeField(_('start time'), null=True, blank=True)
    end_time = models.TimeField(_('end time'), null=True, blank=True)
    
    # Status
    is_active = models.BooleanField(_('is active'), default=True)
    
    # Timestamps
    assigned_at = models.DateTimeField(_('assigned at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('class room subject')
        verbose_name_plural = _('class room subjects')
        unique_together = ['class_room', 'class_level_subject']
    
    def __str__(self):
        teacher_name = self.teacher.username if self.teacher else 'No teacher assigned'
        return f"{self.class_room.full_name} - {self.class_level_subject.subject.name} ({teacher_name})"
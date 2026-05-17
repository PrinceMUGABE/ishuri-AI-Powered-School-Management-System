# academics/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date, datetime, timedelta


# ---------------------------------------------------------------------------
# AcademicYear
# ---------------------------------------------------------------------------

class AcademicYear(models.Model):
    """
    Academic year model with validations.
    """

    name = models.CharField(
        _('name'),
        max_length=100,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^\d{4}-\d{4}$',
                message=_('Year name must be in format YYYY-YYYY (e.g., 2024-2025)')
            )
        ]
    )
    start_date = models.DateField(_('start date'))
    end_date = models.DateField(_('end date'))
    is_current = models.BooleanField(_('is current'), default=False)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('academic year')
        verbose_name_plural = _('academic years')
        ordering = ['-start_date']
        indexes = [
            models.Index(fields=['name']),
            models.Index(fields=['is_current']),
            models.Index(fields=['start_date', 'end_date']),
        ]

    def clean(self):
        errors = {}
        
        # Validate dates
        if self.start_date and self.end_date:
            if self.end_date <= self.start_date:
                errors['end_date'] = _('End date must be after start date')
        
        # Validate name matches dates
        if self.name and self.start_date and self.end_date:
            expected_name = f"{self.start_date.year}-{self.end_date.year}"
            if self.name != expected_name:
                errors['name'] = _(f'Academic year name should be {expected_name} to match the dates')
        
        # Validate no overlapping academic years
        overlapping = AcademicYear.objects.filter(
            start_date__lte=self.end_date,
            end_date__gte=self.start_date
        )
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
        
        if overlapping.exists():
            errors['__all__'] = _('This academic year overlaps with existing year: {}').format(
                overlapping.first().name
            )
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.is_current:
            AcademicYear.objects.filter(is_current=True).exclude(id=self.id).update(
                is_current=False
            )
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# Term
# ---------------------------------------------------------------------------

class Term(models.Model):
    """
    Academic term / trimester model.
    """

    class TermNumber(models.IntegerChoices):
        FIRST = 1, _('First Term')
        SECOND = 2, _('Second Term')
        THIRD = 3, _('Third Term')

    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='terms',
        verbose_name=_('academic year'),
    )
    term_number = models.IntegerField(_('term number'), choices=TermNumber.choices)
    name = models.CharField(_('name'), max_length=100)
    start_date = models.DateField(_('start date'))
    end_date = models.DateField(_('end date'))
    is_current = models.BooleanField(_('is current'), default=False)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('term')
        verbose_name_plural = _('terms')
        ordering = ['academic_year', 'term_number']
        unique_together = [['academic_year', 'term_number']]
        indexes = [
            models.Index(fields=['academic_year', 'is_current']),
            models.Index(fields=['start_date', 'end_date']),
        ]

    def clean(self):
        errors = {}
        
        # Validate dates
        if self.start_date and self.end_date:
            if self.end_date <= self.start_date:
                errors['end_date'] = _('End date must be after start date')
        
        # Validate dates are within academic year
        if self.academic_year_id and self.start_date and self.end_date:
            if self.start_date < self.academic_year.start_date:
                errors['start_date'] = _('Start date cannot be before academic year start date ({})').format(
                    self.academic_year.start_date
                )
            if self.end_date > self.academic_year.end_date:
                errors['end_date'] = _('End date cannot be after academic year end date ({})').format(
                    self.academic_year.end_date
                )
        
        # Validate no overlapping terms
        if self.academic_year_id and self.start_date and self.end_date:
            overlapping = Term.objects.filter(
                academic_year=self.academic_year,
                start_date__lte=self.end_date,
                end_date__gte=self.start_date
            )
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
            
            if overlapping.exists():
                errors['__all__'] = _('This term overlaps with existing term: {}').format(
                    overlapping.first().name
                )
        
        # Validate term number is unique within academic year
        if self.academic_year_id and self.term_number:
            if Term.objects.filter(
                academic_year=self.academic_year,
                term_number=self.term_number
            ).exclude(pk=self.pk).exists():
                errors['term_number'] = _('Term number {} already exists for this academic year').format(
                    self.get_term_number_display()
                )
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        if self.is_current:
            Term.objects.filter(
                academic_year=self.academic_year, is_current=True
            ).exclude(id=self.id).update(is_current=False)
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.academic_year.name} - {self.name}"


# ---------------------------------------------------------------------------
# SchoolLevel
# ---------------------------------------------------------------------------

class SchoolLevel(models.Model):
    """
    School level model (e.g. Primary, Secondary).
    """

    name = models.CharField(
        _('name'),
        max_length=100,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[a-zA-Z\s\-]+$',
                message=_('School level name can only contain letters, spaces, and hyphens')
            )
        ]
    )
    description = models.TextField(_('description'), blank=True, default='')
    is_active = models.BooleanField(_('is active'), default=True)
    start_time = models.TimeField(
        _('start time'), null=True, blank=True,
        help_text=_('Daily start time for this school level (e.g. 08:00)')
    )
    end_time = models.TimeField(
        _('end time'), null=True, blank=True,
        help_text=_('Daily end time for this school level (e.g. 16:00)')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('school level')
        verbose_name_plural = _('school levels')
        ordering = ['name']

    def clean(self):
        errors = {}
        
        # Validate times
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                errors['end_time'] = _('End time must be after start time')
            
            # Validate minimum school day duration (at least 2 hours)
            start_dt = datetime.combine(date.today(), self.start_time)
            end_dt = datetime.combine(date.today(), self.end_time)
            duration_hours = (end_dt - start_dt).total_seconds() / 3600
            
            if duration_hours < 2:
                errors['__all__'] = _('School day must be at least 2 hours long')
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip().title()
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.class_levels.filter(is_active=True).exists():
            raise ValidationError(
                _('Cannot delete school level because it has active class levels.')
            )
        super().delete(*args, **kwargs)

    def get_net_teaching_minutes_per_day(self):
        """Net teaching minutes after subtracting active break durations."""
        if not self.start_time or not self.end_time:
            return 0
        start_dt = datetime.combine(date.today(), self.start_time)
        end_dt = datetime.combine(date.today(), self.end_time)
        total_minutes = int((end_dt - start_dt).total_seconds() / 60)
        break_minutes = sum(
            b.duration_minutes for b in self.breaks.filter(is_active=True)
        )
        return max(0, total_minutes - break_minutes)

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# ClassLevel
# ---------------------------------------------------------------------------

class ClassLevel(models.Model):
    """
    Class level model (e.g. P1, P2, S1, S2).
    """

    name = models.CharField(_('name'), max_length=50)
    code = models.CharField(
        _('code'),
        max_length=20,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[A-Z0-9]+$',
                message=_('Class code must contain only uppercase letters and numbers')
            )
        ]
    )
    school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.CASCADE,
        related_name='class_levels',
        verbose_name=_('school level'),
    )
    description = models.TextField(_('description'), blank=True, default='')
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('class level')
        verbose_name_plural = _('class levels')
        ordering = ['school_level', 'name']
        unique_together = [['name', 'school_level']]
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['school_level', 'is_active']),
        ]

    def clean(self):
        errors = {}
        
        # Clean name and code
        if self.name:
            self.name = self.name.strip()
            if len(self.name) < 1:
                errors['name'] = _('Class level name cannot be empty')
        
        if self.code:
            self.code = self.code.upper().strip()
        
        # Validate school level is active
        if self.school_level_id and not self.school_level.is_active:
            errors['school_level'] = _('Cannot assign class level to an inactive school level')
        
        # Validate unique name within school level
        if self.name and self.school_level_id:
            if ClassLevel.objects.filter(
                name=self.name, 
                school_level=self.school_level
            ).exclude(id=self.pk).exists():
                errors['name'] = _('Class level name "{}" already exists in this school level').format(self.name)
        
        # Validate code is unique
        if self.code:
            if ClassLevel.objects.filter(code=self.code).exclude(id=self.pk).exists():
                errors['code'] = _('Class level code "{}" already exists').format(self.code)
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.subjects.exists():
            raise ValidationError(
                _('Cannot delete class level because it has assigned subjects.')
            )
        if self.costs.exists():
            raise ValidationError(
                _('Cannot delete class level because it has fee structures.')
            )
        if self.assigned_classrooms.exists():
            raise ValidationError(
                _('Cannot delete class level because it has assigned classrooms.')
            )
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"


# ---------------------------------------------------------------------------
# ClassRoom
# ---------------------------------------------------------------------------

class ClassRoom(models.Model):
    """
    Classroom model.
    A classroom can be assigned to ONE class level.
    A class level can have MULTIPLE classrooms.
    """

    class RoomType(models.TextChoices):
        STANDARD = 'standard', _('Standard')
        LABORATORY = 'laboratory', _('Laboratory')
        WORKSHOP = 'workshop', _('Workshop')
        AUDITORIUM = 'auditorium', _('Auditorium')

    class RoomStatus(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')

    name = models.CharField(_('name'), max_length=50)
    code = models.CharField(
        _('code'),
        max_length=20,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[A-Z0-9]+$',
                message=_('Room code must contain only uppercase letters and numbers')
            )
        ]
    )
    room_type = models.CharField(
        _('room type'),
        max_length=20,
        choices=RoomType.choices,
        default=RoomType.STANDARD,
    )
    capacity = models.PositiveIntegerField(
        _('capacity'),
        default=30,
        validators=[
            MinValueValidator(1, message=_('Capacity must be at least 1')),
            MaxValueValidator(200, message=_('Capacity cannot exceed 200')),
        ]
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=RoomStatus.choices,
        default=RoomStatus.ACTIVE,
    )
    # ForeignKey relationship (NOT OneToOne)
    assigned_class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='assigned_classrooms',
        verbose_name=_('assigned class level'),
        help_text=_('The class level currently assigned to this classroom.')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('class room')
        verbose_name_plural = _('class rooms')
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['status']),
            models.Index(fields=['assigned_class_level']),
        ]

    def clean(self):
        errors = {}
        
        # Clean name and code
        if self.name:
            self.name = self.name.strip()
            if len(self.name) < 2:
                errors['name'] = _('Classroom name must be at least 2 characters')
        
        if self.code:
            self.code = self.code.upper().strip()
        
        # Validate unique name
        if self.name:
            if ClassRoom.objects.filter(name=self.name).exclude(id=self.pk).exists():
                errors['name'] = _('Classroom name "{}" already exists').format(self.name)
        
        # Validate unique code
        if self.code:
            if ClassRoom.objects.filter(code=self.code).exclude(id=self.pk).exists():
                errors['code'] = _('Classroom code "{}" already exists').format(self.code)
        
        # Validate assigned class level is active
        if self.assigned_class_level and not self.assigned_class_level.is_active:
            errors['assigned_class_level'] = _('Cannot assign classroom to an inactive class level')
        
        # Validate classroom capacity is reasonable for room type
        if self.room_type == 'laboratory' and self.capacity > 40:
            errors['capacity'] = _('Laboratory capacity cannot exceed 40 students')
        elif self.room_type == 'workshop' and self.capacity > 30:
            errors['capacity'] = _('Workshop capacity cannot exceed 30 students')
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        assigned = f" → {self.assigned_class_level.name}" if self.assigned_class_level else " (unassigned)"
        return f"{self.name} ({self.code}){assigned}"


# ---------------------------------------------------------------------------
# Subject
# ---------------------------------------------------------------------------

class Subject(models.Model):
    """
    Subject model.
    """

    class SubjectStatus(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')

    name = models.CharField(_('name'), max_length=100)
    code = models.CharField(
        _('code'),
        max_length=20,
        unique=True,
        validators=[
            RegexValidator(
                regex=r'^[A-Z0-9]+$',
                message=_('Subject code must contain only uppercase letters and numbers')
            )
        ]
    )
    pass_mark = models.DecimalField(
        _('pass mark'),
        max_digits=5,
        decimal_places=2,
        default=Decimal('50.00'),
        validators=[
            MinValueValidator(0, message=_('Pass mark cannot be less than 0')),
            MaxValueValidator(100, message=_('Pass mark cannot exceed 100')),
        ]
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=SubjectStatus.choices,
        default=SubjectStatus.ACTIVE,
    )
    description = models.TextField(_('description'), blank=True, default='')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('subject')
        verbose_name_plural = _('subjects')
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['status']),
        ]

    def clean(self):
        errors = {}
        
        # Clean name and code
        if self.name:
            self.name = self.name.strip().title()
            if len(self.name) < 2:
                errors['name'] = _('Subject name must be at least 2 characters')
        
        if self.code:
            self.code = self.code.upper().strip()
        
        # Validate unique name
        if self.name:
            if Subject.objects.filter(name__iexact=self.name).exclude(id=self.pk).exists():
                errors['name'] = _('Subject name "{}" already exists').format(self.name)
        
        # Validate unique code
        if self.code:
            if Subject.objects.filter(code=self.code).exclude(id=self.pk).exists():
                errors['code'] = _('Subject code "{}" already exists').format(self.code)
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.class_levels.exists():
            raise ValidationError(
                _('Cannot delete subject because it is assigned to class levels.')
            )
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"{self.name} ({self.code})"


# ---------------------------------------------------------------------------
# ClassLevelSubject
# ---------------------------------------------------------------------------

class ClassLevelSubject(models.Model):
    """
    Assignment of a subject to a class level, including teaching hours and frequency.
    """

    class TeachingFrequency(models.TextChoices):
        DAILY = 'daily', _('Daily')
        WEEKLY = 'weekly', _('Weekly')

    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='subjects',
        verbose_name=_('class level'),
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='class_levels',
        verbose_name=_('subject'),
    )
    teaching_frequency = models.CharField(
        _('teaching frequency'),
        max_length=20,
        choices=TeachingFrequency.choices,
        default=TeachingFrequency.DAILY,
    )
    hours_per_week = models.DecimalField(
        _('hours per week'),
        max_digits=4,
        decimal_places=1,
        default=Decimal('4.0'),
        validators=[
            MinValueValidator(Decimal('0.5'), message=_('Hours per week must be at least 0.5')),
            MaxValueValidator(Decimal('40'), message=_('Hours per week cannot exceed 40')),
        ]
    )
    is_compulsory = models.BooleanField(_('is compulsory'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('class level subject')
        verbose_name_plural = _('class level subjects')
        unique_together = [['class_level', 'subject']]
        indexes = [
            models.Index(fields=['class_level', 'subject']),
            models.Index(fields=['teaching_frequency']),
        ]

    def clean(self):
        errors = {}
        
        # Validate class level is active
        if self.class_level_id and not self.class_level.is_active:
            errors['class_level'] = _('Cannot assign subject to an inactive class level')
        
        # Validate subject is active
        if self.subject_id and self.subject.status != 'active':
            errors['subject'] = _('Cannot assign an inactive subject')
        
        # Validate hours per week based on frequency
        if self.teaching_frequency == self.TeachingFrequency.DAILY:
            if self.hours_per_week > 30:
                errors['hours_per_week'] = _('For daily teaching, hours per week cannot exceed 30')
            # Daily teaching should be at least 1 hour per week
            if self.hours_per_week < 1:
                errors['hours_per_week'] = _('For daily teaching, hours per week must be at least 1')
        elif self.teaching_frequency == self.TeachingFrequency.WEEKLY:
            if self.hours_per_week > 10:
                errors['hours_per_week'] = _('For weekly teaching, hours per week cannot exceed 10')
        
        # Validate total weekly hours for the class level doesn't exceed available hours
        if self.class_level_id and not self.pk:  # Only for new assignments
            school_level = self.class_level.school_level
            if school_level.start_time and school_level.end_time:
                # Calculate available teaching hours per week (assuming 5-day week)
                start_dt = datetime.combine(date.today(), school_level.start_time)
                end_dt = datetime.combine(date.today(), school_level.end_time)
                daily_minutes = (end_dt - start_dt).total_seconds() / 60
                # Subtract break times
                break_minutes = sum(
                    b.duration_minutes for b in school_level.breaks.filter(is_active=True)
                )
                net_daily_minutes = max(0, daily_minutes - break_minutes)
                weekly_available_hours = (net_daily_minutes * 5) / 60  # 5 days per week
                
                # Sum existing hours
                existing_hours = sum(
                    float(cls.hours_per_week) 
                    for cls in ClassLevelSubject.objects.filter(class_level=self.class_level)
                )
                
                if existing_hours + float(self.hours_per_week) > weekly_available_hours:
                    errors['__all__'] = _(
                        'Total weekly hours ({}) would exceed available teaching hours ({}) for this class level'
                    ).format(existing_hours + float(self.hours_per_week), round(weekly_available_hours, 1))
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.class_level.name} - {self.subject.name}"


# ---------------------------------------------------------------------------
# PaymentType
# ---------------------------------------------------------------------------

class PaymentType(models.Model):
    """
    Payment type model.
    """

    name = models.CharField(_('name'), max_length=100, unique=True)
    code = models.CharField(_('code'), max_length=20, unique=True)
    description = models.TextField(_('description'), blank=True, default='')
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('payment type')
        verbose_name_plural = _('payment types')
        ordering = ['name']
        indexes = [
            models.Index(fields=['code']),
            models.Index(fields=['is_active']),
        ]

    def clean(self):
        errors = {}
        
        if self.name:
            self.name = self.name.strip().title()
        
        if self.code:
            self.code = self.code.upper().strip()
            if len(self.code) < 2:
                errors['code'] = _('Payment type code must be at least 2 characters')
        
        # Validate unique code
        if self.code:
            if PaymentType.objects.filter(code=self.code).exclude(id=self.pk).exists():
                errors['code'] = _('Payment type code "{}" already exists').format(self.code)
        
        # Validate unique name
        if self.name:
            if PaymentType.objects.filter(name__iexact=self.name).exclude(id=self.pk).exists():
                errors['name'] = _('Payment type name "{}" already exists').format(self.name)
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return self.name


# ---------------------------------------------------------------------------
# ClassLevelCost
# ---------------------------------------------------------------------------

class ClassLevelCost(models.Model):
    """
    Fee structure model.
    """

    name = models.CharField(_('name'), max_length=100)
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='costs',
        verbose_name=_('academic year'),
    )
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='costs',
        verbose_name=_('class level'),
    )
    payment_type = models.ForeignKey(
        PaymentType,
        on_delete=models.CASCADE,
        related_name='costs',
        verbose_name=_('payment type'),
    )
    amount = models.DecimalField(
        _('amount'),
        max_digits=12,
        decimal_places=2,
        validators=[
            MinValueValidator(Decimal('0.01'), message=_('Amount must be greater than 0')),
            MaxValueValidator(Decimal('99999999.99'), message=_('Amount cannot exceed 99,999,999.99')),
        ]
    )
    is_mandatory = models.BooleanField(_('is mandatory'), default=True)
    description = models.TextField(_('description'), blank=True, default='')
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('fee structure')
        verbose_name_plural = _('fee structures')
        ordering = ['class_level', 'name']
        unique_together = [['class_level', 'name', 'academic_year']]
        indexes = [
            models.Index(fields=['class_level', 'academic_year']),
            models.Index(fields=['payment_type']),
        ]

    def clean(self):
        errors = {}
        
        if self.name:
            self.name = self.name.strip().title()
        
        # Validate class level is active
        if self.class_level_id and not self.class_level.is_active:
            errors['class_level'] = _('Cannot add fee structure for inactive class level')
        
        # Validate payment type is active
        if self.payment_type_id and not self.payment_type.is_active:
            errors['payment_type'] = _('Cannot use inactive payment type')
        
        # Validate amount is reasonable
        if self.amount and self.amount > 10000000:  # 10 million RWF
            errors['amount'] = _('Amount seems unusually high. Please verify.')
        
        # Validate unique fee structure
        if self.class_level_id and self.name and self.academic_year_id:
            if ClassLevelCost.objects.filter(
                class_level=self.class_level,
                name=self.name,
                academic_year=self.academic_year
            ).exclude(id=self.pk).exists():
                errors['__all__'] = _('Fee structure "{}" already exists for this class level and academic year').format(self.name)
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.name} - {self.class_level.name} ({self.payment_type.name})"


# ---------------------------------------------------------------------------
# SchoolDaySetting
# ---------------------------------------------------------------------------

class SchoolDaySetting(models.Model):
    """
    Defines whether a given weekday is a learning day or a day-off for an academic year.
    """

    class WeekDay(models.IntegerChoices):
        MONDAY = 0, _('Monday')
        TUESDAY = 1, _('Tuesday')
        WEDNESDAY = 2, _('Wednesday')
        THURSDAY = 3, _('Thursday')
        FRIDAY = 4, _('Friday')
        SATURDAY = 5, _('Saturday')
        SUNDAY = 6, _('Sunday')

    class DayType(models.TextChoices):
        LEARNING = 'learning', _('Learning Day')
        DAY_OFF = 'day_off', _('Day Off')
        SPECIAL = 'special', _('Special Learning Day')

    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='academic_year_day_settings',
        verbose_name=_('academic year'),
    )
    day_type = models.CharField(
        _('day type'),
        max_length=20,
        choices=DayType.choices,
        default=DayType.LEARNING,
    )
    weekday = models.IntegerField(
        _('weekday'),
        choices=WeekDay.choices,
        null=True,
        blank=True,
    )
    specific_date = models.DateField(_('specific date'), null=True, blank=True)
    description = models.TextField(_('description'), blank=True, default='')
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('school day setting')
        verbose_name_plural = _('school day settings')
        ordering = ['academic_year', 'specific_date', 'weekday']
        indexes = [
            models.Index(fields=['academic_year', 'day_type']),
            models.Index(fields=['specific_date']),
        ]

    def clean(self):
        errors = {}
        
        # Either weekday or specific_date must be provided, not both
        if self.weekday is not None and self.specific_date:
            errors['__all__'] = _('Provide either a weekday OR a specific date, not both')
        elif self.weekday is None and not self.specific_date:
            errors['__all__'] = _('Either weekday or specific date must be provided')
        
        # Validate specific date is within academic year
        if self.specific_date and self.academic_year_id:
            if self.specific_date < self.academic_year.start_date:
                errors['specific_date'] = _('Date cannot be before academic year start date ({})').format(
                    self.academic_year.start_date
                )
            if self.specific_date > self.academic_year.end_date:
                errors['specific_date'] = _('Date cannot be after academic year end date ({})').format(
                    self.academic_year.end_date
                )
        
        # Prevent duplicate settings
        if self.academic_year_id:
            if self.weekday is not None:
                if SchoolDaySetting.objects.filter(
                    academic_year=self.academic_year,
                    weekday=self.weekday
                ).exclude(id=self.pk).exists():
                    errors['weekday'] = _('Setting for this weekday already exists for this academic year')
            
            if self.specific_date:
                if SchoolDaySetting.objects.filter(
                    academic_year=self.academic_year,
                    specific_date=self.specific_date
                ).exclude(id=self.pk).exists():
                    errors['specific_date'] = _('Setting for this date already exists for this academic year')
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        if self.specific_date:
            return f"{self.get_day_type_display()}: {self.specific_date}"
        return f"{self.get_day_type_display()}: {self.get_weekday_display()}"


# ---------------------------------------------------------------------------
# SchoolBreak
# ---------------------------------------------------------------------------

class SchoolBreak(models.Model):
    """
    Break periods during the school day for a specific school level.
    """

    class BreakType(models.TextChoices):
        SHORT_BREAK = 'short_break', _('Short Break')
        LUNCH = 'lunch', _('Lunch Break')
        RECESS = 'recess', _('Recess')
        OTHER = 'other', _('Other')

    name = models.CharField(_('break name'), max_length=100)
    break_type = models.CharField(
        _('break type'),
        max_length=20,
        choices=BreakType.choices,
        default=BreakType.SHORT_BREAK,
    )
    school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.CASCADE,
        related_name='breaks',
        verbose_name=_('school level'),
        help_text=_('School level this break applies to'),
    )
    start_time = models.TimeField(_('start time'))
    end_time = models.TimeField(_('end time'))
    duration_minutes = models.PositiveIntegerField(
        _('duration (minutes)'),
        editable=False,
        default=0,
        help_text=_('Automatically calculated from start and end time'),
    )
    description = models.TextField(_('description'), blank=True, default='')
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('school break')
        verbose_name_plural = _('school breaks')
        ordering = ['school_level', 'start_time']
        unique_together = [['school_level', 'name']]
        indexes = [
            models.Index(fields=['school_level', 'is_active']),
            models.Index(fields=['break_type']),
        ]

    def clean(self):
        errors = {}
        
        if not self.start_time or not self.end_time:
            if errors:
                raise ValidationError(errors)
            return
        
        # Validate end time after start time
        if self.end_time <= self.start_time:
            errors['end_time'] = _('End time must be after start time')
        
        # Calculate and validate duration
        start_dt = datetime.combine(date.today(), self.start_time)
        end_dt = datetime.combine(date.today(), self.end_time)
        duration = int((end_dt - start_dt).total_seconds() / 60)
        self.duration_minutes = duration
        
        if duration < 5:
            errors['__all__'] = _('Break duration cannot be less than 5 minutes')
        if duration > 60:
            errors['__all__'] = _('Break duration cannot exceed 1 hour (60 minutes)')
        
        # Validate break within school level hours
        if self.school_level_id:
            sl = self.school_level
            if sl.start_time and sl.end_time:
                sl_start = datetime.combine(date.today(), sl.start_time)
                sl_end = datetime.combine(date.today(), sl.end_time)
                
                if start_dt < sl_start + timedelta(minutes=5):
                    errors['start_time'] = _(
                        'Break must start at least 5 minutes after the school level start time ({time})'
                    ).format(time=sl.start_time.strftime('%H:%M'))
                
                if end_dt > sl_end - timedelta(minutes=5):
                    errors['end_time'] = _(
                        'Break must end at least 5 minutes before the school level end time ({time})'
                    ).format(time=sl.end_time.strftime('%H:%M'))
        
        # Validate no overlapping breaks
        if self.school_level_id and self.start_time and self.end_time:
            overlapping = SchoolBreak.objects.filter(
                school_level=self.school_level,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time,
                is_active=True
            )
            if self.pk:
                overlapping = overlapping.exclude(pk=self.pk)
            
            if overlapping.exists():
                errors['__all__'] = _('This break overlaps with existing break: {}').format(
                    overlapping.first().name
                )
        
        # Validate unique name per school level
        if self.school_level_id and self.name:
            if SchoolBreak.objects.filter(
                school_level=self.school_level,
                name__iexact=self.name
            ).exclude(id=self.pk).exists():
                errors['name'] = _('Break name "{}" already exists for this school level').format(self.name)
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.school_level.name} - {self.name} "
            f"({self.start_time} - {self.end_time})"
        )


# ---------------------------------------------------------------------------
# Holiday
# ---------------------------------------------------------------------------

class Holiday(models.Model):
    """
    A specific calendar date that is a holiday (no classes held).
    """

    name = models.CharField(_('name'), max_length=200)
    date = models.DateField(_('date'))
    is_recurring = models.BooleanField(_('is recurring yearly'), default=False)
    description = models.TextField(_('description'), blank=True, default='')
    school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.CASCADE,
        related_name='holidays',
        verbose_name=_('school level'),
        null=True,
        blank=True,
        help_text=_('Leave blank for all school levels'),
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='holidays',
        verbose_name=_('academic year'),
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name = _('holiday')
        verbose_name_plural = _('holidays')
        unique_together = [['date', 'school_level', 'academic_year']]
        ordering = ['date']
        indexes = [
            models.Index(fields=['date']),
            models.Index(fields=['academic_year', 'is_recurring']),
        ]

    def clean(self):
        errors = {}
        
        if self.name:
            self.name = self.name.strip().title()
        
        # Validate date is within academic year
        if self.date and self.academic_year_id:
            if self.date < self.academic_year.start_date:
                errors['date'] = _('Holiday date cannot be before academic year start date ({})').format(
                    self.academic_year.start_date
                )
            if self.date > self.academic_year.end_date:
                errors['date'] = _('Holiday date cannot be after academic year end date ({})').format(
                    self.academic_year.end_date
                )
        
        # Validate school level is active if provided
        if self.school_level_id and not self.school_level.is_active:
            errors['school_level'] = _('Cannot add holiday for inactive school level')
        
        # Check for duplicate holiday
        if self.date and self.academic_year_id:
            school_level = self.school_level
            query = Holiday.objects.filter(
                date=self.date,
                academic_year=self.academic_year
            )
            
            if school_level:
                query = query.filter(school_level=school_level)
            else:
                query = query.filter(school_level__isnull=True)
            
            if self.pk:
                query = query.exclude(id=self.pk)
            
            if query.exists():
                errors['__all__'] = _('Holiday already exists for this date and school level')
        
        if errors:
            raise ValidationError(errors)

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        if self.school_level:
            return f"{self.name} - {self.school_level.name} ({self.date})"
        return f"{self.name} - All Levels ({self.date})"
    
    
    
    
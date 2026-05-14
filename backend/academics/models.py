# models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
from datetime import date


class AcademicYear(models.Model):
    """Academic year model with validations."""
    
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
        ]
    
    def clean(self):
        """Validate academic year data."""
        if self.start_date and self.end_date:
            if self.end_date <= self.start_date:
                raise ValidationError({
                    'end_date': _('End date must be after start date')
                })
        
        if self.name and self.start_date and self.end_date:
            expected_name = f"{self.start_date.year}-{self.end_date.year}"
            if self.name != expected_name:
                raise ValidationError({
                    'name': _(f'Academic year name should be {expected_name} to match the dates')
                })
        
        # Check for overlapping academic years
        overlapping = AcademicYear.objects.filter(
            start_date__lte=self.end_date,
            end_date__gte=self.start_date
        )
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
        
        if overlapping.exists():
            raise ValidationError(
                _('This academic year overlaps with existing year: {}').format(
                    overlapping.first().name
                )
            )
    
    def save(self, *args, **kwargs):
        self.clean()
        if self.is_current:
            AcademicYear.objects.filter(is_current=True).exclude(id=self.id).update(is_current=False)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return self.name


class Term(models.Model):
    """Academic term/trimester model."""
    
    class TermNumber(models.IntegerChoices):
        FIRST = 1, _('First Term')
        SECOND = 2, _('Second Term')
        THIRD = 3, _('Third Term')
    
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='terms'
    )
    term_number = models.IntegerField(
        _('term number'),
        choices=TermNumber.choices
    )
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
    
    def clean(self):
        if self.start_date and self.end_date:
            if self.end_date <= self.start_date:
                raise ValidationError({
                    'end_date': _('End date must be after start date')
                })
        
        if self.academic_year:
            if self.start_date < self.academic_year.start_date or self.end_date > self.academic_year.end_date:
                raise ValidationError(
                    _('Term dates must be within the academic year dates')
                )
        
        # Check for overlapping terms in same academic year
        overlapping = Term.objects.filter(
            academic_year=self.academic_year,
            start_date__lte=self.end_date,
            end_date__gte=self.start_date
        )
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)
        
        if overlapping.exists():
            raise ValidationError(
                _('This term overlaps with existing term: {}').format(
                    overlapping.first().name
                )
            )
    
    def save(self, *args, **kwargs):
        self.clean()
        if self.is_current:
            Term.objects.filter(academic_year=self.academic_year, is_current=True).exclude(id=self.id).update(is_current=False)
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.academic_year.name} - {self.name}"


class SchoolLevel(models.Model):
    """School level model."""
    
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
    description = models.TextField(_('description'), blank=True)
    is_active = models.BooleanField(_('is active'), default=True)
    start_time = models.TimeField(
        _('start time'),
        null=True,
        blank=True,
        help_text=_('Daily start time for this school level (e.g. 08:00)')
    )
    end_time = models.TimeField(
        _('end time'),
        null=True,
        blank=True,
        help_text=_('Daily end time for this school level (e.g. 16:00)')
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('school level')
        verbose_name_plural = _('school levels')
        ordering = ['name']
        
    def clean(self):
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError({
                    'end_time': _('End time must be after start time')
                })
    
    def save(self, *args, **kwargs):
        self.clean() 
        if self.name:
            self.name = self.name.strip().title()
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        if self.class_levels.filter(is_active=True).exists():
            raise ValidationError(
                _('Cannot delete school level because it has active class levels.')
            )
        super().delete(*args, **kwargs)
    
    def __str__(self):
        return self.name


class ClassLevel(models.Model):
    """Class level model."""
    
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
        related_name='class_levels'
    )
    description = models.TextField(_('description'), blank=True)
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('class level')
        verbose_name_plural = _('class levels')
        ordering = ['school_level', 'name']
        unique_together = [['name', 'school_level']]
    
    def clean(self):
        if self.name:
            self.name = self.name.strip()
        if self.code:
            self.code = self.code.upper().strip()
        
        if self.school_level_id and not self.school_level.is_active:
            raise ValidationError({
                'school_level': _('Cannot assign class level to an inactive school level')
            })
    
    def save(self, *args, **kwargs):
        self.clean()
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
        super().delete(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class ClassRoom(models.Model):
    """Class room model."""
    
    class RoomType(models.TextChoices):
        STANDARD = 'standard', _('Standard')
        LABORATORY = 'laboratory', _('Laboratory')
        WORKSHOP = 'workshop', _('Workshop')
        AUDITORIUM = 'auditorium', _('Auditorium')
    
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
        default=RoomType.STANDARD
    )
    capacity = models.PositiveIntegerField(
        _('capacity'), 
        default=30,
        validators=[MinValueValidator(1, message=_('Capacity must be at least 1')), 
                   MaxValueValidator(200, message=_('Capacity cannot exceed 200'))]
    )
    status = models.CharField(
        _('status'), 
        max_length=20, 
        default='active',
        choices=[('active', _('Active')), ('inactive', _('Inactive'))]
    )
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('class room')
        verbose_name_plural = _('class rooms')
        ordering = ['name']
        unique_together = [['name', 'code']]
    
    def clean(self):
        if self.name:
            self.name = self.name.strip()
        if self.code:
            self.code = self.code.upper().strip()
        

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class Subject(models.Model):
    """Subject model."""
    
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
        default=50.00,
        validators=[MinValueValidator(0, message=_('Pass mark cannot be less than 0')), 
                   MaxValueValidator(100, message=_('Pass mark cannot exceed 100'))]
    )
    status = models.CharField(
        _('status'), 
        max_length=20, 
        default='active',
        choices=[('active', _('Active')), ('inactive', _('Inactive'))]
    )
    description = models.TextField(_('description'), blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('subject')
        verbose_name_plural = _('subjects')
        ordering = ['name']
    
    def save(self, *args, **kwargs):
        if self.name:
            self.name = self.name.strip().title()
        if self.code:
            self.code = self.code.upper().strip()
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        if self.class_levels.exists():
            raise ValidationError(
                _('Cannot delete subject because it is assigned to class levels.')
            )
        super().delete(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} ({self.code})"


class ClassLevelSubject(models.Model):
    """Class level subject assignment."""
    
    class TeachingFrequency(models.TextChoices):
        DAILY = 'daily', _('Daily')
        WEEKLY = 'weekly', _('Weekly')
    
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='subjects'
    )
    subject = models.ForeignKey(
        Subject,
        on_delete=models.CASCADE,
        related_name='class_levels'
    )
    teaching_frequency = models.CharField(
        _('teaching frequency'),
        max_length=20,
        choices=TeachingFrequency.choices,
        default=TeachingFrequency.DAILY
    )
    hours_per_week = models.DecimalField(
        _('hours per week'),
        max_digits=4,
        decimal_places=1,
        default=4.0,
        validators=[MinValueValidator(0.5, message=_('Hours per week must be at least 0.5')), 
                   MaxValueValidator(40, message=_('Hours per week cannot exceed 40'))]
    )
    is_compulsory = models.BooleanField(_('is compulsory'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('class level subject')
        verbose_name_plural = _('class level subjects')
        unique_together = [['class_level', 'subject']]
    
    def clean(self):
        if not self.class_level.is_active:
            raise ValidationError(_('Cannot assign subject to an inactive class level'))
        
        if self.subject.status != 'active':
            raise ValidationError(_('Cannot assign an inactive subject'))
        
        if self.teaching_frequency == 'daily' and self.hours_per_week > 30:
            raise ValidationError(_('For daily teaching, hours per week cannot exceed 30'))
        elif self.teaching_frequency == 'weekly' and self.hours_per_week > 10:
            raise ValidationError(_('For weekly teaching, hours per week cannot exceed 10'))
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.class_level.name} - {self.subject.name}"


class PaymentType(models.Model):
    """Payment type model (e.g., Pay Once, Weekly, Monthly, Termly, Yearly)."""
    
    name = models.CharField(_('name'), max_length=100, unique=True)
    code = models.CharField(_('code'), max_length=20, unique=True)
    description = models.TextField(_('description'), blank=True)
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('payment type')
        verbose_name_plural = _('payment types')
        ordering = ['name']
    
    def __str__(self):
        return self.name


class ClassLevelCost(models.Model):
    """Fee structure model."""
    
    name = models.CharField(_('name'), max_length=100)
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='costs'
    )
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='costs'
    )
    payment_type = models.ForeignKey(
        PaymentType,
        on_delete=models.CASCADE,
        related_name='costs',
        default=1
    )
    amount = models.DecimalField(
        _('amount'),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'), message=_('Amount must be greater than 0'))]
    )
    is_mandatory = models.BooleanField(_('is mandatory'), default=True)
    description = models.TextField(_('description'), blank=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('fee structure')
        verbose_name_plural = _('fee structures')
        ordering = ['class_level', 'name']
        unique_together = [['class_level', 'name', 'academic_year']]
    
    def __str__(self):
        return f"{self.name} - {self.class_level.name} ({self.payment_type.name})"


class SchoolDaySetting(models.Model):
    """School day settings for learning days, day-offs, and special days."""
    
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
        related_name='academic_year_day_settings'  # Fixed: unique related_name
    )
    day_type = models.CharField(
        _('day type'),
        max_length=20,
        choices=DayType.choices
    )
    weekday = models.IntegerField(
        _('weekday'),
        choices=WeekDay.choices,
        null=True,
        blank=True
    )
    specific_date = models.DateField(_('specific date'), null=True, blank=True)
    description = models.TextField(_('description'), blank=True)
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('school day setting')
        verbose_name_plural = _('school day settings')
        ordering = ['academic_year', 'specific_date', 'weekday']
    
    def clean(self):
        if not self.weekday and not self.specific_date:
            raise ValidationError(
                _('Either weekday or specific date must be provided')
            )
        
        if self.specific_date and self.academic_year:
            if self.specific_date < self.academic_year.start_date or self.specific_date > self.academic_year.end_date:
                raise ValidationError({
                    'specific_date': _('Date must be within the academic year')
                })
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        if self.specific_date:
            return f"{self.get_day_type_display()}: {self.specific_date}"
        return f"{self.get_day_type_display()}: {self.get_weekday_display()}"


class ClassroomAssignment(models.Model):
    """Assignment of classrooms to class levels for specific terms."""
    
    classroom = models.ForeignKey(
        ClassRoom,
        on_delete=models.CASCADE,
        related_name='assignments'
    )
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='classroom_assignments'
    )
    term = models.ForeignKey(
        Term,
        on_delete=models.CASCADE,
        related_name='classroom_assignments'
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='classroom_assignments'
    )
    is_primary = models.BooleanField(_('is primary classroom'), default=False)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('classroom assignment')
        verbose_name_plural = _('classroom assignments')
        unique_together = [['classroom', 'term']]
        ordering = ['academic_year', 'term', 'class_level']
    
    def clean(self):
        pass
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.classroom.name} -> {self.class_level.name} ({self.term.name})"
    
  
class SchoolBreak(models.Model):
    """School break model for managing breaks during learning days (short breaks, lunch, etc.)."""
    
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
        default=BreakType.SHORT_BREAK
    )
    school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.CASCADE,
        related_name='breaks',
        help_text=_('School level this break applies to')
    )
    start_time = models.TimeField(_('start time'))
    end_time = models.TimeField(_('end time'))
    duration_minutes = models.PositiveIntegerField(
        _('duration (minutes)'),
        editable=False,
        help_text=_('Automatically calculated from start and end time')
    )
    description = models.TextField(_('description'), blank=True)
    is_active = models.BooleanField(_('is active'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('school break')
        verbose_name_plural = _('school breaks')
        ordering = ['school_level', 'start_time']
        unique_together = [['school_level', 'name']]
    
    def clean(self):
        """Validate break data."""
        from datetime import datetime, timedelta

        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError({
                    'end_time': _('End time must be after start time')
                })

            # Calculate duration in minutes
            start_dt = datetime.combine(datetime.today(), self.start_time)
            end_dt   = datetime.combine(datetime.today(), self.end_time)
            duration = int((end_dt - start_dt).total_seconds() / 60)
            self.duration_minutes = duration

            # Duration constraints: 5 min ≤ break ≤ 60 min
            if duration < 5:
                raise ValidationError(
                    _('Break duration cannot be less than 5 minutes')
                )
            if duration > 60:
                raise ValidationError(
                    _('Break duration cannot exceed 1 hour (60 minutes)')
                )

            # Validate against school level operating hours
            if self.school_level_id:
                sl = self.school_level
                if sl.start_time and sl.end_time:
                    sl_start = datetime.combine(datetime.today(), sl.start_time)
                    sl_end   = datetime.combine(datetime.today(), sl.end_time)
                    break_start = start_dt
                    break_end   = end_dt

                    if break_start < sl_start + timedelta(minutes=5):
                        raise ValidationError({
                            'start_time': _(
                                'Break must start at least 5 minutes after the school '
                                'level start time ({time})'
                            ).format(time=sl.start_time.strftime('%H:%M'))
                        })

                    if break_end > sl_end - timedelta(minutes=5):
                        raise ValidationError({
                            'end_time': _(
                                'Break must end at least 5 minutes before the school '
                                'level end time ({time})'
                            ).format(time=sl.end_time.strftime('%H:%M'))
                        })

        # Check for overlapping breaks for the same school level
        overlapping = SchoolBreak.objects.filter(
            school_level=self.school_level,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time,
            is_active=True
        )
        if self.pk:
            overlapping = overlapping.exclude(pk=self.pk)

        if overlapping.exists():
            raise ValidationError(
                _('This break overlaps with existing break: {}').format(
                    overlapping.first().name
                )
            )
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.school_level.name} - {self.name} ({self.start_time} - {self.end_time})"
    
    
    
class Holiday(models.Model):
    """Model for holidays and days off."""
    
    name = models.CharField(_('name'), max_length=200)
    date = models.DateField(_('date'))
    is_recurring = models.BooleanField(_('is recurring yearly'), default=False)
    description = models.TextField(_('description'), blank=True)
    school_level = models.ForeignKey(
        'SchoolLevel',
        on_delete=models.CASCADE,
        related_name='holidays',
        verbose_name=_('school level'),
        null=True,
        blank=True,
        help_text=_('Leave blank for all school levels')
    )
    academic_year = models.ForeignKey(
        'AcademicYear',
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
    
    def clean(self):
        """Validate holiday data"""
        if self.date and self.academic_year:
            if self.date < self.academic_year.start_date or self.date > self.academic_year.end_date:
                raise ValidationError({
                    'date': _('Holiday date must be within the academic year dates')
                })
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        if self.school_level:
            return f"{self.name} - {self.school_level.name} ({self.date})"
        return f"{self.name} - All Levels ({self.date})"
    
    

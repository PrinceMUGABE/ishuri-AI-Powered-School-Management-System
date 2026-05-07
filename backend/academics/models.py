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
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('school level')
        verbose_name_plural = _('school levels')
        ordering = ['name']
    
    def save(self, *args, **kwargs):
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
        if self.classrooms.filter(status='active').exists():
            raise ValidationError(
                _('Cannot delete class level because it has active classrooms.')
            )
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
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='classrooms'
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
        ordering = ['class_level', 'name']
        unique_together = [['class_level', 'name']]
    
    def clean(self):
        if self.name:
            self.name = self.name.strip()
        if self.code:
            self.code = self.code.upper().strip()
        
        if self.class_level_id and not self.class_level.is_active:
            raise ValidationError({
                'class_level': _('Cannot assign classroom to an inactive class level')
            })
    
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


class ClassLevelCost(models.Model):
    """Fee structure model."""
    
    class Frequency(models.TextChoices):
        TERMLY = 'termly', _('Termly')
        YEARLY = 'yearly', _('Yearly')
        MONTHLY = 'monthly', _('Monthly')
    
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
    amount = models.DecimalField(
        _('amount'),
        max_digits=12,
        decimal_places=2,
        validators=[MinValueValidator(Decimal('0.01'), message=_('Amount must be greater than 0'))]
    )
    frequency = models.CharField(
        _('frequency'), 
        max_length=20, 
        choices=Frequency.choices, 
        default=Frequency.TERMLY
    )
    is_mandatory = models.BooleanField(_('is mandatory'), default=True)
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    
    class Meta:
        verbose_name = _('fee structure')
        verbose_name_plural = _('fee structures')
        ordering = ['class_level', 'name']
        unique_together = [['class_level', 'name', 'academic_year']]
    
    def clean(self):
        if self.name:
            self.name = self.name.strip().title()
        
        if not self.class_level.is_active:
            raise ValidationError(_('Cannot add fee structure for an inactive class level'))
        
        from django.utils import timezone
        if self.academic_year and self.academic_year.end_date < timezone.now().date():
            raise ValidationError(_('Cannot add fee structure for a past academic year'))
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.name} - {self.class_level.name}"
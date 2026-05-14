from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator, RegexValidator, EmailValidator, FileExtensionValidator
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, datetime, timedelta
from decimal import Decimal
import re
import os
import base64

from academics.models import SchoolLevel, ClassLevel, Subject, ClassRoom, Term, AcademicYear
from accounts.models import User


def teacher_document_upload_path(instance, filename):
    """Generate upload path for teacher documents"""
    ext = filename.split('.')[-1].lower()
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    new_filename = f"{instance.teacher.id}_{instance.document_type}_{timestamp}.{ext}"
    return f"teachers/{instance.teacher.id}/documents/{new_filename}"


def teacher_qualification_upload_path(instance, filename):
    """Generate upload path for teacher qualifications"""
    ext = filename.split('.')[-1].lower()
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    new_filename = f"{instance.teacher.id}_{instance.level}_{timestamp}.{ext}"
    return f"teachers/{instance.teacher.id}/qualifications/{new_filename}"


def teacher_profile_picture_path(instance, filename):
    """Generate upload path for teacher profile picture"""
    ext = filename.split('.')[-1].lower()
    timestamp = timezone.now().strftime('%Y%m%d_%H%M%S')
    new_filename = f"{instance.id}_{timestamp}.{ext}"
    return f"teachers/{instance.id}/profile/{new_filename}"


class Teacher(models.Model):
    """Enhanced Teacher model with complete information."""
    
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
        A2 = 'a2', _('A2 (Secondary School Certificate)')
        A1 = 'a1', _('A1 (Advanced Diploma)')
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
    first_name = models.CharField(_('first name'), max_length=100, default='')
    last_name = models.CharField(_('last name'), max_length=100, default='')
    middle_name = models.CharField(_('middle name'), max_length=100, blank=True)
    
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
    
    # Professional Information
    salary = models.DecimalField(
        _('salary'),
        max_digits=12,
        decimal_places=2,
        default=1,
        validators=[MinValueValidator(0, message=_('Salary cannot be negative'))]
    )
    work_hours_per_week = models.DecimalField(
        _('work hours per week'),
        max_digits=4,
        decimal_places=1,
        default=40.0,
        validators=[MinValueValidator(1, message=_('Work hours must be at least 1')), 
                   MaxValueValidator(60, message=_('Work hours cannot exceed 60'))]
    )
    
    # Specializations (Many-to-Many with Subject)
    specializations = models.ManyToManyField(
        Subject,
        related_name='specialized_teachers',
        blank=True,
        verbose_name=_('specializations'),
        help_text=_('Subjects this teacher is specialized in')
    )
    
    # Education and Qualifications
    education_level = models.CharField(
        _('education level'),
        max_length=20,
        choices=EducationLevel.choices,
        default=EducationLevel.BACHELOR
    )
    qualifications = models.TextField(_('qualifications'), blank=True, help_text=_('List of qualifications and achievements'))
    qualification_document = models.FileField(
        _('qualification document'),
        upload_to=teacher_qualification_upload_path,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'png'])]
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
    
    # Profile
    profile_picture = models.ImageField(
        _('profile picture'),
        upload_to=teacher_profile_picture_path,
        null=True,
        blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif'])]
    )
    bio = models.TextField(_('biography'), blank=True)
    
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
        ordering = ['first_name', 'last_name']
        indexes = [
            models.Index(fields=['email']),
            models.Index(fields=['phone_number']),
            models.Index(fields=['status']),
            models.Index(fields=['first_name', 'last_name']),
        ]
    
    def __str__(self):
        return self.full_name
    
    @property
    def full_name(self):
        """Return full name"""
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"
    
    @property
    def age(self):
        """Calculate age from birth date"""
        if self.birth_date:
            today = date.today()
            age = today.year - self.birth_date.year
            if today.month < self.birth_date.month or (today.month == self.birth_date.month and today.day < self.birth_date.day):
                age -= 1
            return age
        return None
    
    def clean(self):
        """Validate teacher data"""
        super().clean()
        
        if self.birth_date:
            today = date.today()
            age = self.age
            if age and age < 18:
                raise ValidationError({'birth_date': _('Teacher must be at least 18 years old')})
            if age and age > 80:
                raise ValidationError({'birth_date': _('Invalid birth date')})
        
        if self.email:
            self.email = self.email.lower().strip()
        
        if self.phone_number:
            self.phone_number = re.sub(r'\s+', '', self.phone_number)
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def delete(self, *args, **kwargs):
        """Override delete to check for active assignments"""
        if self.assignments.filter(status='active').exists():
            raise ValidationError(_('Cannot delete teacher with active assignments'))
        super().delete(*args, **kwargs)


class TeacherDocument(models.Model):
    """Model for teacher documents and files"""
    
    class DocumentType(models.TextChoices):
        QUALIFICATION = 'qualification', _('Qualification Certificate')
        ID_DOCUMENT = 'id_document', _('ID Document')
        CONTRACT = 'contract', _('Employment Contract')
        CERTIFICATE = 'certificate', _('Training Certificate')
        OTHER = 'other', _('Other Document')
    
    teacher = models.ForeignKey(
        Teacher,
        on_delete=models.CASCADE,
        related_name='documents',
        verbose_name=_('teacher')
    )
    document_type = models.CharField(
        _('document type'),
        max_length=20,
        choices=DocumentType.choices,
        default=DocumentType.OTHER
    )
    title = models.CharField(_('title'), max_length=200)
    description = models.TextField(_('description'), blank=True)
    file = models.FileField(
        _('file'),
        upload_to=teacher_document_upload_path,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'png', 'xls', 'xlsx'])]
    )
    uploaded_at = models.DateTimeField(_('uploaded at'), auto_now_add=True)
    uploaded_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='uploaded_documents',
        verbose_name=_('uploaded by')
    )
    
    class Meta:
        verbose_name = _('teacher document')
        verbose_name_plural = _('teacher documents')
        ordering = ['-uploaded_at']
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.title}"
    
    @property
    def file_url(self):
        """Get file URL"""
        if self.file:
            return self.file.url
        return None
    
    @property
    def file_name(self):
        """Get file name"""
        if self.file:
            return os.path.basename(self.file.name)
        return None
    
    @property
    def file_size(self):
        """Get file size in bytes"""
        if self.file:
            return self.file.size
        return 0
    
    @property
    def file_extension(self):
        """Get file extension"""
        if self.file:
            return os.path.splitext(self.file.name)[1].lower()
        return None


class TeacherAssignment(models.Model):
    """
    Enhanced Teacher Assignment model with comprehensive validation.
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
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name=_('academic year'),
        default=1
    )
    term = models.ForeignKey(
        Term,
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name=_('term'),
        default=1
    )
    school_level = models.ForeignKey(
        SchoolLevel,
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name=_('school level'),
        default=1
    )
    class_level = models.ForeignKey(
        ClassLevel,
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name=_('class level'),
        default=1
    )
    classroom = models.ForeignKey(
        ClassRoom,
        on_delete=models.CASCADE,
        related_name='teacher_assignments',
        verbose_name=_('classroom'),
        default=1
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
        unique_together = [['teacher', 'academic_year', 'term', 'class_level', 'subject', 'classroom']]
        ordering = ['academic_year', 'term', 'teacher', 'school_level', 'class_level']
        indexes = [
            models.Index(fields=['teacher', 'status']),
            models.Index(fields=['academic_year', 'term']),
            models.Index(fields=['class_level', 'subject']),
        ]
    
    def clean(self):
        """Validate assignment with comprehensive checks"""
        from django.core.exceptions import ValidationError
        
        # Check if class level belongs to school level
        if self.class_level and self.school_level:
            if self.class_level.school_level != self.school_level:
                raise ValidationError({
                    'class_level': _('Class level "{class_level}" does not belong to school level "{school_level}"').format(
                        class_level=self.class_level.name,
                        school_level=self.school_level.name
                    )
                })
        
        # Check if classroom is active
        if self.classroom and self.classroom.status != 'active':
            raise ValidationError({
                'classroom': _('Classroom "{classroom}" is not active').format(
                    classroom=self.classroom.name
                )
            })
        
        # Check if class level is active
        if not self.class_level.is_active:
            raise ValidationError({
                'class_level': _('Class level "{class_level}" is not active').format(
                    class_level=self.class_level.name
                )
            })
        
        # Check if subject is active
        if self.subject.status != 'active':
            raise ValidationError({
                'subject': _('Subject "{subject}" is not active').format(
                    subject=self.subject.name
                )
            })
        
        # Check if teacher is active
        if self.teacher.status != 'active':
            raise ValidationError({
                'teacher': _('Teacher "{teacher}" is not active').format(
                    teacher=self.teacher.full_name
                )
            })
        

        # Check for conflicting assignments (same classroom, same subject, same time period)
        conflicting = TeacherAssignment.objects.filter(
            academic_year=self.academic_year,
            term=self.term,
            class_level=self.class_level,
            subject=self.subject,
            status='active'
        ).exclude(id=self.id)
        
        if conflicting.exists():
            raise ValidationError(
                _('Subject "{subject}" is already assigned to class "{class_level}" for this term').format(
                    subject=self.subject.name,
                    class_level=self.class_level.name
                )
            )
        
        # Check if classroom is already assigned to another teacher for same class level
        classroom_conflict = TeacherAssignment.objects.filter(
            academic_year=self.academic_year,
            term=self.term,
            classroom=self.classroom,
            status='active'
        ).exclude(id=self.id)
        
        if classroom_conflict.exists():
            conflict_teacher = classroom_conflict.first().teacher.full_name
            raise ValidationError({
                'classroom': _('Classroom "{classroom}" is already assigned to teacher "{teacher}" for this term').format(
                    classroom=self.classroom.name,
                    teacher=conflict_teacher
                )
            })
        
        # Check teacher's total weekly hours don't exceed their capacity
        existing_assignments = TeacherAssignment.objects.filter(
            teacher=self.teacher,
            academic_year=self.academic_year,
            term=self.term,
            status='active'
        ).exclude(id=self.id)
        
        total_hours = sum(float(a.hours_per_week) for a in existing_assignments)
        if self.id:
            existing_hours = sum(float(a.hours_per_week) for a in existing_assignments.filter(id=self.id))
            total_hours = sum(float(a.hours_per_week) for a in existing_assignments) + float(self.hours_per_week)
        
        if total_hours > float(self.teacher.work_hours_per_week):
            raise ValidationError(
                _('Teacher\'s total weekly hours ({total}) would exceed their capacity ({capacity})').format(
                    total=total_hours,
                    capacity=self.teacher.work_hours_per_week
                )
            )
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.subject.name} - {self.class_level.name} ({self.term.name})"


class TeacherTimetable(models.Model):
    """
    Term-based timetable for teachers.
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
    assignment = models.ForeignKey(
        TeacherAssignment,
        on_delete=models.CASCADE,
        related_name='timetables',
        verbose_name=_('assignment')
    )
    academic_year = models.ForeignKey(
        AcademicYear,
        on_delete=models.CASCADE,
        related_name='teacher_timetables',
        verbose_name=_('academic year'),
        default=1
    )
    term = models.ForeignKey(
        Term,
        on_delete=models.CASCADE,
        related_name='teacher_timetables',
        verbose_name=_('term'),
        default=1
    )
    day_of_week = models.IntegerField(_('day of week'), choices=DAYS_OF_WEEK)
    start_time = models.TimeField(_('start time'))
    end_time = models.TimeField(_('end time'))
    week_number = models.PositiveIntegerField(_('week number'), default=1)
    
    # Related objects (denormalized for performance)
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
        ClassRoom,
        on_delete=models.CASCADE,
        related_name='timetables',
        verbose_name=_('classroom')
    )
    # school_level = models.ForeignKey(
    #     SchoolLevel,
    #     on_delete=models.CASCADE,
    #     related_name='timetables',
    #     verbose_name=_('school level'),
    #     default=1
    # )
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_timetables',
        verbose_name=_('created by')
    )
    
    class Meta:
        verbose_name = _('teacher timetable')
        verbose_name_plural = _('teacher timetables')
        unique_together = [
            ['academic_year', 'term', 'day_of_week', 'start_time', 'classroom'],
            ['academic_year', 'term', 'day_of_week', 'start_time', 'teacher'],
        ]
        ordering = ['teacher', 'day_of_week', 'start_time']
        indexes = [
            models.Index(fields=['academic_year', 'term', 'teacher']),
            models.Index(fields=['academic_year', 'term', 'classroom']),
            models.Index(fields=['academic_year', 'term', 'day_of_week']),
        ]
    
    def clean(self):
        """Validate timetable entry"""
        from academics.models import SchoolBreak, SchoolDaySetting
        from django.utils import timezone as dj_timezone
        
        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError(_('End time must be after start time'))
        
        # Check school level operating hours
        if self.school_level:
            if self.school_level.start_time and self.school_level.end_time:
                if self.start_time < self.school_level.start_time:
                    raise ValidationError(
                        _('Class cannot start before school level start time ({time})').format(
                            time=self.school_level.start_time.strftime('%H:%M')
                        )
                    )
                if self.end_time > self.school_level.end_time:
                    raise ValidationError(
                        _('Class cannot end after school level end time ({time})').format(
                            time=self.school_level.end_time.strftime('%H:%M')
                        )
                    )
        
        # Check for break times
        breaks = SchoolBreak.objects.filter(
            school_level=self.school_level,
            is_active=True,
            start_time__lt=self.end_time,
            end_time__gt=self.start_time
        )
        
        if breaks.exists():
            break_names = ', '.join([b.name for b in breaks])
            raise ValidationError(
                _('This time slot overlaps with break time(s): {breaks}').format(breaks=break_names)
            )
        
        # Check if it's a school day
        day_settings = SchoolDaySetting.objects.filter(
            school_level=self.school_level,
            academic_year=self.academic_year,
            is_school_day=True
        ).first()
        
        if not day_settings:
            raise ValidationError(_('No school day settings found for this school level'))
    
    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)
    
    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK)[self.day_of_week]
        return f"{self.teacher.full_name} - {day_name} - {self.start_time} to {self.end_time}"
    
    @property
    def day_name(self):
        """Get day name"""
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[self.day_of_week] if 0 <= self.day_of_week < len(days) else str(self.day_of_week)
    
    
    
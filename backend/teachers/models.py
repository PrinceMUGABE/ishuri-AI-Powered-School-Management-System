# teachers/models.py
from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import (
    MinValueValidator, MaxValueValidator, RegexValidator,
    EmailValidator, FileExtensionValidator
)
from django.core.exceptions import ValidationError
from django.utils import timezone
from datetime import date, datetime, timedelta
from decimal import Decimal
import re
import os

from academics.models import SchoolLevel, ClassLevel, Subject, ClassRoom, Term, AcademicYear
from accounts.models import User


# ---------------------------------------------------------------------------
# Upload helpers
# ---------------------------------------------------------------------------

def teacher_document_upload_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    ts = timezone.now().strftime('%Y%m%d_%H%M%S')
    return f"teachers/{instance.teacher.id}/documents/{instance.teacher.id}_{instance.document_type}_{ts}.{ext}"


def teacher_qualification_upload_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    ts = timezone.now().strftime('%Y%m%d_%H%M%S')
    return f"teachers/{instance.id}/qualifications/{instance.id}_{ts}.{ext}"


def teacher_profile_picture_path(instance, filename):
    ext = filename.split('.')[-1].lower()
    ts = timezone.now().strftime('%Y%m%d_%H%M%S')
    return f"teachers/{instance.id}/profile/{instance.id}_{ts}.{ext}"


# ---------------------------------------------------------------------------
# Teacher
# ---------------------------------------------------------------------------

class Teacher(models.Model):
    """Full teacher model."""

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

    user = models.OneToOneField(
        User, on_delete=models.CASCADE,
        related_name='teacher_profile', verbose_name=_('user account')
    )

    first_name = models.CharField(_('first name'), max_length=100, default='')
    last_name = models.CharField(_('last name'), max_length=100, default='')
    middle_name = models.CharField(_('middle name'), max_length=100, blank=True)

    email = models.EmailField(
        _('email address'), unique=True,
        validators=[EmailValidator(message=_('Enter a valid email address'))]
    )
    phone_number = models.CharField(
        _('phone number'), max_length=20, unique=True,
        validators=[
            RegexValidator(
                regex=r'^(\+?[0-9]{10,15})$',
                message=_('Phone number must contain 10-15 digits, optionally starting with +')
            )
        ]
    )
    address = models.TextField(_('address'), blank=True)
    gender = models.CharField(_('gender'), max_length=10, choices=Gender.choices, default=Gender.MALE)

    salary = models.DecimalField(
        _('salary'), max_digits=12, decimal_places=2, default=1,
        validators=[MinValueValidator(0, message=_('Salary cannot be negative'))]
    )
    # Maximum hours a teacher is contracted to teach per week.
    # The timetable generator will not exceed this.
    work_hours_per_week = models.DecimalField(
        _('work hours per week'), max_digits=4, decimal_places=1, default=40.0,
        validators=[
            MinValueValidator(1, message=_('Work hours must be at least 1')),
            MaxValueValidator(60, message=_('Work hours cannot exceed 60'))
        ]
    )

    specializations = models.ManyToManyField(
        Subject, related_name='specialized_teachers', blank=True,
        verbose_name=_('specializations'),
        help_text=_('Subjects this teacher is specialized in')
    )

    education_level = models.CharField(
        _('education level'), max_length=20,
        choices=EducationLevel.choices, default=EducationLevel.BACHELOR
    )
    qualifications = models.TextField(_('qualifications'), blank=True)
    qualification_document = models.FileField(
        _('qualification document'),
        upload_to=teacher_qualification_upload_path,
        null=True, blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'png'])]
    )

    birth_date = models.DateField(_('birth date'), null=True, blank=True)
    hire_date = models.DateField(_('hire date'), default=date.today)

    status = models.CharField(
        _('status'), max_length=20,
        choices=Status.choices, default=Status.ACTIVE
    )

    profile_picture = models.ImageField(
        _('profile picture'),
        upload_to=teacher_profile_picture_path,
        null=True, blank=True,
        validators=[FileExtensionValidator(allowed_extensions=['jpg', 'jpeg', 'png', 'gif'])]
    )
    bio = models.TextField(_('biography'), blank=True)

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_teachers', verbose_name=_('created by')
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
        if self.middle_name:
            return f"{self.first_name} {self.middle_name} {self.last_name}"
        return f"{self.first_name} {self.last_name}"

    @property
    def age(self):
        if self.birth_date:
            today = date.today()
            age = today.year - self.birth_date.year
            if (today.month, today.day) < (self.birth_date.month, self.birth_date.day):
                age -= 1
            return age
        return None

    def clean(self):
        super().clean()
        if self.birth_date:
            age = self.age
            if age is not None and age < 18:
                raise ValidationError({'birth_date': _('Teacher must be at least 18 years old')})
            if age is not None and age > 80:
                raise ValidationError({'birth_date': _('Invalid birth date')})
        if self.email:
            self.email = self.email.lower().strip()
        if self.phone_number:
            self.phone_number = re.sub(r'\s+', '', self.phone_number)

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def delete(self, *args, **kwargs):
        if self.assignments.filter(status='active').exists():
            raise ValidationError(_('Cannot delete teacher with active assignments'))
        super().delete(*args, **kwargs)


# ---------------------------------------------------------------------------
# TeacherDocument
# ---------------------------------------------------------------------------

class TeacherDocument(models.Model):
    """Documents uploaded for a teacher."""

    class DocumentType(models.TextChoices):
        QUALIFICATION = 'qualification', _('Qualification Certificate')
        ID_DOCUMENT = 'id_document', _('ID Document')
        CONTRACT = 'contract', _('Employment Contract')
        CERTIFICATE = 'certificate', _('Training Certificate')
        OTHER = 'other', _('Other Document')

    teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE,
        related_name='documents', verbose_name=_('teacher')
    )
    document_type = models.CharField(
        _('document type'), max_length=20,
        choices=DocumentType.choices, default=DocumentType.OTHER
    )
    title = models.CharField(_('title'), max_length=200)
    description = models.TextField(_('description'), blank=True)
    file = models.FileField(
        _('file'),
        upload_to=teacher_document_upload_path,
        validators=[FileExtensionValidator(
            allowed_extensions=['pdf', 'doc', 'docx', 'jpg', 'png', 'xls', 'xlsx']
        )]
    )
    uploaded_at = models.DateTimeField(_('uploaded at'), auto_now_add=True)
    uploaded_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='uploaded_documents', verbose_name=_('uploaded by')
    )

    class Meta:
        verbose_name = _('teacher document')
        verbose_name_plural = _('teacher documents')
        ordering = ['-uploaded_at']

    def __str__(self):
        return f"{self.teacher.full_name} - {self.title}"

    @property
    def file_url(self):
        return self.file.url if self.file else None

    @property
    def file_name(self):
        return os.path.basename(self.file.name) if self.file else None

    @property
    def file_size(self):
        return self.file.size if self.file else 0

    @property
    def file_extension(self):
        return os.path.splitext(self.file.name)[1].lower() if self.file else None


# ---------------------------------------------------------------------------
# TeacherAssignment
# ---------------------------------------------------------------------------

class TeacherAssignment(models.Model):
    """
    Assigns a teacher to teach a specific subject in one or more classrooms
    within a given school level, class level, term, and academic year.

    Key design decisions
    --------------------
    * hours_per_week is REMOVED — the system derives the required hours from
      ClassLevelSubject.hours_per_week for the (class_level, subject) pair.
    * A teacher teaches in ONE school level but may teach in MULTIPLE classrooms
      (M2M relationship).  The timetable generator schedules each classroom
      independently without double-booking the teacher.
    * One assignment = one subject in one class level (which may use several
      classrooms).  If a teacher teaches the same subject in two different class
      levels, two separate assignment records are created.
    """

    class AssignmentStatus(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')
        COMPLETED = 'completed', _('Completed')

    teacher = models.ForeignKey(
        Teacher, on_delete=models.CASCADE,
        related_name='assignments', verbose_name=_('teacher')
    )
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE,
        related_name='teacher_assignments', verbose_name=_('academic year')
    )
    term = models.ForeignKey(
        Term, on_delete=models.CASCADE,
        related_name='teacher_assignments', verbose_name=_('term')
    )
    school_level = models.ForeignKey(
        SchoolLevel, on_delete=models.CASCADE,
        related_name='teacher_assignments', verbose_name=_('school level')
    )
    class_level = models.ForeignKey(
        ClassLevel, on_delete=models.CASCADE,
        related_name='teacher_assignments', verbose_name=_('class level')
    )
    # A teacher can be assigned to multiple classrooms for the same subject/class.
    classrooms = models.ManyToManyField(
        ClassRoom,
        related_name='teacher_assignments',
        verbose_name=_('classrooms'),
        help_text=_('One or more classrooms this teacher will use for this assignment')
    )
    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE,
        related_name='teacher_assignments', verbose_name=_('subject')
    )

    status = models.CharField(
        _('status'), max_length=20,
        choices=AssignmentStatus.choices, default=AssignmentStatus.ACTIVE
    )
    notes = models.TextField(_('notes'), blank=True)

    assigned_at = models.DateTimeField(_('assigned at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    assigned_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='assigned_teacher_subjects', verbose_name=_('assigned by')
    )

    class Meta:
        verbose_name = _('teacher assignment')
        verbose_name_plural = _('teacher assignments')
        # One teacher → one subject → one class level → one term (unique)
        unique_together = [['teacher', 'academic_year', 'term', 'class_level', 'subject']]
        ordering = ['academic_year', 'term', 'teacher', 'school_level', 'class_level']
        indexes = [
            models.Index(fields=['teacher', 'status']),
            models.Index(fields=['academic_year', 'term']),
            models.Index(fields=['class_level', 'subject']),
        ]

    # ------------------------------------------------------------------
    # Computed property: hours the timetable must fill for this assignment
    # ------------------------------------------------------------------
    @property
    def required_hours_per_week(self):
        """
        Fetch the required hours per week from ClassLevelSubject.
        Returns 0 if the mapping does not exist.
        """
        from academics.models import ClassLevelSubject
        try:
            cls = ClassLevelSubject.objects.get(
                class_level=self.class_level, subject=self.subject
            )
            return float(cls.hours_per_week)
        except ClassLevelSubject.DoesNotExist:
            return 0.0

    @property
    def teaching_frequency(self):
        """Return 'daily' or 'weekly' from ClassLevelSubject."""
        from academics.models import ClassLevelSubject
        try:
            cls = ClassLevelSubject.objects.get(
                class_level=self.class_level, subject=self.subject
            )
            return cls.teaching_frequency
        except ClassLevelSubject.DoesNotExist:
            return 'daily'

    def clean(self):
        # class_level must belong to school_level
        if self.class_level_id and self.school_level_id:
            if self.class_level.school_level_id != self.school_level_id:
                raise ValidationError({
                    'class_level': _(
                        'Class level "{cl}" does not belong to school level "{sl}"'
                    ).format(cl=self.class_level.name, sl=self.school_level.name)
                })

        # class_level must be active
        if self.class_level_id and not self.class_level.is_active:
            raise ValidationError({
                'class_level': _('Class level "{cl}" is not active').format(
                    cl=self.class_level.name
                )
            })

        # subject must be active
        if self.subject_id and self.subject.status != 'active':
            raise ValidationError({
                'subject': _('Subject "{s}" is not active').format(s=self.subject.name)
            })

        # teacher must be active
        if self.teacher_id and self.teacher.status != 'active':
            raise ValidationError({
                'teacher': _('Teacher "{t}" is not active').format(t=self.teacher.full_name)
            })

        # Ensure the subject is assigned to this class level
        from academics.models import ClassLevelSubject
        if self.class_level_id and self.subject_id:
            if not ClassLevelSubject.objects.filter(
                class_level=self.class_level, subject=self.subject
            ).exists():
                raise ValidationError(
                    _('Subject "{s}" is not assigned to class level "{cl}"').format(
                        s=self.subject.name, cl=self.class_level.name
                    )
                )

        # No duplicate subject→class level assignment in the same term
        conflict = TeacherAssignment.objects.filter(
            academic_year=self.academic_year,
            term=self.term,
            class_level=self.class_level,
            subject=self.subject,
            status='active'
        )
        if self.pk:
            conflict = conflict.exclude(pk=self.pk)
        if conflict.exists():
            raise ValidationError(
                _('Subject "{s}" is already assigned to class "{cl}" for this term').format(
                    s=self.subject.name, cl=self.class_level.name
                )
            )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return (
            f"{self.teacher.full_name} - {self.subject.name} - "
            f"{self.class_level.name} ({self.term.name})"
        )


# ---------------------------------------------------------------------------
# TeacherTimetable
# ---------------------------------------------------------------------------

class TeacherTimetable(models.Model):
    """
    A single scheduled teaching slot for a teacher.

    One row = one contiguous block of teaching time in one classroom on one day.

    Constraints enforced here (also validated by the generator):
    - end_time > start_time
    - Slot must be within school level operating hours
    - Slot must NOT overlap with any SchoolBreak for that school level
    - Teacher cannot have two overlapping slots on the same day
    - Classroom cannot have two overlapping slots on the same day
    - A single continuous session cannot exceed 2 hours (MAX_SESSION_HOURS)
    """

    MAX_SESSION_HOURS = 2  # a single uninterrupted block cannot exceed this

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
        Teacher, on_delete=models.CASCADE,
        related_name='timetables', verbose_name=_('teacher')
    )
    assignment = models.ForeignKey(
        TeacherAssignment, on_delete=models.CASCADE,
        related_name='timetables', verbose_name=_('assignment')
    )
    academic_year = models.ForeignKey(
        AcademicYear, on_delete=models.CASCADE,
        related_name='teacher_timetables', verbose_name=_('academic year')
    )
    term = models.ForeignKey(
        Term, on_delete=models.CASCADE,
        related_name='teacher_timetables', verbose_name=_('term')
    )
    day_of_week = models.IntegerField(_('day of week'), choices=DAYS_OF_WEEK)
    start_time = models.TimeField(_('start time'))
    end_time = models.TimeField(_('end time'))

    subject = models.ForeignKey(
        Subject, on_delete=models.CASCADE,
        related_name='timetables', verbose_name=_('subject')
    )
    class_level = models.ForeignKey(
        ClassLevel, on_delete=models.CASCADE,
        related_name='timetables', verbose_name=_('class level')
    )
    classroom = models.ForeignKey(
        ClassRoom, on_delete=models.CASCADE,
        related_name='timetables', verbose_name=_('classroom')
    )
    school_level = models.ForeignKey(
        SchoolLevel, on_delete=models.CASCADE,
        related_name='timetables', verbose_name=_('school level'),
        null=True,
        blank=True,
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    created_by = models.ForeignKey(
        User, on_delete=models.SET_NULL, null=True, blank=True,
        related_name='created_timetables', verbose_name=_('created by')
    )

    class Meta:
        verbose_name = _('teacher timetable')
        verbose_name_plural = _('teacher timetables')
        unique_together = [
            # Same classroom cannot be used by two teachers at the same time
            ['academic_year', 'term', 'day_of_week', 'start_time', 'classroom'],
            # Same teacher cannot be in two places at the same time
            ['academic_year', 'term', 'day_of_week', 'start_time', 'teacher'],
        ]
        ordering = ['teacher', 'day_of_week', 'start_time']
        indexes = [
            models.Index(fields=['academic_year', 'term', 'teacher']),
            models.Index(fields=['academic_year', 'term', 'classroom']),
            models.Index(fields=['academic_year', 'term', 'day_of_week']),
        ]

    def clean(self):
        from academics.models import SchoolBreak

        if self.start_time and self.end_time:
            if self.end_time <= self.start_time:
                raise ValidationError({'end_time': _('End time must be after start time')})

            start_dt = datetime.combine(date.today(), self.start_time)
            end_dt = datetime.combine(date.today(), self.end_time)
            duration_hours = (end_dt - start_dt).total_seconds() / 3600

            if duration_hours > self.MAX_SESSION_HOURS:
                raise ValidationError(
                    _('A single session cannot exceed {h} hours').format(h=self.MAX_SESSION_HOURS)
                )

        # School level operating hours
        if self.school_level_id and self.start_time and self.end_time:
            sl = self.school_level
            if sl.start_time and self.start_time < sl.start_time:
                raise ValidationError(
                    _('Class cannot start before school level start time ({t})').format(
                        t=sl.start_time.strftime('%H:%M')
                    )
                )
            if sl.end_time and self.end_time > sl.end_time:
                raise ValidationError(
                    _('Class cannot end after school level end time ({t})').format(
                        t=sl.end_time.strftime('%H:%M')
                    )
                )

        # No overlap with breaks
        if self.school_level_id and self.start_time and self.end_time:
            breaks = SchoolBreak.objects.filter(
                school_level=self.school_level,
                is_active=True,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time
            )
            if breaks.exists():
                raise ValidationError(
                    _('This slot overlaps with break(s): {b}').format(
                        b=', '.join(b.name for b in breaks)
                    )
                )

        # Teacher not double-booked
        if self.teacher_id and self.day_of_week is not None and self.start_time and self.end_time:
            teacher_conflict = TeacherTimetable.objects.filter(
                teacher=self.teacher,
                academic_year=self.academic_year,
                term=self.term,
                day_of_week=self.day_of_week,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time
            )
            if self.pk:
                teacher_conflict = teacher_conflict.exclude(pk=self.pk)
            if teacher_conflict.exists():
                raise ValidationError(
                    _('Teacher already has a class at this time on this day')
                )

        # Classroom not double-booked
        if self.classroom_id and self.day_of_week is not None and self.start_time and self.end_time:
            room_conflict = TeacherTimetable.objects.filter(
                classroom=self.classroom,
                academic_year=self.academic_year,
                term=self.term,
                day_of_week=self.day_of_week,
                start_time__lt=self.end_time,
                end_time__gt=self.start_time
            )
            if self.pk:
                room_conflict = room_conflict.exclude(pk=self.pk)
            if room_conflict.exists():
                raise ValidationError(
                    _('Classroom "{r}" is already occupied at this time').format(
                        r=self.classroom.name
                    )
                )

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        day_name = dict(self.DAYS_OF_WEEK).get(self.day_of_week, str(self.day_of_week))
        return (
            f"{self.teacher.full_name} - {day_name} "
            f"{self.start_time} → {self.end_time} [{self.classroom.name}]"
        )

    @property
    def duration_minutes(self):
        if self.start_time and self.end_time:
            s = datetime.combine(date.today(), self.start_time)
            e = datetime.combine(date.today(), self.end_time)
            return int((e - s).total_seconds() / 60)
        return 0

    @property
    def day_name(self):
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        return days[self.day_of_week] if 0 <= self.day_of_week < len(days) else str(self.day_of_week)
    
    
    
    
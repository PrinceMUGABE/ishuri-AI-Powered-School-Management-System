from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
import os

from academics.models import AcademicYear, ClassLevel, Subject, ClassRoom
from accounts.models import User
from students.models import Student
from teachers.models import Teacher, TeacherAssignment


def grade_upload_path(instance, filename):
    return f'grades/{instance.academic_year.name}/{instance.class_level.code}/{filename}'


def assignment_upload_path(instance, filename):
    return f'assignments/{instance.academic_year.name}/{instance.class_level.code}/{filename}'


# ─────────────────────────────────────────────
#  GRADE MODELS
# ─────────────────────────────────────────────

class GradeUpload(models.Model):
    """
    Represents one Excel file upload containing grades for a
    specific teacher / class-level / subject / academic-year combination.
    """

    class Status(models.TextChoices):
        PENDING   = 'pending',   _('Pending Review')
        APPROVED  = 'approved',  _('Approved')
        REJECTED  = 'rejected',  _('Rejected')

    teacher          = models.ForeignKey(Teacher,       on_delete=models.CASCADE, related_name='grade_uploads',       verbose_name=_('teacher'))
    academic_year    = models.ForeignKey(AcademicYear,  on_delete=models.CASCADE, related_name='grade_uploads',       verbose_name=_('academic year'))
    class_level      = models.ForeignKey(ClassLevel,    on_delete=models.CASCADE, related_name='grade_uploads',       verbose_name=_('class level'))
    subject          = models.ForeignKey(Subject,       on_delete=models.CASCADE, related_name='grade_uploads',       verbose_name=_('subject'))

    excel_file       = models.FileField(_('excel file'), upload_to=grade_upload_path)
    status           = models.CharField(_('status'), max_length=20, choices=Status.choices, default=Status.PENDING, db_index=True)

    # Admin review
    reviewed_by      = models.ForeignKey(User,  on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_grade_uploads',   verbose_name=_('reviewed by'))
    reviewed_at      = models.DateTimeField(_('reviewed at'), null=True, blank=True)
    rejection_reason = models.TextField(_('rejection reason'), blank=True)
    admin_notes      = models.TextField(_('admin notes'), blank=True)

    # Term / period info
    term             = models.CharField(_('term / period'), max_length=50, blank=True)

    uploaded_by      = models.ForeignKey(User,  on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_grade_files',      verbose_name=_('uploaded by'))
    created_at       = models.DateTimeField(auto_now_add=True)
    updated_at       = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('grade upload')
        verbose_name_plural = _('grade uploads')
        ordering            = ['-created_at']
        unique_together     = [['teacher', 'class_level', 'subject', 'academic_year', 'term']]
        indexes             = [
            models.Index(fields=['status']),
            models.Index(fields=['teacher', 'academic_year']),
        ]

    def clean(self):
        if self.excel_file:
            ext = os.path.splitext(self.excel_file.name)[1].lower()
            if ext not in ['.xlsx', '.xls']:
                raise ValidationError({'excel_file': _('Only .xlsx or .xls files are allowed for grade uploads.')})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.teacher} – {self.subject} – {self.class_level} ({self.academic_year})"


class StudentGrade(models.Model):
    """
    Individual grade record for a student, parsed from an uploaded Excel file.
    Only visible/published once the parent GradeUpload is approved.
    """

    grade_upload  = models.ForeignKey(GradeUpload, on_delete=models.CASCADE, related_name='student_grades', verbose_name=_('grade upload'))
    student       = models.ForeignKey(Student,     on_delete=models.CASCADE, related_name='grades',         verbose_name=_('student'))

    score         = models.DecimalField(
        _('score'), max_digits=6, decimal_places=2,
        validators=[MinValueValidator(Decimal('0')), MaxValueValidator(Decimal('100'))]
    )
    max_score     = models.DecimalField(
        _('max score'), max_digits=6, decimal_places=2, default=Decimal('100'),
        validators=[MinValueValidator(Decimal('1'))]
    )
    grade_letter  = models.CharField(_('grade letter'), max_length=5, blank=True)
    remarks       = models.TextField(_('remarks'), blank=True)

    # Denormalised for fast queries (populated on approval)
    is_published  = models.BooleanField(_('is published'), default=False, db_index=True)
    published_at  = models.DateTimeField(_('published at'), null=True, blank=True)

    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('student grade')
        verbose_name_plural = _('student grades')
        ordering            = ['student__full_name']
        unique_together     = [['grade_upload', 'student']]

    @property
    def percentage(self):
        if self.max_score:
            return round((self.score / self.max_score) * 100, 2)
        return None

    @property
    def subject(self):
        return self.grade_upload.subject

    @property
    def class_level(self):
        return self.grade_upload.class_level

    @property
    def academic_year(self):
        return self.grade_upload.academic_year

    def __str__(self):
        return f"{self.student} – {self.grade_upload.subject}: {self.score}"


# ─────────────────────────────────────────────
#  ATTENDANCE MODELS
# ─────────────────────────────────────────────

class AttendanceSession(models.Model):
    """
    One attendance-taking session: one teacher, one class, one subject, one date.
    The act of creating/submitting this record proves teacher presence.
    """

    teacher       = models.ForeignKey(Teacher,      on_delete=models.CASCADE, related_name='attendance_sessions',  verbose_name=_('teacher'))
    class_level   = models.ForeignKey(ClassLevel,   on_delete=models.CASCADE, related_name='attendance_sessions',  verbose_name=_('class level'))
    subject       = models.ForeignKey(Subject,      on_delete=models.CASCADE, related_name='attendance_sessions',  verbose_name=_('subject'))
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='attendance_sessions',  verbose_name=_('academic year'))
    classroom     = models.ForeignKey(ClassRoom,    on_delete=models.SET_NULL, null=True, blank=True, related_name='attendance_sessions', verbose_name=_('classroom'))

    date          = models.DateField(_('date'), db_index=True)
    start_time    = models.TimeField(_('start time'), null=True, blank=True)
    end_time      = models.TimeField(_('end time'),   null=True, blank=True)
    notes         = models.TextField(_('notes'), blank=True)

    is_submitted  = models.BooleanField(_('submitted'), default=False, db_index=True)
    submitted_at  = models.DateTimeField(_('submitted at'), null=True, blank=True)

    created_by    = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_attendance_sessions', verbose_name=_('created by'))
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('attendance session')
        verbose_name_plural = _('attendance sessions')
        ordering            = ['-date']
        unique_together     = [['teacher', 'class_level', 'subject', 'date', 'academic_year']]
        indexes             = [
            models.Index(fields=['date', 'teacher']),
            models.Index(fields=['class_level', 'date']),
        ]

    def __str__(self):
        return f"{self.teacher} – {self.subject} – {self.date}"


class StudentAttendance(models.Model):
    """
    Individual attendance record for one student in one session.
    """

    class AttendanceStatus(models.TextChoices):
        PRESENT  = 'present',  _('Present')
        ABSENT   = 'absent',   _('Absent')
        LATE     = 'late',     _('Late')
        EXCUSED  = 'excused',  _('Excused')

    session   = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='records',   verbose_name=_('session'))
    student   = models.ForeignKey(Student,           on_delete=models.CASCADE, related_name='attendances', verbose_name=_('student'))
    status    = models.CharField(_('status'), max_length=20, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT, db_index=True)
    remarks   = models.TextField(_('remarks'), blank=True)

    # Computed discipline score fields (populated by AI/calculation engine)
    discipline_score      = models.DecimalField(_('discipline score'), max_digits=5, decimal_places=2, null=True, blank=True)
    discipline_zone       = models.CharField(
        _('discipline zone'), max_length=10, blank=True,
        choices=[('low', _('Low')), ('medium', _('Medium')), ('high', _('High'))]
    )

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('student attendance')
        verbose_name_plural = _('student attendances')
        ordering            = ['student__full_name']
        unique_together     = [['session', 'student']]
        indexes             = [
            models.Index(fields=['status']),
            models.Index(fields=['student', 'status']),
        ]

    def __str__(self):
        return f"{self.student} – {self.session.date} – {self.status}"


# ─────────────────────────────────────────────
#  ASSIGNMENT MODELS
# ─────────────────────────────────────────────

class Assignment(models.Model):
    """
    A PDF assignment uploaded by a teacher for a class/subject.
    Students view & download only; physical submission in class.
    """

    class Status(models.TextChoices):
        ACTIVE   = 'active',   _('Active')
        INACTIVE = 'inactive', _('Inactive')
        EXPIRED  = 'expired',  _('Expired')

    teacher       = models.ForeignKey(Teacher,      on_delete=models.CASCADE, related_name='teacher_uploaded_assignments',  verbose_name=_('teacher'))
    class_level   = models.ForeignKey(ClassLevel,   on_delete=models.CASCADE, related_name='assignment_class_levels',  verbose_name=_('class level'))
    subject       = models.ForeignKey(Subject,      on_delete=models.CASCADE, related_name='assignment_class_subjects',  verbose_name=_('subject'))
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='assignment_academic_years',  verbose_name=_('academic year'))

    title         = models.CharField(_('title'), max_length=300)
    description   = models.TextField(_('description'), blank=True)
    instructions  = models.TextField(_('instructions'), blank=True)

    pdf_file      = models.FileField(_('PDF file'), upload_to=assignment_upload_path)

    due_date      = models.DateField(_('due date'), null=True, blank=True)
    total_marks   = models.DecimalField(
        _('total marks'), max_digits=6, decimal_places=2, null=True, blank=True,
        validators=[MinValueValidator(Decimal('0'))]
    )

    status        = models.CharField(_('status'), max_length=20, choices=Status.choices, default=Status.ACTIVE, db_index=True)

    uploaded_by   = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_assignments', verbose_name=_('uploaded by'))
    created_at    = models.DateTimeField(auto_now_add=True)
    updated_at    = models.DateTimeField(auto_now=True)

    class Meta:
        verbose_name        = _('assignment')
        verbose_name_plural = _('assignments')
        ordering            = ['-created_at']
        indexes             = [
            models.Index(fields=['teacher', 'subject']),
            models.Index(fields=['class_level', 'academic_year']),
            models.Index(fields=['status']),
            models.Index(fields=['due_date']),
        ]

    def clean(self):
        if self.pdf_file:
            ext = os.path.splitext(self.pdf_file.name)[1].lower()
            if ext != '.pdf':
                raise ValidationError({'pdf_file': _('Only PDF files are allowed for assignments.')})

    def save(self, *args, **kwargs):
        self.clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.title} – {self.subject} – {self.class_level}"
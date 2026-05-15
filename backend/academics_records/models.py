# academics_records/models.py

from django.db import models
from django.utils.translation import gettext_lazy as _
from django.core.validators import MinValueValidator, MaxValueValidator, FileExtensionValidator
from django.core.exceptions import ValidationError
from decimal import Decimal
import os

from academics.models import AcademicYear, ClassLevel, Subject, ClassRoom, Term, SchoolLevel
from accounts.models import User
from students.models import Student
from teachers.models import Teacher


def grade_upload_path(instance, filename):
    """Organize files: academic_year/term/school_level/class_level/subject/grade_type/"""
    return os.path.join(
        instance.academic_year.name.replace('/', '_'),
        instance.term or 'no_term',
        instance.class_level.school_level.name.replace('/', '_'),
        instance.class_level.name.replace('/', '_'),
        instance.subject.name.replace('/', '_'),
        instance.grade_type,
        filename
    )


def attendance_upload_path(instance, filename):
    """Organize attendance files"""
    return os.path.join(
        'attendance',
        instance.academic_year.name.replace('/', '_'),
        instance.term.name if instance.term else 'no_term',
        instance.class_level.school_level.name.replace('/', '_'),
        instance.class_level.name.replace('/', '_'),
        instance.subject.name.replace('/', '_'),
        filename
    )


def assignment_upload_path(instance, filename):
    """Organize assignment files"""
    return os.path.join(
        'assignments',
        instance.academic_year.name.replace('/', '_'),
        instance.term.name if instance.term else 'no_term',
        instance.class_level.school_level.name.replace('/', '_'),
        instance.class_level.name.replace('/', '_'),
        instance.subject.name.replace('/', '_'),
        filename
    )


class GradeType(models.TextChoices):
    """Types of assessments with their standard weightings"""
    ASSIGNMENT = 'assignment', _('Assignment')
    QUIZ = 'quiz', _('Quiz')
    MID_TERM = 'mid_term', _('Mid-Term Exam')
    FINAL_EXAM = 'final_exam', _('Final Exam')
    PROJECT = 'project', _('Project')
    PRACTICAL = 'practical', _('Practical')
    ORAL = 'oral', _('Oral Assessment')
    HOMEWORK = 'homework', _('Homework')

    @classmethod
    def get_default_weight(cls, grade_type):
        """Get default weight percentage for each grade type"""
        weights = {
            cls.ASSIGNMENT: Decimal('10'),
            cls.QUIZ: Decimal('15'),
            cls.MID_TERM: Decimal('25'),
            cls.FINAL_EXAM: Decimal('40'),
            cls.PROJECT: Decimal('20'),
            cls.PRACTICAL: Decimal('30'),
            cls.ORAL: Decimal('20'),
            cls.HOMEWORK: Decimal('5'),
        }
        return weights.get(grade_type, Decimal('10'))


class GradeUploadStatus(models.TextChoices):
    PENDING = 'pending', _('Pending Review')
    APPROVED = 'approved', _('Approved')
    REJECTED = 'rejected', _('Rejected')
    NEEDS_REVIEW = 'needs_review', _('Needs Review')


class GradeUpload(models.Model):
    """Grade upload record - stores only the uploaded file and metadata"""
    
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='grade_uploads')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='grade_uploads')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='grade_uploads', null=True, blank=True)
    school_level = models.ForeignKey(SchoolLevel, on_delete=models.CASCADE, related_name='grade_uploads')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='grade_uploads')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='grade_uploads')
    classroom = models.ForeignKey(ClassRoom, on_delete=models.SET_NULL, null=True, blank=True, related_name='grade_uploads')
    
    grade_type = models.CharField(max_length=30, choices=GradeType.choices, default=GradeType.ASSIGNMENT)
    weight_percentage = models.DecimalField(max_digits=5, decimal_places=2, default=Decimal('10'))
    max_score_possible = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('100'))
    assessment_date = models.DateField(null=True, blank=True)
    
    excel_file = models.FileField(upload_to=grade_upload_path, validators=[
        FileExtensionValidator(allowed_extensions=['xlsx', 'xls'])
    ])
    status = models.CharField(max_length=20, choices=GradeUploadStatus.choices, default=GradeUploadStatus.PENDING, db_index=True)
    
    # Review fields
    reviewed_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='reviewed_grade_uploads')
    reviewed_at = models.DateTimeField(null=True, blank=True)
    rejection_reason = models.TextField(blank=True)
    admin_notes = models.TextField(blank=True)
    
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_grade_files')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('grade upload')
        verbose_name_plural = _('grade uploads')
        ordering = ['-created_at']
        unique_together = [['teacher', 'academic_year', 'term', 'class_level', 'subject', 'grade_type']]
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['teacher', 'academic_year']),
            models.Index(fields=['class_level', 'subject']),
        ]
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.subject.name} - {self.get_grade_type_display()} ({self.academic_year.name})"


class StudentGrade(models.Model):
    """Individual grade record - stores only the raw grade data"""
    
    grade_upload = models.ForeignKey(GradeUpload, on_delete=models.CASCADE, related_name='student_grades')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='grades')
    
    score = models.DecimalField(max_digits=6, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    max_score = models.DecimalField(max_digits=6, decimal_places=2, default=Decimal('100'))
    remarks = models.TextField(blank=True)
    
    # Teacher can override grade letter if needed
    custom_grade_letter = models.CharField(max_length=5, blank=True)
    
    is_published = models.BooleanField(default=False, db_index=True)
    published_at = models.DateTimeField(null=True, blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('student grade')
        verbose_name_plural = _('student grades')
        ordering = ['student__full_name']
        unique_together = [['grade_upload', 'student']]
        indexes = [
            models.Index(fields=['student', 'is_published']),
        ]
    
    def __str__(self):
        return f"{self.student.full_name} - {self.grade_upload.subject.name}: {self.score}/{self.max_score}"


class AttendanceSession(models.Model):
    """Attendance session - one class session"""
    
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='attendance_sessions')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='attendance_sessions')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='attendance_sessions', null=True, blank=True)
    school_level = models.ForeignKey(SchoolLevel, on_delete=models.CASCADE, related_name='attendance_sessions')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='attendance_sessions')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='attendance_sessions')
    classroom = models.ForeignKey(ClassRoom, on_delete=models.SET_NULL, null=True, blank=True, related_name='attendance_sessions')
    
    session_date = models.DateField(db_index=True)
    start_time = models.TimeField(null=True, blank=True)
    end_time = models.TimeField(null=True, blank=True)
    notes = models.TextField(blank=True)
    
    excel_file = models.FileField(upload_to=attendance_upload_path, null=True, blank=True)
    is_submitted = models.BooleanField(default=False, db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    
    created_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='created_attendance_sessions')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('attendance session')
        verbose_name_plural = _('attendance sessions')
        ordering = ['-session_date']
        unique_together = [['teacher', 'class_level', 'subject', 'session_date', 'academic_year']]
        indexes = [
            models.Index(fields=['session_date', 'teacher']),
            models.Index(fields=['class_level', 'session_date']),
        ]
    
    def __str__(self):
        return f"{self.teacher.full_name} - {self.subject.name} - {self.session_date}"


class StudentAttendance(models.Model):
    """Individual attendance record - stores only the raw attendance data"""
    
    class AttendanceStatus(models.TextChoices):
        PRESENT = 'present', _('Present')
        ABSENT = 'absent', _('Absent')
        LATE = 'late', _('Late')
        EXCUSED = 'excused', _('Excused')
    
    session = models.ForeignKey(AttendanceSession, on_delete=models.CASCADE, related_name='records')
    student = models.ForeignKey(Student, on_delete=models.CASCADE, related_name='attendances')
    status = models.CharField(max_length=20, choices=AttendanceStatus.choices, default=AttendanceStatus.PRESENT, db_index=True)
    remarks = models.TextField(blank=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('student attendance')
        verbose_name_plural = _('student attendances')
        unique_together = [['session', 'student']]
        indexes = [
            models.Index(fields=['status']),
            models.Index(fields=['student', 'status']),
        ]
    
    def __str__(self):
        return f"{self.student.full_name} - {self.session.session_date} - {self.status}"


class Assignment(models.Model):
    """Assignment uploaded by teacher"""
    
    class AssignmentStatus(models.TextChoices):
        ACTIVE = 'active', _('Active')
        EXPIRED = 'expired', _('Expired')
        ARCHIVED = 'archived', _('Archived')
    
    teacher = models.ForeignKey(Teacher, on_delete=models.CASCADE, related_name='assignments')
    academic_year = models.ForeignKey(AcademicYear, on_delete=models.CASCADE, related_name='assignments')
    term = models.ForeignKey(Term, on_delete=models.CASCADE, related_name='assignments', null=True, blank=True)
    school_level = models.ForeignKey(SchoolLevel, on_delete=models.CASCADE, related_name='assignments')
    class_level = models.ForeignKey(ClassLevel, on_delete=models.CASCADE, related_name='assignments')
    subject = models.ForeignKey(Subject, on_delete=models.CASCADE, related_name='assignments')
    classroom = models.ForeignKey(ClassRoom, on_delete=models.SET_NULL, null=True, blank=True, related_name='assignments')
    
    title = models.CharField(max_length=300)
    description = models.TextField(blank=True)
    instructions = models.TextField(blank=True)
    
    pdf_file = models.FileField(upload_to=assignment_upload_path, validators=[
        FileExtensionValidator(allowed_extensions=['pdf'])
    ])
    
    due_date = models.DateField(null=True, blank=True, db_index=True)
    due_time = models.TimeField(null=True, blank=True)
    total_marks = models.DecimalField(max_digits=6, decimal_places=2, null=True, blank=True)
    
    status = models.CharField(max_length=20, choices=AssignmentStatus.choices, default=AssignmentStatus.ACTIVE, db_index=True)
    
    uploaded_by = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, blank=True, related_name='uploaded_assignments')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = _('assignment')
        verbose_name_plural = _('assignments')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['teacher', 'subject']),
            models.Index(fields=['class_level', 'academic_year']),
            models.Index(fields=['status', 'due_date']),
        ]
    
    @property
    def is_expired(self):
        from django.utils import timezone
        from datetime import datetime, date
        
        if self.due_date:
            today = date.today()
            if self.due_date < today:
                return True
            if self.due_date == today and self.due_time:
                now = timezone.now().time()
                return self.due_time < now
        return False
    
    def save(self, *args, **kwargs):
        if self.is_expired and self.status == AssignmentStatus.ACTIVE:
            self.status = AssignmentStatus.EXPIRED
        super().save(*args, **kwargs)
    
    def __str__(self):
        return f"{self.title} - {self.subject.name} ({self.class_level.name})"
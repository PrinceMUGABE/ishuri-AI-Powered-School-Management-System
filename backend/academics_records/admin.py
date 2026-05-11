from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from .models import GradeUpload, StudentGrade, AttendanceSession, StudentAttendance, Assignment


# ── Grade Admin ───────────────────────────────────────────────────────────────

class StudentGradeInline(admin.TabularInline):
    model = StudentGrade
    extra = 0
    readonly_fields = ('student', 'score', 'max_score', 'grade_letter', 'is_published', 'published_at')
    can_delete = False


@admin.register(GradeUpload)
class GradeUploadAdmin(admin.ModelAdmin):
    list_display  = ('teacher', 'class_level', 'subject', 'academic_year', 'term', 'status', 'created_at')
    list_filter   = ('status', 'academic_year', 'class_level')
    search_fields = ('teacher__full_name', 'subject__name', 'class_level__name')
    readonly_fields = ('uploaded_by', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at')
    inlines = [StudentGradeInline]
    actions = ['approve_selected', 'reject_selected']

    def approve_selected(self, request, queryset):
        from django.utils import timezone
        for upload in queryset.filter(status='pending'):
            upload.status = GradeUpload.Status.APPROVED
            upload.reviewed_by = request.user
            upload.reviewed_at = timezone.now()
            upload.save()
            upload.student_grades.update(is_published=True, published_at=timezone.now())
        self.message_user(request, _("Selected grade uploads have been approved."))
    approve_selected.short_description = _("Approve selected grade uploads")

    def reject_selected(self, request, queryset):
        queryset.filter(status='pending').update(status=GradeUpload.Status.REJECTED)
        self.message_user(request, _("Selected grade uploads have been rejected."))
    reject_selected.short_description = _("Reject selected grade uploads")


@admin.register(StudentGrade)
class StudentGradeAdmin(admin.ModelAdmin):
    list_display  = ('student', 'grade_upload', 'score', 'max_score', 'grade_letter', 'is_published')
    list_filter   = ('is_published', 'grade_upload__subject', 'grade_upload__class_level')
    search_fields = ('student__full_name', 'student__roll_number')
    readonly_fields = ('published_at', 'created_at', 'updated_at')


# ── Attendance Admin ──────────────────────────────────────────────────────────

class StudentAttendanceInline(admin.TabularInline):
    model  = StudentAttendance
    extra  = 0
    fields = ('student', 'status', 'remarks', 'discipline_score', 'discipline_zone')
    readonly_fields = ('discipline_score', 'discipline_zone')


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display  = ('teacher', 'class_level', 'subject', 'date', 'is_submitted', 'submitted_at')
    list_filter   = ('is_submitted', 'date', 'class_level', 'subject')
    search_fields = ('teacher__full_name', 'subject__name', 'class_level__name')
    readonly_fields = ('created_by', 'submitted_at', 'created_at', 'updated_at')
    inlines = [StudentAttendanceInline]
    date_hierarchy = 'date'


@admin.register(StudentAttendance)
class StudentAttendanceAdmin(admin.ModelAdmin):
    list_display  = ('student', 'session', 'status', 'discipline_score', 'discipline_zone')
    list_filter   = ('status', 'discipline_zone', 'session__subject')
    search_fields = ('student__full_name', 'student__roll_number')
    readonly_fields = ('discipline_score', 'discipline_zone', 'created_at', 'updated_at')


# ── Assignment Admin ──────────────────────────────────────────────────────────

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display  = ('title', 'teacher', 'class_level', 'subject', 'academic_year', 'due_date', 'status')
    list_filter   = ('status', 'class_level', 'subject', 'academic_year')
    search_fields = ('title', 'teacher__full_name', 'subject__name')
    readonly_fields = ('uploaded_by', 'created_at', 'updated_at')
    date_hierarchy = 'due_date'
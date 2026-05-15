# academics_records/admin.py

from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.utils.html import format_html
from .models import GradeUpload, GradeUploadStatus, StudentGrade, AttendanceSession, StudentAttendance, Assignment


# ── Grade Admin ───────────────────────────────────────────────────────────────

class StudentGradeInline(admin.TabularInline):
    model = StudentGrade
    extra = 0
    fields = ('student', 'score', 'max_score', 'custom_grade_letter', 'remarks', 'is_published')
    readonly_fields = ('created_at', 'updated_at')
    can_delete = False


@admin.register(GradeUpload)
class GradeUploadAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'class_level', 'subject', 'grade_type', 'weight_percentage', 
                   'academic_year', 'term', 'status', 'created_at')
    list_filter = ('status', 'grade_type', 'academic_year', 'class_level')
    search_fields = ('teacher__full_name', 'subject__name', 'class_level__name')
    readonly_fields = ('uploaded_by', 'reviewed_by', 'reviewed_at', 'created_at', 'updated_at', 'file_link')
    inlines = [StudentGradeInline]
    actions = ['approve_selected', 'reject_selected']
    
    def file_link(self, obj):
        if obj.excel_file:
            return format_html('<a href="{}" target="_blank">Download File</a>', obj.excel_file.url)
        return '-'
    file_link.short_description = _('Excel File')

    def approve_selected(self, request, queryset):
        from django.utils import timezone
        for upload in queryset.filter(status=GradeUploadStatus.PENDING):
            upload.status = GradeUploadStatus.APPROVED
            upload.reviewed_by = request.user
            upload.reviewed_at = timezone.now()
            upload.save()
            upload.student_grades.update(is_published=True, published_at=timezone.now())
        self.message_user(request, _("Selected grade uploads have been approved."))
    approve_selected.short_description = _("Approve selected grade uploads")

    def reject_selected(self, request, queryset):
        queryset.filter(status=GradeUploadStatus.PENDING).update(status=GradeUploadStatus.REJECTED)
        self.message_user(request, _("Selected grade uploads have been rejected."))
    reject_selected.short_description = _("Reject selected grade uploads")


@admin.register(StudentGrade)
class StudentGradeAdmin(admin.ModelAdmin):
    list_display = ('student', 'grade_upload_subject', 'score', 'max_score', 
                   'get_percentage', 'custom_grade_letter', 'is_published')
    list_filter = ('is_published', 'grade_upload__subject', 'grade_upload__class_level', 'grade_upload__grade_type')
    search_fields = ('student__full_name', 'student__roll_number')
    readonly_fields = ('created_at', 'updated_at', 'published_at', 'get_percentage')
    
    def grade_upload_subject(self, obj):
        return obj.grade_upload.subject.name
    grade_upload_subject.short_description = _('Subject')
    
    def get_percentage(self, obj):
        if obj.max_score:
            percentage = (obj.score / obj.max_score) * 100
            return f"{percentage:.1f}%"
        return '-'
    get_percentage.short_description = _('Percentage')


# ── Attendance Admin ──────────────────────────────────────────────────────────

class StudentAttendanceInline(admin.TabularInline):
    model = StudentAttendance
    extra = 0
    fields = ('student', 'status', 'remarks')
    readonly_fields = ('created_at', 'updated_at')


@admin.register(AttendanceSession)
class AttendanceSessionAdmin(admin.ModelAdmin):
    list_display = ('teacher', 'class_level', 'subject', 'session_date', 'is_submitted', 'submitted_at')
    list_filter = ('is_submitted', 'session_date', 'class_level', 'subject', 'academic_year')
    search_fields = ('teacher__full_name', 'subject__name', 'class_level__name')
    readonly_fields = ('created_by', 'submitted_at', 'created_at', 'updated_at', 'file_link')
    inlines = [StudentAttendanceInline]
    date_hierarchy = 'session_date'
    
    def file_link(self, obj):
        if obj.excel_file:
            return format_html('<a href="{}" target="_blank">Download File</a>', obj.excel_file.url)
        return '-'
    file_link.short_description = _('Excel File')


@admin.register(StudentAttendance)
class StudentAttendanceAdmin(admin.ModelAdmin):
    list_display = ('student', 'session_info', 'status', 'session_date')
    list_filter = ('status', 'session__subject', 'session__class_level')
    search_fields = ('student__full_name', 'student__roll_number')
    readonly_fields = ('created_at', 'updated_at')
    
    def session_info(self, obj):
        return f"{obj.session.subject.name} - {obj.session.teacher.full_name}"
    session_info.short_description = _('Session')
    
    def session_date(self, obj):
        return obj.session.session_date
    session_date.short_description = _('Date')
    session_date.admin_order_field = 'session__session_date'


# ── Assignment Admin ──────────────────────────────────────────────────────────

@admin.register(Assignment)
class AssignmentAdmin(admin.ModelAdmin):
    list_display = ('title', 'teacher', 'class_level', 'subject', 'due_date', 'due_time', 'status', 'is_expired')
    list_filter = ('status', 'class_level', 'subject', 'academic_year', 'term')
    search_fields = ('title', 'teacher__full_name', 'subject__name')
    readonly_fields = ('uploaded_by', 'created_at', 'updated_at', 'pdf_link', 'is_expired')
    date_hierarchy = 'due_date'
    actions = ['mark_active', 'mark_expired', 'mark_archived']
    
    def pdf_link(self, obj):
        if obj.pdf_file:
            return format_html('<a href="{}" target="_blank">View PDF</a>', obj.pdf_file.url)
        return '-'
    pdf_link.short_description = _('PDF File')
    
    def is_expired(self, obj):
        return obj.is_expired
    is_expired.boolean = True
    is_expired.short_description = _('Expired')
    
    def mark_active(self, request, queryset):
        updated = queryset.update(status=Assignment.AssignmentStatus.ACTIVE)
        self.message_user(request, _("{} assignment(s) marked as active.").format(updated))
    mark_active.short_description = _("Mark selected as Active")
    
    def mark_expired(self, request, queryset):
        updated = queryset.update(status=Assignment.AssignmentStatus.EXPIRED)
        self.message_user(request, _("{} assignment(s) marked as expired.").format(updated))
    mark_expired.short_description = _("Mark selected as Expired")
    
    def mark_archived(self, request, queryset):
        updated = queryset.update(status=Assignment.AssignmentStatus.ARCHIVED)
        self.message_user(request, _("{} assignment(s) archived.").format(updated))
    mark_archived.short_description = _("Archive selected")
from django.contrib import admin
from django.utils.html import format_html
from .models import Teacher, TeacherDocument, TeacherAssignment, TeacherTimetable


class TeacherDocumentInline(admin.TabularInline):
    model = TeacherDocument
    extra = 1
    fields = ['document_type', 'title', 'description', 'file']
    readonly_fields = ['uploaded_at', 'uploaded_by']


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'phone_number', 'status', 'education_level', 'age', 'work_hours_per_week']
    list_filter = ['status', 'education_level', 'gender']
    search_fields = ['first_name', 'last_name', 'email', 'phone_number']
    readonly_fields = ['age', 'created_at', 'updated_at', 'created_by']
    inlines = [TeacherDocumentInline]
    
    fieldsets = (
        ('Personal Information', {
            'fields': ('first_name', 'last_name', 'middle_name', 'email', 'phone_number', 'address', 'gender', 'birth_date', 'age')
        }),
        ('Professional Information', {
            'fields': ('salary', 'work_hours_per_week', 'specializations', 'hire_date')
        }),
        ('Education', {
            'fields': ('education_level', 'qualifications', 'qualification_document')
        }),
        ('Status & Profile', {
            'fields': ('status', 'profile_picture', 'bio')
        }),
        ('System Information', {
            'fields': ('user', 'created_by', 'created_at', 'updated_at')
        }),
    )
    
    def save_model(self, request, obj, form, change):
        if not change:  # New teacher being created
            obj.created_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TeacherAssignment)
class TeacherAssignmentAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'subject', 'class_level', 'classroom', 'term', 'status', 'hours_per_week']
    list_filter = ['status', 'academic_year', 'term', 'school_level']
    search_fields = ['teacher__first_name', 'teacher__last_name', 'subject__name', 'class_level__name']
    readonly_fields = ['assigned_at', 'updated_at', 'assigned_by']
    
    def save_model(self, request, obj, form, change):
        if not change:  # New assignment being created
            obj.assigned_by = request.user
        super().save_model(request, obj, form, change)


@admin.register(TeacherTimetable)
class TeacherTimetableAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'day_of_week', 'start_time', 'end_time', 'subject', 'class_level', 'classroom']
    list_filter = ['academic_year', 'term', 'day_of_week']
    search_fields = ['teacher__first_name', 'teacher__last_name', 'subject__name']
    readonly_fields = ['created_at', 'updated_at', 'created_by']


@admin.register(TeacherDocument)
class TeacherDocumentAdmin(admin.ModelAdmin):
    list_display = ['title', 'teacher', 'document_type', 'uploaded_at', 'file_link']
    list_filter = ['document_type']
    search_fields = ['title', 'teacher__first_name', 'teacher__last_name']
    readonly_fields = ['uploaded_at', 'uploaded_by']
    
    def file_link(self, obj):
        if obj.file:
            return format_html('<a href="{}" target="_blank">Download</a>', obj.file.url)
        return "No file"
    file_link.short_description = 'File'
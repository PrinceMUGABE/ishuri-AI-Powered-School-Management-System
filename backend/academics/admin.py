# admin.py
from django.contrib import admin
from .models import (
    AcademicYear, Term, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, PaymentType, ClassLevelCost, SchoolDaySetting,
    ClassroomAssignment, SchoolBreak
)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_current', 'created_at']
    list_filter = ['is_current']
    search_fields = ['name']
    list_editable = ['is_current']


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ['name', 'academic_year', 'term_number', 'start_date', 'end_date', 'is_current']
    list_filter = ['academic_year', 'term_number', 'is_current']
    search_fields = ['name']
    list_editable = ['is_current']


@admin.register(SchoolLevel)
class SchoolLevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_time', 'end_time', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']


@admin.register(ClassLevel)
class ClassLevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'school_level', 'is_active']
    list_filter = ['school_level', 'is_active']
    search_fields = ['name', 'code']


@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'room_type', 'capacity', 'status']
    list_filter = ['room_type', 'status']
    search_fields = ['name', 'code']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'pass_mark', 'status']
    list_filter = ['status']
    search_fields = ['name', 'code']


@admin.register(ClassLevelSubject)
class ClassLevelSubjectAdmin(admin.ModelAdmin):
    list_display = ['class_level', 'subject', 'teaching_frequency', 'hours_per_week', 'is_compulsory']
    list_filter = ['class_level', 'subject', 'teaching_frequency', 'is_compulsory']
    search_fields = ['class_level__name', 'subject__name']


@admin.register(PaymentType)
class PaymentTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active']
    list_filter = ['is_active']
    search_fields = ['name', 'code']


@admin.register(ClassLevelCost)
class ClassLevelCostAdmin(admin.ModelAdmin):
    list_display = ['name', 'class_level', 'payment_type', 'amount', 'is_mandatory']  # Fixed: changed 'frequency' to 'payment_type'
    list_filter = ['class_level', 'payment_type', 'is_mandatory']  # Fixed: changed 'frequency' to 'payment_type'
    search_fields = ['name', 'class_level__name']


@admin.register(SchoolDaySetting)
class SchoolDaySettingAdmin(admin.ModelAdmin):
    list_display = ['academic_year', 'day_type', 'weekday', 'specific_date', 'is_active']
    list_filter = ['academic_year', 'day_type', 'is_active']
    search_fields = ['description']


@admin.register(ClassroomAssignment)
class ClassroomAssignmentAdmin(admin.ModelAdmin):
    list_display = ['classroom', 'class_level', 'term', 'academic_year', 'is_primary']
    list_filter = ['academic_year', 'term', 'class_level', 'is_primary']
    search_fields = ['classroom__name', 'class_level__name']
    
    
    
@admin.register(SchoolBreak)
class SchoolBreakAdmin(admin.ModelAdmin):
    list_display = ['name', 'break_type', 'school_level', 'start_time', 'end_time', 'duration_minutes', 'is_active']
    list_filter = ['break_type', 'school_level', 'is_active']
    search_fields = ['name', 'description']
    readonly_fields = ['duration_minutes']
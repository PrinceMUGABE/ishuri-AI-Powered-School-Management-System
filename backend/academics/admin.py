from django.contrib import admin
from .models import (
    AcademicYear, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, ClassLevelCost, ClassRoomSubject
)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'status', 'is_current']
    list_filter = ['status', 'is_current']
    search_fields = ['name']


@admin.register(SchoolLevel)
class SchoolLevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'level_type', 'order', 'is_active']
    list_filter = ['level_type', 'is_active']
    search_fields = ['name']


@admin.register(ClassLevel)
class ClassLevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'category', 'school_level', 'order', 'is_active']
    list_filter = ['category', 'school_level', 'is_active']
    search_fields = ['name', 'code']


@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'code', 'class_level', 'shift', 'capacity', 'current_enrollment', 'is_active']
    list_filter = ['class_level', 'shift', 'room_type', 'is_active']
    search_fields = ['name', 'full_name', 'code']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'category', 'grading_system', 'is_active']
    list_filter = ['category', 'grading_system', 'is_active']
    search_fields = ['name', 'code']


@admin.register(ClassLevelSubject)
class ClassLevelSubjectAdmin(admin.ModelAdmin):
    list_display = ['class_level', 'subject', 'teaching_frequency', 'hours_per_week', 'is_compulsory', 'status']
    list_filter = ['teaching_frequency', 'is_compulsory', 'status', 'term_offered']
    search_fields = ['class_level__name', 'subject__name']


@admin.register(ClassLevelCost)
class ClassLevelCostAdmin(admin.ModelAdmin):
    list_display = ['class_level', 'name', 'payment_type', 'amount', 'frequency', 'is_mandatory']
    list_filter = ['payment_type', 'frequency', 'is_mandatory', 'is_active']
    search_fields = ['class_level__name', 'name']


@admin.register(ClassRoomSubject)
class ClassRoomSubjectAdmin(admin.ModelAdmin):
    list_display = ['class_room', 'class_level_subject', 'teacher', 'is_active']
    list_filter = ['is_active']
    search_fields = ['class_room__full_name', 'class_level_subject__subject__name']
from django.contrib import admin
from .models import (
    AcademicYear, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, ClassLevelCost
)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_current']
    list_filter = ['is_current']
    search_fields = ['name']
    list_editable = ['is_current']


@admin.register(SchoolLevel)
class SchoolLevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name']
    list_editable = ['is_active']


@admin.register(ClassLevel)
class ClassLevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'school_level', 'is_active']
    list_filter = ['school_level', 'is_active']
    search_fields = ['name', 'code']


@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'class_level', 'room_type', 'capacity', 'status']
    list_filter = ['class_level', 'room_type', 'status']
    search_fields = ['name', 'code']


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'pass_mark', 'status']
    list_filter = ['status']
    search_fields = ['name', 'code']
    list_editable = ['status']


@admin.register(ClassLevelSubject)
class ClassLevelSubjectAdmin(admin.ModelAdmin):
    list_display = ['class_level', 'subject', 'teaching_frequency', 'hours_per_week', 'is_compulsory']
    list_filter = ['teaching_frequency', 'is_compulsory']
    search_fields = ['class_level__name', 'subject__name']


@admin.register(ClassLevelCost)
class ClassLevelCostAdmin(admin.ModelAdmin):
    list_display = ['name', 'academic_year', 'class_level', 'amount', 'frequency', 'is_mandatory']
    list_filter = ['academic_year', 'class_level', 'frequency', 'is_mandatory']
    search_fields = ['name']
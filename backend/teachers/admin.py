from django.contrib import admin
from .models import Teacher, TeacherAssignment, SchoolDaySetting, Holiday, TeacherTimetable


@admin.register(Teacher)
class TeacherAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'email', 'phone_number', 'status', 'education_level', 'age']
    list_filter = ['status', 'education_level', 'gender']
    search_fields = ['full_name', 'email', 'phone_number']
    readonly_fields = ['age', 'created_at', 'updated_at']


@admin.register(TeacherAssignment)
class TeacherAssignmentAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'subject', 'class_level', 'school_level', 'status']
    list_filter = ['status', 'school_level']
    search_fields = ['teacher__full_name', 'subject__name']


@admin.register(SchoolDaySetting)
class SchoolDaySettingAdmin(admin.ModelAdmin):
    list_display = ['school_level', 'day_of_week', 'is_school_day', 'start_time', 'end_time']
    list_filter = ['school_level', 'is_school_day']
    search_fields = ['school_level__name']


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date', 'is_recurring', 'school_level', 'academic_year']
    list_filter = ['is_recurring', 'school_level', 'academic_year']
    search_fields = ['name']


@admin.register(TeacherTimetable)
class TeacherTimetableAdmin(admin.ModelAdmin):
    list_display = ['teacher', 'day_of_week', 'start_time', 'end_time', 'subject', 'classroom']
    list_filter = ['teacher', 'day_of_week', 'academic_year']
    search_fields = ['teacher__full_name', 'subject__name']
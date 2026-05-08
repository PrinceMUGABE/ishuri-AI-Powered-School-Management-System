from django.contrib import admin
from .models import Student, Parent, StudentParent


class StudentParentInline(admin.TabularInline):
    model = StudentParent
    extra = 1
    autocomplete_fields = ['parent']


@admin.register(Student)
class StudentAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'roll_number', 'email', 'status',
                    'current_school_level', 'current_class_level', 'created_at']
    list_filter = ['status', 'current_school_level', 'current_class_level', 'current_academic_year']
    search_fields = ['full_name', 'roll_number', 'email']
    readonly_fields = ['roll_number', 'created_at', 'updated_at']
    inlines = [StudentParentInline]
    raw_id_fields = ['user', 'created_by']


@admin.register(Parent)
class ParentAdmin(admin.ModelAdmin):
    list_display = ['full_name', 'phone_number', 'email', 'relationship_type', 'status', 'created_at']
    list_filter = ['status', 'relationship_type']
    search_fields = ['full_name', 'phone_number', 'email']
    readonly_fields = ['created_at', 'updated_at']
    raw_id_fields = ['user', 'created_by']


@admin.register(StudentParent)
class StudentParentAdmin(admin.ModelAdmin):
    list_display = ['student', 'parent', 'is_primary_contact', 'created_at']
    list_filter = ['is_primary_contact']
    search_fields = ['student__full_name', 'parent__full_name']
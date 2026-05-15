# admin.py
from django.contrib import admin
from django.utils.translation import gettext_lazy as _
from django.urls import reverse
from django.utils.html import format_html
from .models import (
    AcademicYear, Term, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, PaymentType, ClassLevelCost, SchoolDaySetting,
    SchoolBreak, Holiday
)


@admin.register(AcademicYear)
class AcademicYearAdmin(admin.ModelAdmin):
    list_display = ['name', 'start_date', 'end_date', 'is_current', 'created_at']
    list_filter = ['is_current']
    search_fields = ['name']
    list_editable = ['is_current']
    list_per_page = 25
    date_hierarchy = 'start_date'
    
    fieldsets = (
        (None, {
            'fields': ('name', 'start_date', 'end_date', 'is_current')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(Term)
class TermAdmin(admin.ModelAdmin):
    list_display = ['name', 'academic_year', 'term_number', 'start_date', 'end_date', 'is_current']
    list_filter = ['academic_year', 'term_number', 'is_current']
    search_fields = ['name', 'academic_year__name']
    list_editable = ['is_current']
    list_per_page = 25
    date_hierarchy = 'start_date'
    
    fieldsets = (
        (None, {
            'fields': ('academic_year', 'term_number', 'name', 'start_date', 'end_date', 'is_current')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('academic_year')


@admin.register(SchoolLevel)
class SchoolLevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'daily_hours_display', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'description']
    list_per_page = 25
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description', 'is_active')
        }),
        (_('Daily Schedule'), {
            'fields': ('start_time', 'end_time'),
            'description': _('Set the daily start and end times for this school level. These times will be used for timetable generation.')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def daily_hours_display(self, obj):
        if obj.start_time and obj.end_time:
            return f"{obj.start_time.strftime('%H:%M')} - {obj.end_time.strftime('%H:%M')}"
        return "—"
    daily_hours_display.short_description = _('Daily Hours')
    daily_hours_display.admin_order_field = 'start_time'


@admin.register(ClassLevel)
class ClassLevelAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'school_level', 'is_active', 'assigned_classroom_display']
    list_filter = ['school_level', 'is_active']
    search_fields = ['name', 'code', 'school_level__name']
    list_per_page = 25
    list_select_related = ['school_level']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'school_level', 'description', 'is_active')
        }),
        (_('Classroom Assignment'), {
            'fields': ('assigned_classroom',),
            'description': _('The classroom assigned to this class level. Each classroom can only be assigned to one class level.')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def assigned_classroom_display(self, obj):
        if hasattr(obj, 'assigned_classroom') and obj.assigned_classroom:
            classroom = obj.assigned_classroom
            return format_html(
                '<a href="{}">{}</a>',
                reverse('admin:academics_classroom_change', args=[classroom.id]),
                classroom.name
            )
        return "—"
    assigned_classroom_display.short_description = _('Assigned Classroom')
    assigned_classroom_display.admin_order_field = 'assigned_classroom__name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('school_level', 'assigned_classroom')


@admin.register(ClassRoom)
class ClassRoomAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'room_type', 'capacity', 'status', 'assigned_class_level_display']
    list_filter = ['room_type', 'status', 'assigned_class_level']
    search_fields = ['name', 'code']
    list_per_page = 25
    list_editable = ['status']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'room_type', 'capacity', 'status')
        }),
        (_('Assignment'), {
            'fields': ('assigned_class_level',),
            'description': _('Assign this classroom to a class level. Each classroom can only be assigned to ONE class level at a time.')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def assigned_class_level_display(self, obj):
        if obj.assigned_class_level:
            return format_html(
                '<a href="{}">{}</a>',
                reverse('admin:academics_classlevel_change', args=[obj.assigned_class_level.id]),
                obj.assigned_class_level.name
            )
        return format_html('<span style="color: #999;">— Unassigned —</span>')
    assigned_class_level_display.short_description = _('Assigned To')
    assigned_class_level_display.admin_order_field = 'assigned_class_level__name'
    
    def get_queryset(self, request):
        return super().get_queryset(request).select_related('assigned_class_level')


@admin.register(Subject)
class SubjectAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'pass_mark', 'status', 'class_levels_count']
    list_filter = ['status']
    search_fields = ['name', 'code', 'description']
    list_per_page = 25
    list_editable = ['status']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'status')
        }),
        (_('Academic Settings'), {
            'fields': ('pass_mark', 'description')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def class_levels_count(self, obj):
        count = obj.class_levels.count()
        return format_html('<span class="badge">{}</span>', count)
    class_levels_count.short_description = _('Class Levels')
    
    def get_queryset(self, request):
        return super().get_queryset(request).prefetch_related('class_levels')


@admin.register(ClassLevelSubject)
class ClassLevelSubjectAdmin(admin.ModelAdmin):
    list_display = ['class_level', 'subject', 'teaching_frequency', 'hours_per_week', 'is_compulsory']
    list_filter = ['class_level', 'subject', 'teaching_frequency', 'is_compulsory']
    search_fields = ['class_level__name', 'subject__name']
    list_per_page = 25
    list_select_related = ['class_level', 'subject']
    
    fieldsets = (
        (None, {
            'fields': ('class_level', 'subject')
        }),
        (_('Teaching Schedule'), {
            'fields': ('teaching_frequency', 'hours_per_week', 'is_compulsory')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(PaymentType)
class PaymentTypeAdmin(admin.ModelAdmin):
    list_display = ['name', 'code', 'is_active', 'created_at']
    list_filter = ['is_active']
    search_fields = ['name', 'code', 'description']
    list_per_page = 25
    list_editable = ['is_active']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'code', 'description', 'is_active')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']


@admin.register(ClassLevelCost)
class ClassLevelCostAdmin(admin.ModelAdmin):
    list_display = ['name', 'class_level', 'payment_type', 'amount_display', 'is_mandatory', 'academic_year']
    list_filter = ['class_level', 'payment_type', 'is_mandatory', 'academic_year']
    search_fields = ['name', 'class_level__name', 'description']
    list_per_page = 25
    list_select_related = ['class_level', 'payment_type', 'academic_year']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'description')
        }),
        (_('Fee Details'), {
            'fields': ('academic_year', 'class_level', 'payment_type', 'amount', 'is_mandatory')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def amount_display(self, obj):
        return f"RWF {obj.amount:,.2f}"
    amount_display.short_description = _('Amount')
    amount_display.admin_order_field = 'amount'


@admin.register(SchoolDaySetting)
class SchoolDaySettingAdmin(admin.ModelAdmin):
    list_display = ['academic_year', 'day_type_badge', 'weekday_or_date', 'is_active']
    list_filter = ['academic_year', 'day_type', 'is_active']
    search_fields = ['description', 'academic_year__name']
    list_per_page = 25
    list_select_related = ['academic_year']
    
    fieldsets = (
        (None, {
            'fields': ('academic_year', 'day_type', 'description', 'is_active')
        }),
        (_('Schedule'), {
            'fields': ('weekday', 'specific_date'),
            'description': _('Either select a weekday OR specify a specific date, not both.')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def day_type_badge(self, obj):
        colors = {
            'learning': 'green',
            'day_off': 'red',
            'special': 'amber'
        }
        color = colors.get(obj.day_type, 'gray')
        return format_html(
            '<span style="background-color: var(--{}); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">{}</span>',
            color,
            obj.get_day_type_display()
        )
    day_type_badge.short_description = _('Day Type')
    
    def weekday_or_date(self, obj):
        if obj.specific_date:
            return f"📅 {obj.specific_date}"
        return f"📆 {obj.get_weekday_display()}"
    weekday_or_date.short_description = _('Weekday / Date')


@admin.register(SchoolBreak)
class SchoolBreakAdmin(admin.ModelAdmin):
    list_display = ['name', 'break_type_badge', 'school_level', 'time_range', 'duration_minutes', 'is_active']
    list_filter = ['break_type', 'school_level', 'is_active']
    search_fields = ['name', 'description', 'school_level__name']
    list_per_page = 25
    list_select_related = ['school_level']
    readonly_fields = ['duration_minutes']
    
    fieldsets = (
        (None, {
            'fields': ('name', 'break_type', 'school_level', 'description', 'is_active')
        }),
        (_('Time Settings'), {
            'fields': ('start_time', 'end_time', 'duration_minutes'),
            'description': _('Duration is automatically calculated from start and end times.')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['duration_minutes', 'created_at', 'updated_at']
    
    def break_type_badge(self, obj):
        colors = {
            'short_break': 'blue',
            'lunch': 'amber',
            'recess': 'green',
            'other': 'gray'
        }
        color = colors.get(obj.break_type, 'gray')
        return format_html(
            '<span style="background-color: var(--{}); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">{}</span>',
            color,
            obj.get_break_type_display()
        )
    break_type_badge.short_description = _('Break Type')
    
    def time_range(self, obj):
        if obj.start_time and obj.end_time:
            return f"{obj.start_time.strftime('%H:%M')} → {obj.end_time.strftime('%H:%M')}"
        return "—"
    time_range.short_description = _('Time Range')


@admin.register(Holiday)
class HolidayAdmin(admin.ModelAdmin):
    list_display = ['name', 'date_display', 'academic_year', 'school_level', 'recurring_badge']
    list_filter = ['academic_year', 'school_level', 'is_recurring']
    search_fields = ['name', 'description', 'academic_year__name']
    list_per_page = 25
    list_select_related = ['academic_year', 'school_level']
    date_hierarchy = 'date'
    
    fieldsets = (
        (None, {
            'fields': ('name', 'date', 'academic_year', 'school_level', 'description')
        }),
        (_('Recurring Settings'), {
            'fields': ('is_recurring',),
            'description': _('If checked, this holiday will recur every year on the same date.')
        }),
        (_('Timestamps'), {
            'fields': ('created_at', 'updated_at'),
            'classes': ('collapse',)
        }),
    )
    readonly_fields = ['created_at', 'updated_at']
    
    def date_display(self, obj):
        return format_html(
            '<span style="font-family: monospace;">📅 {}</span>',
            obj.date.strftime('%Y-%m-%d')
        )
    date_display.short_description = _('Date')
    date_display.admin_order_field = 'date'
    
    def recurring_badge(self, obj):
        if obj.is_recurring:
            return format_html(
                '<span style="background-color: var(--amber); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">🔄 {}</span>',
                _('Yearly')
            )
        return format_html(
            '<span style="background-color: var(--gray); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px;">📅 {}</span>',
            _('Once')
        )
    recurring_badge.short_description = _('Recurring')


# Custom admin site configuration
admin.site.site_header = _('School Management System')
admin.site.site_title = _('School Admin')
admin.site.index_title = _('Dashboard')
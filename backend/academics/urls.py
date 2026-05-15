from django.urls import path
from . import views

app_name = 'academics'

urlpatterns = [
    # Academic Years
    path('academic-years/', views.academic_year_list_create, name='academic_years'),
    path('academic-years/<int:pk>/', views.academic_year_detail, name='academic_year'),
    
    # School Levels
    path('school-levels/', views.school_level_list_create, name='school_levels'),
    path('school-levels/<int:pk>/', views.school_level_detail, name='school_level'),
    
    # Class Levels
    path('class-levels/', views.class_level_list_create, name='class_levels'),
    path('class-levels/<int:pk>/', views.class_level_detail, name='class_level'),
    path('school-levels/<int:school_level_id>/class-levels/', 
         views.get_class_levels_by_school, name='school_level_class_levels'),
    path('school-levels/<int:school_level_id>/class-levels/', 
         views.get_class_levels_by_school_level, name='school_level_class_levels'),

    # Classrooms
    path('class-rooms/', views.classroom_list_create, name='classrooms'),
    path('class-rooms/<int:pk>/', views.classroom_detail, name='classroom'),
    
    # Subjects
    path('subjects/', views.subject_list_create, name='subjects'),
    path('subjects/<int:pk>/', views.subject_detail, name='subject'),
    
    # Assignments
    path('class-level-subjects/', views.class_level_subject_list_create, name='assignments'),
    path('class-level-subjects/<int:pk>/', views.class_level_subject_delete, name='delete_assignment'),
    path('class-levels/<int:class_level_id>/subjects/', 
         views.get_subjects_by_class_level, name='class_level_subjects'),
    
    # Fee Structures
    path('class-level-costs/', views.class_level_cost_list_create, name='costs'),
    path('class-level-costs/<int:pk>/', views.class_level_cost_detail, name='cost'),

    
    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
    
    # Terms
    path('terms/', views.term_list_create, name='terms'),
    path('terms/<int:pk>/', views.term_detail, name='term'),
    
    # Payment Types
    path('payment-types/', views.payment_type_list_create, name='payment_types'),
    
    # School Day Settings
    path('day-settings/', views.school_day_setting_list_create, name='day_settings'),
    path('day-settings/<int:pk>/', views.school_day_setting_detail, name='day_setting'),
    
    # Classroom Assignments
    path('classrooms/<int:classroom_id>/assign/', views.assign_classroom_to_class_level, name='assign-classroom'),
    path('classrooms/<int:classroom_id>/unassign/', views.unassign_classroom, name='unassign-classroom'),
    path('class-levels/<int:class_level_id>/classrooms/', views.get_classrooms_by_class_level, name='classrooms-by-class-level'),
    path('classrooms/unassigned/', views.get_unassigned_classrooms, name='unassigned-classrooms'),
    
    # Utility
    path('learning-days/', views.get_learning_days, name='learning_days'),
    
    path('school-breaks/', views.school_break_list_create, name='school_breaks'),
    path('school-breaks/<int:pk>/', views.school_break_detail, name='school_break'),
    path('school-levels/<int:school_level_id>/breaks/', 
          views.get_breaks_by_school_level, name='school_level_breaks'),
    
    
    path('holidays/', views.holiday_list_create, name='holidays'),
    path('holidays/<int:pk>/', views.holiday_detail, name='holiday'),
    path('academic-years/<int:academic_year_id>/holidays/', 
          views.get_holidays_by_academic_year, name='academic_year_holidays'),
    path('holidays/by-date-range/', 
          views.get_holidays_by_date_range, name='holidays_by_date_range'),
    path('holidays/upcoming/', 
          views.get_upcoming_holidays, name='upcoming_holidays'),
]
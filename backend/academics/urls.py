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
]
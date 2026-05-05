from django.urls import path
from . import views

app_name = 'academics'

urlpatterns = [
    # Academic Years
    path('academic-years/', views.academic_year_list_create, name='academic_years'),
    path('academic-years/current/', views.current_academic_year, name='current_academic_year'),
    path('academic-years/<int:pk>/', views.academic_year_detail, name='academic_year'),
    
    # School Levels
    path('school-levels/', views.school_level_list, name='school_levels'),
    path('school-levels/create/', views.school_level_create, name='create_school_level'),
    path('school-levels/<int:pk>/', views.school_level_detail, name='school_level'),
    path('school-levels/<int:school_level_id>/class-levels/', 
         views.get_class_levels_by_school, 
         name='school_level_class_levels'),
    
    # Class Levels
    path('class-levels/', views.class_level_list, name='class_levels'),
    path('class-levels/create/', views.class_level_create, name='create_class_level'),
    path('class-levels/<int:pk>/', views.class_level_detail, name='class_level'),
    path('class-levels/<int:class_level_id>/subjects/', 
         views.get_subjects_by_class_level, 
         name='class_level_subjects'),
    
    # Class Rooms
    path('class-rooms/', views.classroom_list, name='classrooms'),
    path('class-rooms/create/', views.classroom_create, name='create_classroom'),
    path('class-rooms/<int:pk>/', views.classroom_detail, name='classroom'),
    
    # Subjects
    path('subjects/', views.subject_list, name='subjects'),
    path('subjects/create/', views.subject_create, name='create_subject'),
    path('subjects/<int:pk>/', views.subject_detail, name='subject'),
    
    # Class Level Subjects (Assignment)
    path('assignments/', views.class_level_subject_list, name='assignments'),
    path('assignments/create/', views.class_level_subject_create, name='create_assignment'),
    path('assignments/<int:pk>/', views.class_level_subject_delete, name='delete_assignment'),
    
    # Class Level Costs
    path('costs/', views.class_level_cost_list, name='costs'),
    path('costs/create/', views.class_level_cost_create, name='create_cost'),
    path('costs/<int:pk>/', views.class_level_cost_detail, name='cost'),
    
    # Dashboard
    path('dashboard/stats/', views.dashboard_stats, name='dashboard_stats'),
]
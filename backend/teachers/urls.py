from django.urls import path
from . import views

app_name = 'teachers'

urlpatterns = [
    # Teacher CRUD
    path('teachers/', views.teacher_list_create, name='teacher_list_create'),
    path('teachers/<int:pk>/', views.teacher_detail, name='teacher_detail'),
    path('teachers/profile/', views.teacher_profile, name='teacher_profile'),
    
    # Teacher Assignments
    path('assignments/', views.assignment_list_create, name='assignment_list_create'),
    path('assignments/<int:pk>/', views.assignment_delete, name='assignment_delete'),
    
    # Timetable
    path('timetable/generate/', views.generate_timetable, name='generate_timetable'),
    path('timetable/', views.get_teacher_timetable, name='get_my_timetable'),
    path('timetable/<int:teacher_id>/', views.get_teacher_timetable, name='get_teacher_timetable'),
    
    # School Day Settings
    path('day-settings/', views.day_setting_list_create, name='day_setting_list_create'),
    path('day-settings/<int:pk>/', views.day_setting_detail, name='day_setting_detail'),
    
    # Holidays
    path('holidays/', views.holiday_list_create, name='holiday_list_create'),
    path('holidays/<int:pk>/', views.holiday_delete, name='holiday_delete'),
]
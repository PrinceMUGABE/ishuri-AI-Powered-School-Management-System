from django.urls import path
from . import views

app_name = 'teachers'

urlpatterns = [
    # Teacher CRUD
    path('teachers/', views.teacher_list_create, name='teacher_list_create'),
    path('teachers/<int:pk>/', views.teacher_detail, name='teacher_detail'),
    path('profile/', views.teacher_profile, name='teacher_profile'),
    path('change-password/', views.change_password, name='change_password'),
    path('me/', views.teacher_me, name='teacher_me'),
    
    # Teacher Documents
    path('teachers/documents/', views.teacher_documents, name='teacher_documents'),
    path('teachers/<int:teacher_id>/documents/', views.teacher_documents, name='teacher_documents_by_teacher'),
    path('teachers/documents/<int:document_id>/delete/', views.teacher_document_delete, name='teacher_document_delete'),
    
    # Teacher Assignments
    path('assignments/', views.assignment_list_create, name='assignment_list_create'),
    path('assignments/<int:pk>/', views.assignment_detail, name='assignment_detail'),
    path('assignments/<int:pk>/delete/', views.assignment_detail, name='assignment_delete'),
    path('timetable/my-assignments/', views.get_my_teaching_assignments, name='my_teaching_assignments'),
    
    # Timetable
    path('timetable/generate/', views.generate_timetable, name='generate_timetable'),
    path('timetable/', views.get_teacher_timetable, name='get_timetable'),
    path('timetable/<int:teacher_id>/', views.get_teacher_timetable, name='get_teacher_timetable'),
    path('timetable/export/', views.export_teacher_timetable, name='export_my_timetable'),
    path('timetable/export/<int:teacher_id>/', views.export_teacher_timetable, name='export_teacher_timetable'),
    
    # Holidays
    path('holidays/', views.holiday_list_create, name='holiday_list_create'),
    path('holidays/<int:pk>/', views.holiday_detail, name='holiday_detail'),
    path('holidays/<int:pk>/delete/', views.holiday_delete, name='holiday_delete'),
    
    # School Day Settings
    path('day-settings/', views.day_setting_list_create, name='day_setting_list_create'),
    path('day-settings/<int:pk>/', views.day_setting_detail, name='day_setting_detail'),
    
    # Reports
    path('reports/', views.teacher_report, name='teacher_report'),
]
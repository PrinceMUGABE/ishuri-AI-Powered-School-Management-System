# academics_records/urls.py

from django.urls import path
from . import views

app_name = 'academics_records'

urlpatterns = [
    # Grade uploads
    path('grades/upload/', views.upload_grades, name='upload_grades'),
    path('grades/uploads/', views.get_grade_uploads, name='get_grade_uploads'),
    path('grades/upload/<int:upload_id>/approve/', views.approve_grade_upload, name='approve_grade_upload'),
    
    # Performance (real-time calculations)
    path('performance/student/<int:student_id>/', views.get_student_performance, name='get_student_performance'),
    path('performance/me/', views.get_student_performance, name='get_my_performance'),
    path('performance/student/<int:student_id>/subject/<int:subject_id>/', 
         views.get_subject_performance, name='get_subject_performance'),
    path('performance/class/<int:class_level_id>/', views.get_class_performance, name='get_class_performance'),
    
    # Attendance
    path('attendance/upload/', views.upload_attendance, name='upload_attendance'),
    path('attendance/student/<int:student_id>/', views.get_student_attendance, name='get_student_attendance'),
    
    # Assignments
    path('assignments/upload/', views.upload_assignment, name='upload_assignment'),
    path('assignments/', views.get_assignments, name='get_assignments'),
    
    # Teacher utilities
    path('teacher/students/', views.get_teacher_students, name='get_teacher_students'),
]
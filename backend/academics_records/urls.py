# academics_records/urls.py

from django.urls import path
from . import views
from . import template_views

app_name = 'academics_records'

urlpatterns = [
    # ── Grade uploads ──────────────────────────────────────────────────────
    path('grades/upload/', views.upload_grades, name='upload_grades'),
    path('grades/uploads/', views.get_grade_uploads, name='get_grade_uploads'),
    path('grades/upload/<int:upload_id>/approve/', views.approve_grade_upload, name='approve_grade_upload'),
    path('grades/manual/', views.create_manual_grade, name='create_manual_grade'),
    path('grades/teacher/', views.get_teacher_grades, name='get_teacher_grades'),

    # ── Performance (real-time calculations) ───────────────────────────────
    path('performance/student/<int:student_id>/', views.get_student_performance, name='get_student_performance'),
    path('performance/me/', views.get_student_performance, name='get_my_performance'),
    path('performance/student/<int:student_id>/subject/<int:subject_id>/',
         views.get_subject_performance, name='get_subject_performance'),
    path('performance/class/<int:class_level_id>/', views.get_class_performance, name='get_class_performance'),

    # ── Attendance Session Management ──────────────────────────────────────
    # LIST and CREATE (different HTTP methods on same URL pattern)
    path('attendance/sessions/', views.get_attendance_sessions, name='get_attendance_sessions'),
    path('attendance/sessions/create/', views.create_attendance_session, name='create_attendance_session'),  # Separate create endpoint
    
    # RETRIEVE, UPDATE, DELETE for specific session
    path('attendance/sessions/<int:session_id>/', views.attendance_session_detail, name='attendance_session_detail'),
    path('attendance/session/<int:session_id>/', views.attendance_session_detail, name='attendance_session_detail_alt'),
    
    # Individual record update
    path('attendance/records/<int:record_id>/', views.update_attendance_record, name='update_attendance_record'),
    path('attendance/record/<int:record_id>/', views.update_attendance_record, name='update_attendance_record_alt'),
    
    
    # Delete session
    path('attendance/sessions/<int:session_id>/delete/', views.delete_attendance_session, name='delete_attendance_session'),
    path('attendance/session/<int:session_id>/delete/', views.delete_attendance_session, name='delete_attendance_session_alt'),

    # ── Teacher Students ──────────────────────────────────────────────────────
    path('students/teacher/classroom/<int:classroom_id>/students/', 
         views.get_teacher_students_for_classroom, 
         name='get_teacher_students_for_classroom'),

    # ── Attendance (legacy, keep for backward compatibility) ─────────────────
    path('attendance/upload/', views.upload_attendance, name='upload_attendance'),
    path('attendance/student/<int:student_id>/', views.get_student_attendance, name='get_student_attendance'),

    # ── Assignments ────────────────────────────────────────────────────────
    path('assignments/upload/', views.upload_assignment, name='upload_assignment'),
    path('assignments/', views.get_assignments, name='get_assignments'),
    path('assignments/<int:assignment_id>/', views.assignment_detail, name='assignment_detail'),
    path('assignments/<int:assignment_id>/download/', views.download_assignment_file, name='download_assignment_file'),
    path('assignments/<int:assignment_id>/preview/', views.preview_assignment_file, name='preview_assignment_file'),

    # ── Teacher utilities ──────────────────────────────────────────────────
    path('teacher/students/', views.get_teacher_students, name='get_teacher_students'),

    # ── Excel template downloads ───────────────────────────────────────────
    path('templates/grades/', template_views.download_grade_template, name='download_grade_template'),
    path('templates/attendance/', template_views.download_attendance_template, name='download_attendance_template'),
    path('templates/trimesters/', template_views.list_trimesters, name='list_trimesters'),

    # ── Excel template uploads ──────────────────────────────────────────
    path('templates/grades/upload/', template_views.upload_grade_template_file, name='upload_grade_template_file'),
    path('templates/attendance/upload/', template_views.upload_attendance_template_file, name='upload_attendance_template_file'),
    
    # ── Grade management ───────────────────────────────────────────────────
    path('grades/student-grades/', views.get_student_grades, name='get_student_grades'),
    path('grades/student-grade/<int:grade_id>/', views.student_grade_detail, name='student_grade_detail'),
    path('grades/upload/<int:upload_id>/', views.grade_upload_detail, name='grade_upload_detail'),
    path('grades/upload/<int:upload_id>/download/', views.download_grade_upload_file, name='download_grade_upload_file'),
    path('grades/upload/<int:upload_id>/preview/', views.preview_grade_upload_file, name='preview_grade_upload_file'),
    path('performance/student/<int:student_id>/full-report/', views.get_student_full_report, name='student_full_report'),
    path('performance/student/my-full-report/', views.get_my_full_report, name='my_full_report'),
]
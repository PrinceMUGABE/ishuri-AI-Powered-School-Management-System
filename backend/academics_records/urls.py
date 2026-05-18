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

    # ── Attendance ─────────────────────────────────────────────────────────
    path('attendance/upload/', views.upload_attendance, name='upload_attendance'),
    path('attendance/student/<int:student_id>/', views.get_student_attendance, name='get_student_attendance'),

    # ── Assignments ────────────────────────────────────────────────────────
    path('assignments/upload/', views.upload_assignment, name='upload_assignment'),
    path('assignments/', views.get_assignments, name='get_assignments'),

    # ── Teacher utilities ──────────────────────────────────────────────────
    path('teacher/students/', views.get_teacher_students, name='get_teacher_students'),

    # ── Excel template downloads ───────────────────────────────────────────
    # GET ?academic_year_id=&term_id=&school_level_id=&class_level_id=&subject_id=&grade_type=
    path('templates/grades/', template_views.download_grade_template, name='download_grade_template'),

    # GET ?academic_year_id=&term_id=&school_level_id=&class_level_id=&subject_id=&session_date=
    path('templates/attendance/', template_views.download_attendance_template, name='download_attendance_template'),

    # GET ?academic_year_id= (optional)
    path('templates/trimesters/', template_views.list_trimesters, name='list_trimesters'),

    # ── Excel template uploads (filled templates) ──────────────────────────
    # POST multipart: excel_file + academic_year_id + term_id + school_level_id + class_level_id + subject_id + grade_type
    path('templates/grades/upload/', template_views.upload_grade_template_file, name='upload_grade_template_file'),

    # POST multipart: excel_file + academic_year_id + term_id + school_level_id + class_level_id + subject_id + session_date
    path('templates/attendance/upload/', template_views.upload_attendance_template_file, name='upload_attendance_template_file'),
    
    
    path('grades/student-grades/', views.get_student_grades, name='get_student_grades'),
    path('grades/student-grade/<int:grade_id>/', views.student_grade_detail, name='student_grade_detail'),
    path('grades/upload/<int:upload_id>/', views.grade_upload_detail, name='grade_upload_detail'),
    path('grades/upload/<int:upload_id>/download/', views.download_grade_upload_file, name='download_grade_upload_file'),
]
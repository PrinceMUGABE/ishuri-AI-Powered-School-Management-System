"""
academics_records/urls.py

All URL patterns for the grades, attendance, and assignments app.
"""
from django.urls import path
from . import views, template_views

app_name = 'academics_records'

urlpatterns = [

    # ── GRADES ──────────────────────────────────────────────────────────────────
    # POST  /api/academics-records/grades/upload/
    path(
        'grades/upload/',
        views.upload_student_grades,
        name='upload_student_grades',
    ),
    # GET   /api/academics-records/grades/all/          (admin)
    path(
        'grades/all/',
        views.get_all_grade_uploads,
        name='get_all_grade_uploads',
    ),
    # GET   /api/academics-records/grades/student/<int:student_id>/
    path(
        'grades/student/<int:student_id>/',
        views.get_grades_for_student,
        name='get_grades_for_student',
    ),
    # GET   /api/academics-records/grades/teacher/
    path(
        'grades/teacher/',
        views.get_teacher_grades,
        name='get_teacher_grades',
    ),
    # GET   /api/academics-records/grades/teacher/class/<int:class_level_id>/
    path(
        'grades/teacher/class/<int:class_level_id>/',
        views.get_teacher_grades_by_class,
        name='get_teacher_grades_by_class',
    ),
    # GET   /api/academics-records/grades/teacher/class/<int:class_level_id>/subject/<int:subject_id>/
    path(
        'grades/teacher/class/<int:class_level_id>/subject/<int:subject_id>/',
        views.get_teacher_grades_by_class_and_subject,
        name='get_teacher_grades_by_class_and_subject',
    ),
    # PATCH /api/academics-records/grades/<int:grade_id>/update/
    path(
        'grades/<int:grade_id>/update/',
        views.update_student_grade,
        name='update_student_grade',
    ),
    # POST  /api/academics-records/grades/upload/<int:upload_id>/approve/
    path(
        'grades/upload/<int:upload_id>/approve/',
        views.approve_reject_grade_upload,
        name='approve_reject_grade_upload',
    ),
    # DELETE /api/academics-records/grades/upload/<int:upload_id>/delete/   (admin)
    path(
        'grades/upload/<int:upload_id>/delete/',
        views.delete_grade_upload,
        name='delete_grade_upload',
    ),

    # ── ATTENDANCE ───────────────────────────────────────────────────────────────
    # POST  /api/academics-records/attendance/create/
    path(
        'attendance/create/',
        views.create_attendance_session,
        name='create_attendance_session',
    ),
    # POST  /api/academics-records/attendance/<int:session_id>/submit/
    path(
        'attendance/<int:session_id>/submit/',
        views.submit_attendance_session,
        name='submit_attendance_session',
    ),
    # GET   /api/academics-records/attendance/all/      (admin)
    path(
        'attendance/all/',
        views.get_all_attendance_sessions,
        name='get_all_attendance_sessions',
    ),
    # GET   /api/academics-records/attendance/teacher/
    path(
        'attendance/teacher/',
        views.get_teacher_attendance_sessions,
        name='get_teacher_attendance_sessions',
    ),
    # GET   /api/academics-records/attendance/teacher/subject/<int:subject_id>/
    path(
        'attendance/teacher/subject/<int:subject_id>/',
        views.get_teacher_attendance_by_subject,
        name='get_teacher_attendance_by_subject',
    ),
    # POST  /api/academics-records/attendance/<int:session_id>/records/add/
    path(
        'attendance/<int:session_id>/records/add/',
        views.add_student_attendance,
        name='add_student_attendance',
    ),
    # PATCH /api/academics-records/attendance/records/<int:record_id>/update/
    path(
        'attendance/records/<int:record_id>/update/',
        views.update_student_attendance,
        name='update_student_attendance',
    ),
    # DELETE /api/academics-records/attendance/<int:session_id>/delete/  (admin)
    path(
        'attendance/<int:session_id>/delete/',
        views.delete_attendance_session,
        name='delete_attendance_session',
    ),
    # DELETE /api/academics-records/attendance/records/<int:record_id>/delete/  (admin)
    path(
        'attendance/records/<int:record_id>/delete/',
        views.delete_student_attendance_record,
        name='delete_student_attendance_record',
    ),
    # GET   /api/academics-records/attendance/student/<int:student_id>/summary/
    path(
        'attendance/student/<int:student_id>/summary/',
        views.get_student_attendance_summary,
        name='get_student_attendance_summary',
    ),
    # GET   /api/academics-records/attendance/report/teachers/  (admin)
    path(
        'attendance/report/teachers/',
        views.get_teacher_attendance_report,
        name='get_teacher_attendance_report',
    ),

    # ── ASSIGNMENTS ──────────────────────────────────────────────────────────────
    # POST  /api/academics-records/assignments/upload/
    path(
        'assignments/upload/',
        views.upload_assignment,
        name='upload_assignment',
    ),
    # GET   /api/academics-records/assignments/all/     (admin)
    path(
        'assignments/all/',
        views.get_all_assignments,
        name='get_all_assignments',
    ),
    # GET   /api/academics-records/assignments/teacher/
    path(
        'assignments/teacher/',
        views.get_teacher_assignments,
        name='get_teacher_assignments',
    ),
    # GET   /api/academics-records/assignments/teacher/subject/<int:subject_id>/
    path(
        'assignments/teacher/subject/<int:subject_id>/',
        views.get_teacher_assignments_by_subject,
        name='get_teacher_assignments_by_subject',
    ),
    # GET   /api/academics-records/assignments/teacher/school-level/<int:school_level_id>/
    path(
        'assignments/teacher/school-level/<int:school_level_id>/',
        views.get_teacher_assignments_by_school_level,
        name='get_teacher_assignments_by_school_level',
    ),
    # GET   /api/academics-records/assignments/<int:assignment_id>/
    path(
        'assignments/<int:assignment_id>/',
        views.get_assignment_detail,
        name='get_assignment_detail',
    ),
    # PATCH /api/academics-records/assignments/<int:assignment_id>/update/
    path(
        'assignments/<int:assignment_id>/update/',
        views.update_assignment,
        name='update_assignment',
    ),
    # DELETE /api/academics-records/assignments/<int:assignment_id>/delete/
    path(
        'assignments/<int:assignment_id>/delete/',
        views.delete_assignment,
        name='delete_assignment',
    ),
    # GET   /api/academics-records/assignments/class/<int:class_level_id>/
    path(
        'assignments/class/<int:class_level_id>/',
        views.get_class_assignments,
        name='get_class_assignments',
    ),
    
    # Template download endpoints
    path('templates/grades/', template_views.download_grade_template, name='download_grade_template'),
    path('templates/attendance/', template_views.download_attendance_template, name='download_attendance_template'),
    path('templates/trimesters/', template_views.list_trimesters, name='list_trimesters'),
    
    # Template upload endpoints
    path('grades/upload-template/', views.upload_grade_template_file, name='upload_grade_template'),
    path('attendance/upload-template/', views.upload_attendance_template_file, name='upload_attendance_template'),
    
    # Teacher student fetch
    path('teacher/students/', views.get_teacher_current_students, name='get_teacher_students'),
    path('teacher/students/<int:class_level_id>/', views.get_teacher_current_students, name='get_teacher_students_by_class'),
]
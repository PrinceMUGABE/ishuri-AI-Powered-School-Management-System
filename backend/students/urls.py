# students/urls.py

from django.urls import path
from . import views

app_name = 'students'

urlpatterns = [
    # ─── Admin: Student management ────────────────────────────────
    path('', views.get_all_students, name='student-list'),
    path('create/', views.create_student, name='student-create'),
    path('<int:student_id>/', views.get_student_by_id, name='student-detail'),
    path('<int:student_id>/update/', views.update_student, name='student-update'),
    path('<int:student_id>/delete/', views.delete_student, name='student-delete'),

    # ─── Logged-in student (self) ──────────────────────────────────
    path('me/', views.get_my_student_profile, name='student-me'),
    path('me/parents/add/', views.student_add_parent, name='student-add-parent'),
    # ─── Classroom assignments ─────────────────────────────────────
    path('<int:student_id>/classrooms/', views.get_student_classroom_assignments, name='student-classrooms'),
    path('classrooms/assign/', views.assign_student_to_classroom, name='assign-classroom'),
    path('classrooms/<int:assignment_id>/update/', views.update_classroom_assignment, name='update-classroom'),
    path('classrooms/available/<int:class_level_id>/', views.get_available_classrooms, name='available-classrooms'),

    # ─── Academic history ──────────────────────────────────────────
    path('<int:student_id>/history/', views.get_student_academic_history, name='student-history'),

    # ─── Admin: Parent / Guardian management ──────────────────────
    path('parents/', views.get_all_parents, name='parent-list'),
    path('parents/create/', views.create_parent, name='parent-create'),
    path('parents/<int:parent_id>/delete/', views.delete_parent, name='parent-delete'),
    path('parents/me/', views.get_my_parent_profile, name='parent-me'),

    # ─── Teacher ↔ Student cross-endpoints ────────────────────────
    path('<int:student_id>/teachers/', views.get_student_teachers, name='student-teachers'),
    path('me/teachers/', views.get_student_teachers, name='student-me-teachers'),
    path('teacher/student/<int:student_id>/', views.teacher_get_student_detail, name='teacher-student-detail'),
    path('teacher/classroom/<int:classroom_id>/students/', views.get_teacher_classroom_students, name='teacher-classroom-students'),
    path('parents/<int:parent_id>/students/', views.get_students_for_parent, name='parent-students'),
    path('<int:student_id>/parents/', views.get_parents_for_student, name='student-parents'),
    path('<int:student_id>/current-classroom/', views.get_current_classroom_for_student, name='student-current-classroom'),
    
    path('<int:student_id>/teachers-with-subjects/', views.get_teachers_for_student, name='student-teachers-with-subjects'),
    path('me/teachers-with-subjects/', views.get_teachers_for_student, name='student-me-teachers-with-subjects'),
    path('teacher/student/<int:student_id>/with-subjects/', views.teacher_get_student_full_detail, name='teacher-student-full-detail'),
    path('teacher/my-students/', views.teacher_get_my_students, name='teacher-my-students'),

]
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
    path('me/parents/', views.student_get_my_parents, name='student-my-parents'),
    path('me/parents/add/', views.student_add_parent, name='student-add-parent'),

    # ─── Admin: Parent / Guardian management ──────────────────────
    path('parents/', views.get_all_parents, name='parent-list'),
    path('parents/create/', views.create_parent, name='parent-create'),
    path('parents/<int:parent_id>/', views.get_parent_by_id, name='parent-detail'),
    path('parents/<int:parent_id>/update/', views.update_parent, name='parent-update'),
    path('parents/<int:parent_id>/delete/', views.delete_parent, name='parent-delete'),

    # ─── Logged-in parent (self) ───────────────────────────────────
    path('parents/me/', views.get_my_parent_profile, name='parent-me'),
    path('parents/me/update/', views.update_my_parent_profile, name='parent-me-update'),
    path('parents/me/students/<int:student_id>/update/', views.parent_update_student, name='parent-update-student'),

    # ─── Teacher ↔ Student cross-endpoints ────────────────────────
    # Admin / parent / student  →  get teachers of a student
    path('<int:student_id>/teachers/', views.get_student_teachers, name='student-teachers'),
    # Shortcut for logged-in student (no ID in URL)
    path('me/teachers/', views.get_student_teachers, name='student-me-teachers'),
    # Logged-in teacher  →  get full student details (including parents)
    path('teacher/student/<int:student_id>/', views.teacher_get_student_detail, name='teacher-student-detail'),
]
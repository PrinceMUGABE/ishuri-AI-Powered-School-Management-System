"""
dashboard/urls.py

URL configuration for the dashboard app.
"""

from django.urls import path
from . import views

app_name = 'dashboard'

urlpatterns = [
    # Overview
    path('overview/', views.DashboardOverviewView.as_view(), name='overview'),
    
    # User management
    path('users/', views.UserReportView.as_view(), name='users'),
    
    # Academics
    path('academic-years/', views.AcademicYearReportView.as_view(), name='academic-years'),
    path('terms/', views.TermReportView.as_view(), name='terms'),
    path('school-levels/', views.SchoolLevelReportView.as_view(), name='school-levels'),
    path('class-levels/', views.ClassLevelReportView.as_view(), name='class-levels'),
    path('classrooms/', views.ClassRoomReportView.as_view(), name='classrooms'),
    path('subjects/', views.SubjectReportView.as_view(), name='subjects'),
    
    # Students & Parents
    path('students/', views.StudentReportView.as_view(), name='students'),
    path('parents/', views.ParentReportView.as_view(), name='parents'),
    
    # Teachers
    path('teachers/', views.TeacherReportView.as_view(), name='teachers'),
    path('teacher-assignments/', views.TeacherAssignmentReportView.as_view(), name='teacher-assignments'),
    
    # Academics Records
    path('grade-uploads/', views.GradeUploadReportView.as_view(), name='grade-uploads'),
    path('attendance/', views.AttendanceReportView.as_view(), name='attendance'),
    
    # Payments
    path('payments/', views.PaymentReportView.as_view(), name='payments'),
]
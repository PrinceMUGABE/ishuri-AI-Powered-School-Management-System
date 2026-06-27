# payments/urls.py
from django.urls import path
from . import views

urlpatterns = [
    # Assignment management
    path('assignments/create/', views.create_payment_assignments, name='create_payment_assignments'),
    path('assignments/<int:assignment_id>/update/', views.update_payment_assignment, name='update_payment_assignment'),
    path('assignments/<int:assignment_id>/delete/', views.delete_payment_assignment, name='delete_payment_assignment'),
    path('assignments/<int:assignment_id>/details/', views.get_payment_details, name='get_payment_details'),
    path('assignments/<int:assignment_id>/paid-amount/', views.get_payment_paid_amount, name='get_payment_paid_amount'),
    path('assignments/<int:assignment_id>/remaining-amount/', views.get_payment_remaining_amount, name='get_payment_remaining_amount'),
    path('assignments/<int:assignment_id>/transactions/', views.get_payment_transactions, name='get_payment_transactions'),
    path('assignments/<int:assignment_id>/extend-deadline/', views.extend_payment_deadline, name='extend_payment_deadline'),
    
    # Payment processing
    path('make-payment/', views.make_payment, name='make_payment'),
    
    # List all payments
    path('all/', views.get_all_payments, name='get_all_payments'),
    
    # Student-specific payments
    path('student/<int:student_id>/', views.get_student_payments, name='get_student_payments'),
    path('student/<int:student_id>/summary/', views.get_student_payment_summary, name='get_student_payment_summary'),
    
    # Logged-in user payments
    path('my-payments/', views.get_my_payments, name='get_my_payments'),
    path('my-summary/', views.get_my_payment_summary, name='get_my_payment_summary'),
    
    # Parent viewing student payments
    path('parent/students-payments/', views.get_parent_student_payments, name='get_parent_student_payments'),
    
    # Overdue reports
    path('overdue/', views.get_overdue_payments, name='get_overdue_payments'),


    # Bulk assignment endpoints
    path('assignments/bulk/school-level/', views.bulk_assign_by_school_level, name='bulk_assign_by_school_level'),
    path('assignments/bulk/class-level/',  views.bulk_assign_by_class_level,  name='bulk_assign_by_class_level'),
    path('assignments/bulk/all-students/', views.bulk_assign_all_students,    name='bulk_assign_all_students'),
]
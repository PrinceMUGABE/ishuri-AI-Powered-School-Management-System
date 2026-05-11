# payments/views.py
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from django.db import transaction
from django.utils import timezone
from decimal import Decimal
import traceback
import logging

from .models import StudentPaymentAssignment, PaymentTransaction, PaymentStatus, PaymentMethod
from .serializers import (
    StudentPaymentAssignmentSerializer, 
    PaymentTransactionSerializer,
    CreatePaymentAssignmentSerializer,
    MakePaymentSerializer,
    PaymentSummarySerializer
)
from .services import PaymentService
from academics.models import AcademicYear
from students.models import Student, Parent

logger = logging.getLogger(__name__)


def print_error_response(error_msg, traceback_str):
    """Helper function to print error details to terminal"""
    print(f"\n{'='*60}")
    print(f"❌ ERROR OCCURRED:")
    print(f"   Message: {error_msg}")
    print(f"   Traceback: {traceback_str}")
    print(f"{'='*60}\n")


def get_user_language(request):
    """Extract user language from request"""
    if request.user.is_authenticated and hasattr(request.user, 'language'):
        return request.user.language
    
    accept_language = request.headers.get('Accept-Language', 'en')
    lang = accept_language.split(',')[0][:2]
    if lang in ['en', 'fr', 'rw']:
        return lang
    return 'en'


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_payment_assignments(request):
    """
    Create payment assignments for a student
    """
    try:
        serializer = CreatePaymentAssignmentSerializer(data=request.data)
        
        if not serializer.is_valid():
            print_error_response(
                "Validation error in create_payment_assignments",
                str(serializer.errors)
            )
            return Response({
                'success': False,
                'message': 'Validation error',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        student = validated_data['student_id']
        costs = validated_data['class_level_cost_ids']
        academic_year_id = validated_data['academic_year_id']
        payment_due_date = validated_data['payment_due_date']
        payment_start_date = validated_data.get('payment_start_date', timezone.now().date())
        
        # Get academic year
        try:
            academic_year = AcademicYear.objects.get(id=academic_year_id)
        except AcademicYear.DoesNotExist:
            error_msg = f"Academic year with id {academic_year_id} not found"
            print_error_response(error_msg, traceback.format_exc())
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Create payment assignments
        assignments = PaymentService.create_payment_assignments(
            student=student,
            class_level_costs=costs,
            academic_year=academic_year,
            payment_due_date=payment_due_date,
            payment_start_date=payment_start_date,
            created_by=request.user,
            request=request
        )
        
        # Serialize the created assignments
        assignment_serializer = StudentPaymentAssignmentSerializer(assignments, many=True)
        
        print(f"\n✅ SUCCESS: Created {len(assignments)} payment assignments for student {student.full_name}")
        
        return Response({
            'success': True,
            'message': f'Successfully created {len(assignments)} payment assignments',
            'data': assignment_serializer.data
        }, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        error_msg = f"Unexpected error in create_payment_assignments: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT'])
@permission_classes([IsAuthenticated])
def update_payment_assignment(request, assignment_id):
    """
    Update a payment assignment
    """
    try:
        try:
            assignment = StudentPaymentAssignment.objects.get(id=assignment_id)
        except StudentPaymentAssignment.DoesNotExist:
            error_msg = f"Payment assignment with id {assignment_id} not found"
            print_error_response(error_msg, "")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if assignment is already completed
        if assignment.status == PaymentStatus.COMPLETED:
            return Response({
                'success': False,
                'message': 'Cannot update a completed payment assignment'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update allowed fields
        total_amount = request.data.get('total_amount')
        payment_due_date = request.data.get('payment_due_date')
        payment_extended_until = request.data.get('payment_extended_until')
        
        with transaction.atomic():
            if total_amount:
                old_total = assignment.total_amount
                assignment.total_amount = Decimal(str(total_amount))
                assignment.remaining_amount = assignment.total_amount - assignment.paid_amount
                
                print(f"\n📝 UPDATING ASSIGNMENT:")
                print(f"   Assignment ID: {assignment_id}")
                print(f"   Old Total: {old_total}")
                print(f"   New Total: {total_amount}")
                print(f"   Remaining: {assignment.remaining_amount}")
            
            if payment_due_date:
                assignment.payment_due_date = payment_due_date
                print(f"   New Due Date: {payment_due_date}")
            
            if payment_extended_until:
                assignment.payment_extended_until = payment_extended_until
                print(f"   Extended Until: {payment_extended_until}")
            
            assignment.save()
        
        # Create update notification
        user = assignment.student.user if assignment.student.user else None
        if user:
            language = get_user_language(request)
            from .translations import PaymentTranslations
            
            title = PaymentTranslations.get_notification_title(
                'PAYMENT_ASSIGNMENT_UPDATED',
                language
            )
            
            message = PaymentTranslations.get_notification_message(
                'PAYMENT_ASSIGNMENT_UPDATED',
                language,
                total_amount=assignment.total_amount,
                paid_amount=assignment.paid_amount,
                remaining_amount=assignment.remaining_amount
            )
            
            print(f"\n🔔 UPDATE NOTIFICATION:")
            print(f"   Recipient: {user.username}")
            print(f"   Title: {title}")
            print(f"   Message: {message}")
            print(f"   Language: {language}\n")
            
            from notifications.services import NotificationService
            NotificationService.create_academic_notification(
                user=user,
                notification_type='fee_structure_updated',
                title=title,
                message=message,
                created_by=request.user,
                extra_data={
                    'assignment_id': assignment.id,
                    'total_amount': str(assignment.total_amount)
                }
            )
        
        serializer = StudentPaymentAssignmentSerializer(assignment)
        
        print(f"\n✅ SUCCESS: Updated payment assignment {assignment_id}")
        
        return Response({
            'success': True,
            'message': 'Payment assignment updated successfully',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in update_payment_assignment: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_payment_assignment(request, assignment_id):
    """
    Delete a payment assignment (soft delete or hard delete)
    """
    try:
        try:
            assignment = StudentPaymentAssignment.objects.get(id=assignment_id)
        except StudentPaymentAssignment.DoesNotExist:
            error_msg = f"Payment assignment with id {assignment_id} not found"
            print_error_response(error_msg, "")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        # Check if there are any completed transactions
        if assignment.transactions.filter(transaction_status='completed').exists():
            return Response({
                'success': False,
                'message': 'Cannot delete assignment that has completed payments'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        assignment.delete()
        
        print(f"\n🗑️ DELETED: Payment assignment {assignment_id}")
        
        return Response({
            'success': True,
            'message': 'Payment assignment deleted successfully'
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in delete_payment_assignment: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_payments(request):
    """
    Get all payment assignments (with optional filters)
    """
    try:
        payments = StudentPaymentAssignment.objects.all()
        
        # Apply filters
        status_filter = request.query_params.get('status')
        student_id = request.query_params.get('student_id')
        academic_year_id = request.query_params.get('academic_year_id')
        
        if status_filter:
            payments = payments.filter(status=status_filter)
            print(f"   Filtering by status: {status_filter}")
        
        if student_id:
            payments = payments.filter(student_id=student_id)
            print(f"   Filtering by student_id: {student_id}")
        
        if academic_year_id:
            payments = payments.filter(academic_year_id=academic_year_id)
            print(f"   Filtering by academic_year_id: {academic_year_id}")
        
        serializer = StudentPaymentAssignmentSerializer(payments, many=True)
        
        print(f"\n✅ SUCCESS: Retrieved {payments.count()} payment assignments")
        
        return Response({
            'success': True,
            'count': payments.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_all_payments: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_payments(request, student_id):
    """
    Get all payment assignments for a specific student
    """
    try:
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            error_msg = f"Student with id {student_id} not found"
            print_error_response(error_msg, "")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        payments = StudentPaymentAssignment.objects.filter(student=student)
        
        serializer = StudentPaymentAssignmentSerializer(payments, many=True)
        
        print(f"\n✅ SUCCESS: Retrieved {payments.count()} payments for student {student.full_name}")
        
        return Response({
            'success': True,
            'student': student.full_name,
            'count': payments.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_student_payments: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_payments(request):
    """
    Get payment assignments for the logged-in student
    """
    try:
        # Check if the logged-in user has a student profile
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
            return Response({
                'success': False,
                'message': 'You do not have a student profile'
            }, status=status.HTTP_403_FORBIDDEN)
        
        payments = StudentPaymentAssignment.objects.filter(student=student)
        
        serializer = StudentPaymentAssignmentSerializer(payments, many=True)
        
        print(f"\n✅ SUCCESS: Student {student.full_name} retrieved their {payments.count()} payments")
        
        return Response({
            'success': True,
            'student': student.full_name,
            'count': payments.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_my_payments: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_parent_student_payments(request):
    """
    Get payment assignments for students linked to the logged-in parent
    """
    try:
        # Check if the logged-in user has a parent profile
        try:
            parent_profile = request.user.parent_profile
        except Parent.DoesNotExist:
            return Response({
                'success': False,
                'message': 'You do not have a parent profile'
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Get all students linked to this parent
        students = parent_profile.students.all()
        
        if not students.exists():
            return Response({
                'success': True,
                'message': 'No students linked to this parent',
                'data': []
            }, status=status.HTTP_200_OK)
        
        # Get payments for all these students
        payments = StudentPaymentAssignment.objects.filter(student__in=students)
        
        serializer = StudentPaymentAssignmentSerializer(payments, many=True)
        
        print(f"\n✅ SUCCESS: Parent {parent_profile.full_name} retrieved payments for {students.count()} students")
        print(f"   Total payments: {payments.count()}")
        
        return Response({
            'success': True,
            'parent': parent_profile.full_name,
            'students_count': students.count(),
            'payments_count': payments.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_parent_student_payments: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def make_payment(request):
    """
    Process a payment transaction
    """
    try:
        serializer = MakePaymentSerializer(data=request.data)
        
        if not serializer.is_valid():
            print_error_response(
                "Validation error in make_payment",
                str(serializer.errors)
            )
            return Response({
                'success': False,
                'message': 'Validation error',
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        validated_data = serializer.validated_data
        payment_assignment = validated_data['payment_assignment_id']
        amount = validated_data['amount']
        payment_method = validated_data['payment_method']
        
        # Process payment
        transaction_obj = PaymentService.process_payment(
            payment_assignment=payment_assignment,
            amount=amount,
            payment_method=payment_method,
            recorded_by=request.user,
            request=request,
            phone_number=validated_data.get('phone_number'),
            mobile_money_provider=validated_data.get('mobile_money_provider'),
            bank_name=validated_data.get('bank_name'),
            bank_account_number=validated_data.get('bank_account_number'),
            bank_receipt_number=validated_data.get('bank_receipt_number'),
            notes=validated_data.get('notes', '')
        )
        
        transaction_serializer = PaymentTransactionSerializer(transaction_obj)
        
        print(f"\n💰 PAYMENT PROCESSED SUCCESSFULLY:")
        print(f"   Transaction ID: {transaction_obj.id}")
        print(f"   Reference: {transaction_obj.transaction_reference}")
        print(f"   Amount: {amount}")
        print(f"   Method: {payment_method}")
        print(f"   Assignment ID: {payment_assignment.id}")
        print(f"   Remaining Balance: {payment_assignment.remaining_amount}")
        
        return Response({
            'success': True,
            'message': 'Payment processed successfully',
            'data': transaction_serializer.data,
            'remaining_balance': payment_assignment.remaining_amount,
            'is_completed': payment_assignment.remaining_amount <= 0
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in make_payment: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_details(request, payment_id):
    """
    Get detailed information about a specific payment assignment
    """
    try:
        try:
            payment = StudentPaymentAssignment.objects.get(id=payment_id)
        except StudentPaymentAssignment.DoesNotExist:
            error_msg = f"Payment assignment with id {payment_id} not found"
            print_error_response(error_msg, "")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        serializer = StudentPaymentAssignmentSerializer(payment)
        
        print(f"\n✅ SUCCESS: Retrieved details for payment assignment {payment_id}")
        print(f"   Student: {payment.student.full_name}")
        print(f"   Fee: {payment.class_level_cost.name}")
        print(f"   Total: {payment.total_amount}")
        print(f"   Paid: {payment.paid_amount}")
        print(f"   Remaining: {payment.remaining_amount}")
        print(f"   Status: {payment.status}")
        
        return Response({
            'success': True,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_payment_details: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_paid_amount(request, assignment_id):
    """
    Get the total paid amount for a payment assignment
    """
    try:
        try:
            payment = StudentPaymentAssignment.objects.get(id=assignment_id)
        except StudentPaymentAssignment.DoesNotExist:
            error_msg = f"Payment assignment with id {assignment_id} not found"
            print_error_response(error_msg, "")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        print(f"\n✅ SUCCESS: Retrieved paid amount for assignment {assignment_id}")
        print(f"   Paid Amount: {payment.paid_amount}")
        print(f"   Total Amount: {payment.total_amount}")
        print(f"   Percentage: {(payment.paid_amount / payment.total_amount * 100) if payment.total_amount > 0 else 0}%")
        
        return Response({
            'success': True,
            'assignment_id': assignment_id,
            'total_amount': payment.total_amount,
            'paid_amount': payment.paid_amount,
            'remaining_amount': payment.remaining_amount,
            'paid_percentage': float((payment.paid_amount / payment.total_amount * 100) if payment.total_amount > 0 else 0),
            'is_fully_paid': payment.remaining_amount <= 0
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_payment_paid_amount: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_remaining_amount(request, assignment_id):
    """
    Get the remaining amount for a payment assignment
    """
    try:
        try:
            payment = StudentPaymentAssignment.objects.get(id=assignment_id)
        except StudentPaymentAssignment.DoesNotExist:
            error_msg = f"Payment assignment with id {assignment_id} not found"
            print_error_response(error_msg, "")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        print(f"\n✅ SUCCESS: Retrieved remaining amount for assignment {assignment_id}")
        print(f"   Remaining Amount: {payment.remaining_amount}")
        print(f"   Due Date: {payment.payment_due_date}")
        print(f"   Is Overdue: {payment.is_overdue}")
        
        return Response({
            'success': True,
            'assignment_id': assignment_id,
            'total_amount': payment.total_amount,
            'paid_amount': payment.paid_amount,
            'remaining_amount': payment.remaining_amount,
            'due_date': payment.payment_due_date,
            'is_overdue': payment.is_overdue,
            'status': payment.status
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_payment_remaining_amount: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_payment_summary(request, student_id):
    """
    Get payment summary for a specific student
    """
    try:
        try:
            student = Student.objects.get(id=student_id)
        except Student.DoesNotExist:
            error_msg = f"Student with id {student_id} not found"
            print_error_response(error_msg, "")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        payments = StudentPaymentAssignment.objects.filter(student=student)
        
        total_assigned = sum(p.total_amount for p in payments)
        total_paid = sum(p.paid_amount for p in payments)
        total_remaining = total_assigned - total_paid
        
        completed_count = payments.filter(status=PaymentStatus.COMPLETED).count()
        pending_count = payments.filter(status__in=[PaymentStatus.WAITING, PaymentStatus.STARTED, PaymentStatus.PARTIALLY_PAID]).count()
        overdue_count = payments.filter(status=PaymentStatus.OVERDUE).count()
        
        overdue_total = sum(p.remaining_amount for p in payments.filter(status=PaymentStatus.OVERDUE))
        
        summary_data = {
            'student_id': student.id,
            'student_name': student.full_name,
            'total_assigned': total_assigned,
            'total_paid': total_paid,
            'total_remaining': total_remaining,
            'total_overdue': overdue_total,
            'completed_count': completed_count,
            'pending_count': pending_count,
            'overdue_count': overdue_count,
            'payment_percentage': float((total_paid / total_assigned * 100) if total_assigned > 0 else 0)
        }
        
        serializer = PaymentSummarySerializer(data=summary_data)
        serializer.is_valid()
        
        print(f"\n✅ SUCCESS: Payment summary for student {student.full_name}")
        print(f"   Total Assigned: {total_assigned}")
        print(f"   Total Paid: {total_paid}")
        print(f"   Total Remaining: {total_remaining}")
        print(f"   Completed: {completed_count}")
        print(f"   Pending: {pending_count}")
        print(f"   Overdue: {overdue_count}")
        
        return Response({
            'success': True,
            'data': summary_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_student_payment_summary: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_payment_summary(request):
    """
    Get payment summary for the logged-in student
    """
    try:
        try:
            student = request.user.student_profile
        except Student.DoesNotExist:
            return Response({
                'success': False,
                'message': 'You do not have a student profile'
            }, status=status.HTTP_403_FORBIDDEN)
        
        payments = StudentPaymentAssignment.objects.filter(student=student)
        
        total_assigned = sum(p.total_amount for p in payments)
        total_paid = sum(p.paid_amount for p in payments)
        total_remaining = total_assigned - total_paid
        
        completed_count = payments.filter(status=PaymentStatus.COMPLETED).count()
        pending_count = payments.filter(status__in=[PaymentStatus.WAITING, PaymentStatus.STARTED, PaymentStatus.PARTIALLY_PAID]).count()
        overdue_count = payments.filter(status=PaymentStatus.OVERDUE).count()
        
        overdue_total = sum(p.remaining_amount for p in payments.filter(status=PaymentStatus.OVERDUE))
        
        summary_data = {
            'student_id': student.id,
            'student_name': student.full_name,
            'total_assigned': total_assigned,
            'total_paid': total_paid,
            'total_remaining': total_remaining,
            'total_overdue': overdue_total,
            'completed_count': completed_count,
            'pending_count': pending_count,
            'overdue_count': overdue_count,
            'payment_percentage': float((total_paid / total_assigned * 100) if total_assigned > 0 else 0)
        }
        
        print(f"\n✅ SUCCESS: Student {student.full_name} retrieved their payment summary")
        print(f"   Total Remaining: {total_remaining}")
        print(f"   Overdue Amount: {overdue_total}")
        
        return Response({
            'success': True,
            'data': summary_data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_my_payment_summary: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_payment_transactions(request, assignment_id):
    """
    Get all transactions for a specific payment assignment
    """
    try:
        try:
            payment = StudentPaymentAssignment.objects.get(id=assignment_id)
        except StudentPaymentAssignment.DoesNotExist:
            error_msg = f"Payment assignment with id {assignment_id} not found"
            print_error_response(error_msg, "")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        transactions = payment.transactions.all()
        
        serializer = PaymentTransactionSerializer(transactions, many=True)
        
        print(f"\n✅ SUCCESS: Retrieved {transactions.count()} transactions for assignment {assignment_id}")
        
        return Response({
            'success': True,
            'assignment_id': assignment_id,
            'count': transactions.count(),
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_payment_transactions: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def extend_payment_deadline(request, assignment_id):
    """
    Extend the payment deadline for an assignment
    """
    try:
        try:
            payment = StudentPaymentAssignment.objects.get(id=assignment_id)
        except StudentPaymentAssignment.DoesNotExist:
            error_msg = f"Payment assignment with id {assignment_id} not found"
            print_error_response(error_msg, "")
            return Response({
                'success': False,
                'message': error_msg
            }, status=status.HTTP_404_NOT_FOUND)
        
        new_due_date = request.data.get('new_due_date')
        if not new_due_date:
            return Response({
                'success': False,
                'message': 'new_due_date is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        old_due_date = payment.payment_due_date
        payment.payment_extended_until = new_due_date
        payment.save()
        
        print(f"\n📅 DEADLINE EXTENDED:")
        print(f"   Assignment ID: {assignment_id}")
        print(f"   Old Due Date: {old_due_date}")
        print(f"   New Due Date: {new_due_date}")
        
        # Create notification
        user = payment.student.user if payment.student.user else None
        if user:
            language = get_user_language(request)
            
            print(f"\n🔔 DEADLINE EXTENSION NOTIFICATION:")
            print(f"   Recipient: {user.username}")
            print(f"   Message: Payment deadline extended to {new_due_date}")
            print(f"   Language: {language}\n")
            
            from notifications.services import NotificationService
            NotificationService.create_academic_notification(
                user=user,
                notification_type='deadline_reminder',
                title='Payment Deadline Extended',
                message=f'Your payment deadline for {payment.class_level_cost.name} has been extended to {new_due_date}',
                created_by=request.user,
                extra_data={
                    'assignment_id': assignment_id,
                    'new_due_date': str(new_due_date),
                    'old_due_date': str(old_due_date)
                },
                priority='high'
            )
        
        serializer = StudentPaymentAssignmentSerializer(payment)
        
        return Response({
            'success': True,
            'message': f'Payment deadline extended to {new_due_date}',
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in extend_payment_deadline: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_overdue_payments(request):
    """
    Get all overdue payment assignments
    """
    try:
        overdue_payments = StudentPaymentAssignment.objects.filter(
            status=PaymentStatus.OVERDUE,
            remaining_amount__gt=0
        )
        
        serializer = StudentPaymentAssignmentSerializer(overdue_payments, many=True)
        
        total_overdue_amount = sum(p.remaining_amount for p in overdue_payments)
        
        print(f"\n⚠️ OVERDUE PAYMENTS REPORT:")
        print(f"   Total Overdue Assignments: {overdue_payments.count()}")
        print(f"   Total Overdue Amount: {total_overdue_amount}")
        
        return Response({
            'success': True,
            'count': overdue_payments.count(),
            'total_overdue_amount': total_overdue_amount,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
        
    except Exception as e:
        error_msg = f"Unexpected error in get_overdue_payments: {str(e)}"
        print_error_response(error_msg, traceback.format_exc())
        return Response({
            'success': False,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
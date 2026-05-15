# students/views.py

import logging
import random
from datetime import date
from decimal import Decimal

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.conf import settings
from django.utils import timezone

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.models import User
from accounts.permissions import IsAdmin
from academics.models import AcademicYear, Term, ClassRoom, ClassLevel
from teachers.models import Teacher, TeacherAssignment, TeacherTimetable

from .models import Student, Parent, StudentParent, StudentClassroomAssignment, StudentAcademicHistory
from .serializers import (
    StudentListSerializer, StudentDetailSerializer,
    StudentCreateSerializer, StudentUpdateSerializer,
    ParentListSerializer, ParentDetailSerializer,
    ParentCreateSerializer, ParentUpdateSerializer,
    StudentClassroomAssignmentSerializer, ClassroomAssignmentCreateSerializer,
    StudentAcademicHistorySerializer
)
from .classroom_assignment import ClassroomAssignmentService
from .utils import (
    create_user_for_student, create_user_for_parent,
    send_student_credentials, send_parent_credentials
)
from .translations import get_message, get_lang
from notifications.services import NotificationService

logger = logging.getLogger(__name__)
SEPARATOR = '=' * 60


# ─────────────────────────────────────────────────────────────
# HELPER FUNCTIONS
# ─────────────────────────────────────────────────────────────

def get_lang_from_request(request):
    """Detect language from request"""
    for source in [
        request.headers.get('X-Language'),
        (request.headers.get('Accept-Language') or '').split(',')[0].split('-')[0],
        getattr(request.user, 'language', None) if request.user.is_authenticated else None
    ]:
        if source and source in ('en', 'fr', 'rw'):
            return source
    return 'en'


def _notify_user(user, notification_type, title, message, created_by=None, extra_data=None):
    """Wrapper to safely fire a notification"""
    try:
        NotificationService.create_notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            priority='medium',
            created_by=created_by,
            data=extra_data or {}
        )
    except Exception as exc:
        logger.error(f"Notification failed: {exc}")


def _notify_admins(notification_type, title, message, created_by=None, extra_data=None):
    """Send notification to all admin users"""
    try:
        admins = User.objects.filter(role='admin', status='active')
        for admin in admins:
            NotificationService.create_notification(
                recipient=admin,
                notification_type=notification_type,
                title=title,
                message=message,
                priority='medium',
                created_by=created_by,
                data=extra_data or {}
            )
    except Exception as exc:
        logger.error(f"Admin notification failed: {exc}")


def _get_current_term(academic_year):
    """Get current active term for an academic year"""
    return Term.objects.filter(
        academic_year=academic_year,
        is_current=True
    ).first()


def _record_academic_history(student, academic_year, term, school_level, class_level, classroom, status, promoted_from=None, notes=''):
    """Record student's academic history"""
    StudentAcademicHistory.objects.create(
        student=student,
        academic_year=academic_year,
        term=term,
        school_level=school_level,
        class_level=class_level,
        classroom=classroom,
        status=status,
        promoted_from=promoted_from,
        notes=notes
    )


# ═══════════════════════════════════════════════════════════════
# STUDENT VIEWS
# ═══════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_student(request):
    """Admin: Create a new student, auto-create user account, send credentials, and auto-assign to classroom."""
    print(f"\n{SEPARATOR}\n[create_student] Request received\n{SEPARATOR}")
    lang = get_lang_from_request(request)
    print(f"[create_student] Lang: {lang} | Data: {request.data}")

    serializer = StudentCreateSerializer(data=request.data)
    if not serializer.is_valid():
        print(f"[create_student] Validation errors: {serializer.errors}")
        return Response({
            'success': False,
            'errors': serializer.errors,
            'language': lang,
        }, status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            # 1. Create user account
            student_data = serializer.validated_data
            full_name = student_data.get('full_name', '')
            email = student_data.get('email')

            user, raw_password = create_user_for_student(full_name, email, request.user)
            print(f"[create_student] User created: {user.username}")

            # 2. Create student linked to user
            auto_assign = student_data.pop('auto_assign_classroom', True)
            student = serializer.save(user=user, created_by=request.user)
            print(f"[create_student] Student created: {student.roll_number}")

            # 3. AUTO-ASSIGN TO CLASSROOM
            classroom_assigned = None
            if auto_assign and student.current_academic_year and student.current_class_level and student.current_school_level:
                try:
                    current_term = _get_current_term(student.current_academic_year)
                    
                    classroom_assigned = ClassroomAssignmentService.assign_student_to_classroom(
                        student=student,
                        academic_year=student.current_academic_year,
                        class_level=student.current_class_level,
                        school_level=student.current_school_level,
                        assigned_by=request.user,
                        term=current_term
                    )
                    print(f"[create_student] Auto-assigned to classroom: {classroom_assigned.name}")
                    
                    # Record academic history
                    _record_academic_history(
                        student=student,
                        academic_year=student.current_academic_year,
                        term=current_term,
                        school_level=student.current_school_level,
                        class_level=student.current_class_level,
                        classroom=classroom_assigned,
                        status=student.status,
                        notes='Initial enrollment with auto-classroom assignment'
                    )
                except Exception as e:
                    print(f"[create_student] Auto-assignment warning: {e}")
            else:
                print(f"[create_student] No academic placement - skipping classroom assignment")

            # 4. Send credentials by email
            if email:
                send_student_credentials(student, raw_password, recipient_email=email)

            # 5. Notifications
            notif_title = get_message('notif_student_created_title', lang)
            notif_msg = get_message('notif_student_created_msg', lang, roll_number=student.roll_number)
            _notify_user(
                user=user,
                notification_type='user_created',
                title=notif_title,
                message=notif_msg,
                created_by=request.user,
                extra_data={'roll_number': student.roll_number, 'role': 'student'}
            )
            
            _notify_admins(
                notification_type='user_created',
                title='New Student Enrolled',
                message=f'Student {student.full_name} ({student.roll_number}) has been enrolled.',
                created_by=request.user,
                extra_data={'student_id': student.id}
            )

        print(f"[create_student] Success: {student.roll_number}\n{SEPARATOR}\n")
        
        response_data = StudentDetailSerializer(student).data
        if classroom_assigned:
            classroom_assigned = ClassRoom.objects.get(id=classroom_assigned.id)
            response_data['assigned_classroom'] = {
                'id': classroom_assigned.id,
                'name': classroom_assigned.name,
                'code': classroom_assigned.code
            }
        
        return Response({
            'success': True,
            'message': get_message('student_created', lang),
            'language': lang,
            'data': response_data,
        }, status=status.HTTP_201_CREATED)

    except Exception as exc:
        logger.error(f"[create_student] Unexpected error: {exc}", exc_info=True)
        print(f"[create_student] ERROR: {exc}")
        return Response({
            'success': False,
            'message': str(exc),
            'language': lang,
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_all_students(request):
    """Admin: List all students."""
    print(f"\n{SEPARATOR}\n[get_all_students] Request received\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    try:
        qs = Student.objects.select_related(
            'user', 'current_academic_year', 'current_school_level', 'current_class_level', 'created_by'
        ).prefetch_related('parents', 'classroom_assignments')

        print(f"[get_all_students] Returning {qs.count()} students")
        returned_students = StudentListSerializer(qs, many=True).data
        print(f"retrieved students:\n{returned_students}\n")
        return Response({
            'success': True,
            'language': lang,
            'data': StudentListSerializer(qs, many=True).data,
        })

    except Exception as exc:
        logger.error(f"[get_all_students] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)



@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_by_id(request, student_id):
    """Get full student details by ID (with permission checks)."""
    print(f"\n{SEPARATOR}\n[get_student_by_id] ID={student_id}\n{SEPARATOR}")
    lang = get_lang_from_request(request)
    user = request.user

    try:
        student = get_object_or_404(Student, id=student_id)
        
        # Permission checks
        if user.role == 'admin':
            pass  # Admin can view any student
        elif user.role == 'teacher':
            # Teacher can only view students they teach
            teacher = get_object_or_404(Teacher, user=user)
            teaches = TeacherAssignment.objects.filter(
                teacher=teacher,
                class_level=student.current_class_level,
                status='active'
            ).exists()
            if not teaches:
                return Response({
                    'success': False,
                    'message': get_message('permission_denied', lang),
                    'language': lang,
                }, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'parent':
            # Parent can only view their own children
            parent = get_object_or_404(Parent, user=user)
            if not parent.students.filter(id=student_id).exists():
                return Response({
                    'success': False,
                    'message': get_message('permission_denied', lang),
                    'language': lang,
                }, status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'student':
            # Student can only view their own profile
            if not hasattr(user, 'student_profile') or user.student_profile.id != student_id:
                return Response({
                    'success': False,
                    'message': get_message('permission_denied', lang),
                    'language': lang,
                }, status=status.HTTP_403_FORBIDDEN)
        else:
            return Response({
                'success': False,
                'message': get_message('permission_denied', lang),
                'language': lang,
            }, status=status.HTTP_403_FORBIDDEN)
        
        print(f"[get_student_by_id] Found: {student.roll_number}")
        return Response({
            'success': True,
            'language': lang,
            'data': StudentDetailSerializer(student).data,
        })
    except Exception as exc:
        logger.error(f"[get_student_by_id] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_student(request, student_id):
    """Admin: Update student details."""
    print(f"\n{SEPARATOR}\n[update_student] ID={student_id}\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    try:
        student = get_object_or_404(Student, id=student_id)
        old_class_level = student.current_class_level
        old_school_level = student.current_school_level
        
        serializer = StudentUpdateSerializer(student, data=request.data, partial=True)

        if not serializer.is_valid():
            print(f"[update_student] Validation errors: {serializer.errors}")
            return Response({'success': False, 'errors': serializer.errors, 'language': lang},
                            status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            student = serializer.save()
            print(f"[update_student] Updated: {student.roll_number}")
            
            # If class level changed, update classroom assignment
            if (old_class_level != student.current_class_level or 
                old_school_level != student.current_school_level):
                
                # Inactivate old assignments
                StudentClassroomAssignment.objects.filter(
                    student=student,
                    status='active'
                ).update(status='inactive')
                
                # Create new assignment
                if student.current_academic_year and student.current_class_level and student.current_school_level:
                    current_term = _get_current_term(student.current_academic_year)
                    try:
                        ClassroomAssignmentService.assign_student_to_classroom(
                            student=student,
                            academic_year=student.current_academic_year,
                            class_level=student.current_class_level,
                            school_level=student.current_school_level,
                            assigned_by=request.user,
                            term=current_term
                        )
                        print(f"[update_student] Re-assigned to new classroom")
                    except Exception as e:
                        print(f"[update_student] Re-assignment warning: {e}")

        # Notification to student
        if student.user:
            _notify_user(
                user=student.user,
                notification_type='user_updated',
                title=get_message('notif_student_updated_title', lang),
                message=f'Your student profile has been updated by {request.user.username}.',
                created_by=request.user,
                extra_data={'updated_fields': list(request.data.keys())}
            )

        return Response({
            'success': True,
            'message': get_message('student_updated', lang),
            'language': lang,
            'data': StudentDetailSerializer(student).data,
        })

    except Exception as exc:
        logger.error(f"[update_student] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_student(request, student_id):
    """Admin: Delete a student and their linked user account."""
    print(f"\n{SEPARATOR}\n[delete_student] ID={student_id}\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    try:
        student = get_object_or_404(Student, id=student_id)
        full_name = student.full_name
        roll_number = student.roll_number

        # Notify before delete
        if student.user:
            _notify_user(
                user=student.user,
                notification_type='user_deleted',
                title=get_message('notif_student_deleted_title', lang),
                message=f'Your student account has been removed from the system.',
                created_by=request.user,
            )

        with transaction.atomic():
            user = student.user
            student.delete()
            if user:
                user.delete()

        print(f"[delete_student] Deleted: {roll_number}")
        return Response({
            'success': True,
            'message': get_message('student_deleted', lang),
            'language': lang,
            'data': {'roll_number': roll_number, 'full_name': full_name},
        })

    except Exception as exc:
        logger.error(f"[delete_student] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_student_profile(request):
    """Logged-in student: Get own profile including parent/guardian details."""
    print(f"\n{SEPARATOR}\n[get_my_student_profile] User: {request.user.username}\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    try:
        student = getattr(request.user, 'student_profile', None)
        if not student:
            return Response({
                'success': False,
                'message': get_message('student_not_found', lang),
                'language': lang,
            }, status=status.HTTP_404_NOT_FOUND)

        print(f"[get_my_student_profile] Found: {student.roll_number}")
        return Response({
            'success': True,
            'language': lang,
            'data': StudentDetailSerializer(student).data,
        })

    except Exception as exc:
        logger.error(f"[get_my_student_profile] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═══════════════════════════════════════════════════════════════
# CLASSROOM ASSIGNMENT VIEWS
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_classroom_assignments(request, student_id):
    """Get all classroom assignments for a student."""
    lang = get_lang_from_request(request)
    
    # Permission check
    user = request.user
    if user.role != 'admin':
        if user.role == 'parent':
            parent = get_object_or_404(Parent, user=user)
            if not parent.students.filter(id=student_id).exists():
                return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                                status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'student':
            if not hasattr(user, 'student_profile') or user.student_profile.id != student_id:
                return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                                status=status.HTTP_403_FORBIDDEN)
    
    try:
        student = get_object_or_404(Student, id=student_id)
        assignments = StudentClassroomAssignment.objects.filter(
            student=student
        ).select_related('classroom', 'academic_year', 'term', 'school_level', 'class_level', 'assigned_by')
        
        return Response({
            'success': True,
            'language': lang,
            'data': StudentClassroomAssignmentSerializer(assignments, many=True).data
        })
    except Exception as exc:
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def assign_student_to_classroom(request):
    """Admin: Manually assign a student to a classroom."""
    lang = get_lang_from_request(request)
    
    serializer = ClassroomAssignmentCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'success': False, 'errors': serializer.errors, 'language': lang},
                        status=status.HTTP_400_BAD_REQUEST)
    
    try:
        with transaction.atomic():
            data = serializer.validated_data
            student = data['student']
            
            # Inactivate existing assignments
            StudentClassroomAssignment.objects.filter(
                student=student,
                academic_year=data['academic_year'],
                term=data.get('term'),
                status='active'
            ).update(status='inactive')
            
            # Create new assignment
            assignment = StudentClassroomAssignment.objects.create(**data, assigned_by=request.user)
            
            # Record academic history
            _record_academic_history(
                student=student,
                academic_year=data['academic_year'],
                term=data.get('term'),
                school_level=data['school_level'],
                class_level=data['class_level'],
                classroom=data['classroom'],
                status=student.status,
                notes=f'Manual classroom assignment by {request.user.username}'
            )
            
            return Response({
                'success': True,
                'message': 'Student assigned to classroom successfully',
                'language': lang,
                'data': StudentClassroomAssignmentSerializer(assignment).data
            }, status=status.HTTP_201_CREATED)
            
    except Exception as exc:
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_classroom_assignment(request, assignment_id):
    """Admin: Update a classroom assignment."""
    lang = get_lang_from_request(request)
    
    try:
        assignment = get_object_or_404(StudentClassroomAssignment, id=assignment_id)
        
        classroom_id = request.data.get('classroom_id')
        if classroom_id:
            classroom = get_object_or_404(ClassRoom, id=classroom_id)
            assignment.classroom = classroom
        
        assignment.status = request.data.get('status', assignment.status)
        assignment.save()
        
        return Response({
            'success': True,
            'message': 'Classroom assignment updated successfully',
            'language': lang,
            'data': StudentClassroomAssignmentSerializer(assignment).data
        })
    except Exception as exc:
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_available_classrooms(request, class_level_id):
    """Get available classrooms for a class level (for assignment)."""
    lang = get_lang_from_request(request)
    
    try:
        class_level = get_object_or_404(ClassLevel, id=class_level_id)
        classrooms = ClassroomAssignmentService.get_classrooms_for_class_level(class_level)
        
        academic_year_id = request.query_params.get('academic_year_id')
        academic_year = get_object_or_404(AcademicYear, id=academic_year_id) if academic_year_id else None
        
        result = []
        for classroom in classrooms:
            count = 0
            if academic_year:
                count = ClassroomAssignmentService.get_classroom_student_count(classroom, academic_year)
            
            result.append({
                'id': classroom.id,
                'name': classroom.name,
                'code': classroom.code,
                'capacity': classroom.capacity,
                'room_type': classroom.get_room_type_display(),
                'current_students': count,
                'available_spots': classroom.capacity - count,
                'status': classroom.status
            })
        
        return Response({'success': True, 'language': lang, 'data': result})
    except Exception as exc:
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═══════════════════════════════════════════════════════════════
# PARENT VIEWS
# ═══════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_parent(request):
    """Admin: Create a parent/guardian, auto-create user account, send credentials."""
    print(f"\n{SEPARATOR}\n[create_parent] Request received\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    serializer = ParentCreateSerializer(data=request.data)
    if not serializer.is_valid():
        return Response({'success': False, 'errors': serializer.errors, 'language': lang},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            validated = serializer.validated_data
            full_name = validated.get('full_name', '')
            email = validated.get('email', '')

            user, raw_password = create_user_for_parent(full_name, email, request.user)
            parent = serializer.save(user=user, created_by=request.user)

            if email:
                send_parent_credentials(parent, raw_password)

            _notify_user(
                user=user,
                notification_type='user_created',
                title=get_message('notif_parent_created_title', lang),
                message=get_message('notif_parent_created_msg', lang),
                created_by=request.user,
                extra_data={'role': 'parent'}
            )

        return Response({
            'success': True,
            'message': get_message('parent_created', lang),
            'language': lang,
            'data': ParentDetailSerializer(parent).data,
        }, status=status.HTTP_201_CREATED)

    except Exception as exc:
        logger.error(f"[create_parent] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)




@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_parent_profile(request):
    """Logged-in parent: Get own profile including all associated students."""
    print(f"\n{SEPARATOR}\n[get_my_parent_profile] User: {request.user.username}\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent:
            return Response({
                'success': False,
                'message': get_message('parent_not_found', lang),
                'language': lang,
            }, status=status.HTTP_404_NOT_FOUND)

        return Response({
            'success': True,
            'language': lang,
            'data': ParentDetailSerializer(parent).data,
        })

    except Exception as exc:
        logger.error(f"[get_my_parent_profile] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


     
@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_parent(request, parent_id):
    """Admin: Delete a parent and their linked user account."""
    print(f"\n{SEPARATOR}\n[delete_parent] ID={parent_id}\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    try:
        parent = get_object_or_404(Parent, id=parent_id)
        full_name = parent.full_name

        # Notify before delete
        if parent.user:
            _notify_user(
                user=parent.user,
                notification_type='user_deleted',
                title=get_message('notif_parent_deleted_title', lang),
                message='Your parent account has been removed from the system.',
                created_by=request.user,
            )

        with transaction.atomic():
            user = parent.user
            parent.delete()
            if user:
                user.delete()

        print(f"[delete_parent] Deleted: {full_name}")
        return Response({
            'success': True,
            'message': get_message('parent_deleted', lang),
            'language': lang,
            'data': {'full_name': full_name},
        })

    except Exception as exc:
        logger.error(f"[delete_parent] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)       
        
        
# ═══════════════════════════════════════════════════════════════
# TEACHER ↔ STUDENT VIEWS
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_teachers(request, student_id=None):
    """
    Get teachers who teach a given student.
    Access: Admin (any student), Student (self), Parent (their child)
    """
    print(f"\n{SEPARATOR}\n[get_student_teachers] User: {request.user.username}\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    try:
        user = request.user
        role = user.role

        # Resolve which student to look up
        if role == 'admin':
            if not student_id:
                return Response({'success': False, 'message': 'student_id is required for admin', 'language': lang},
                                status=status.HTTP_400_BAD_REQUEST)
            student = get_object_or_404(Student, id=student_id)

        elif role == 'student':
            student = getattr(user, 'student_profile', None)
            if not student:
                return Response({'success': False, 'message': get_message('student_not_found', lang), 'language': lang},
                                status=status.HTTP_404_NOT_FOUND)

        elif role == 'parent':
            parent = getattr(user, 'parent_profile', None)
            if not parent:
                return Response({'success': False, 'message': get_message('parent_not_found', lang), 'language': lang},
                                status=status.HTTP_404_NOT_FOUND)
            if not student_id:
                return Response({'success': False, 'message': 'student_id is required', 'language': lang},
                                status=status.HTTP_400_BAD_REQUEST)
            if not parent.students.filter(id=student_id).exists():
                return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                                status=status.HTTP_403_FORBIDDEN)
            student = get_object_or_404(Student, id=student_id)
        else:
            return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                            status=status.HTTP_403_FORBIDDEN)

        # Get student's current classroom assignment
        classroom_assignment = StudentClassroomAssignment.objects.filter(
            student=student,
            status='active'
        ).select_related('classroom').first()
        
        if not classroom_assignment:
            return Response({
                'success': True,
                'language': lang,
                'data': {'teachers': [], 'message': 'Student has no classroom assignment'}
            })

        # Find teachers assigned to this classroom through timetable
        current_term = _get_current_term(student.current_academic_year) if student.current_academic_year else None
        
        timetable_entries = TeacherTimetable.objects.filter(
            classroom=classroom_assignment.classroom,
            academic_year=student.current_academic_year,
            term=current_term
        ).select_related('teacher', 'subject')
        
        teacher_map = {}
        for entry in timetable_entries:
            teacher = entry.teacher
            if teacher.id not in teacher_map:
                teacher_map[teacher.id] = {
                    'teacher_id': teacher.id,
                    'full_name': teacher.full_name,
                    'email': teacher.email,
                    'phone_number': teacher.phone_number,
                    'specialization': teacher.specialization,
                    'status': teacher.status,
                    'subjects': []
                }
            teacher_map[teacher.id]['subjects'].append({
                'subject_id': entry.subject.id,
                'subject_name': entry.subject.name,
                'subject_code': entry.subject.code,
            })
        
        return Response({
            'success': True,
            'language': lang,
            'data': {
                'student': {
                    'id': student.id,
                    'full_name': student.full_name,
                    'roll_number': student.roll_number,
                    'classroom': classroom_assignment.classroom.name
                },
                'teachers': list(teacher_map.values())
            },
        })

    except Exception as exc:
        logger.error(f"[get_student_teachers] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_get_student_detail(request, student_id):
    """Logged-in teacher: Get full details of a student they teach."""
    print(f"\n{SEPARATOR}\n[teacher_get_student_detail] Teacher: {request.user.username} | Student: {student_id}\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    try:
        if request.user.role != 'teacher':
            return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                            status=status.HTTP_403_FORBIDDEN)

        teacher = getattr(request.user, 'teacher_profile', None)
        if not teacher:
            return Response({'success': False, 'message': 'Teacher profile not found.', 'language': lang},
                            status=status.HTTP_404_NOT_FOUND)

        student = get_object_or_404(Student, id=student_id)

        # Verify teacher teaches this student (through classroom)
        classroom_assignment = StudentClassroomAssignment.objects.filter(
            student=student,
            status='active'
        ).select_related('classroom').first()
        
        if not classroom_assignment:
            return Response({'success': False, 'message': 'Student has no classroom assignment.', 'language': lang},
                            status=status.HTTP_400_BAD_REQUEST)
        
        teaches_student = TeacherTimetable.objects.filter(
            teacher=teacher,
            classroom=classroom_assignment.classroom,
            status='active'
        ).exists()

        if not teaches_student:
            return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                            status=status.HTTP_403_FORBIDDEN)

        return Response({
            'success': True,
            'language': lang,
            'data': StudentDetailSerializer(student).data,
        })

    except Exception as exc:
        logger.error(f"[teacher_get_student_detail] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_classroom_students(request, classroom_id):
    """Teacher: Get all students in a specific classroom they teach."""
    lang = get_lang_from_request(request)
    
    try:
        if request.user.role != 'teacher':
            return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                            status=status.HTTP_403_FORBIDDEN)
        
        teacher = getattr(request.user, 'teacher_profile', None)
        if not teacher:
            return Response({'success': False, 'message': 'Teacher profile not found.', 'language': lang},
                            status=status.HTTP_404_NOT_FOUND)
        
        classroom = get_object_or_404(ClassRoom, id=classroom_id)
        
        # Verify teacher teaches in this classroom
        teaches = TeacherTimetable.objects.filter(
            teacher=teacher,
            classroom=classroom,
            status='active'
        ).exists()
        
        if not teaches:
            return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                            status=status.HTTP_403_FORBIDDEN)
        
        academic_year_id = request.query_params.get('academic_year_id')
        academic_year = get_object_or_404(AcademicYear, id=academic_year_id) if academic_year_id else None
        
        # Get students in this classroom
        assignments = StudentClassroomAssignment.objects.filter(
            classroom=classroom,
            status='active'
        )
        if academic_year:
            assignments = assignments.filter(academic_year=academic_year)
        
        students = [a.student for a in assignments.select_related('student')]
        
        return Response({
            'success': True,
            'language': lang,
            'data': {
                'classroom': {
                    'id': classroom.id,
                    'name': classroom.name,
                    'code': classroom.code,
                    'capacity': classroom.capacity
                },
                'students': StudentListSerializer(students, many=True).data,
                'total_students': len(students)
            }
        })
        
    except Exception as exc:
        logger.error(f"[get_teacher_classroom_students] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═══════════════════════════════════════════════════════════════
# ACADEMIC HISTORY VIEWS
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_academic_history(request, student_id):
    """Get student's academic history."""
    lang = get_lang_from_request(request)
    
    # Permission checks
    user = request.user
    if user.role != 'admin':
        if user.role == 'parent':
            parent = get_object_or_404(Parent, user=user)
            if not parent.students.filter(id=student_id).exists():
                return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                                status=status.HTTP_403_FORBIDDEN)
        elif user.role == 'student':
            if not hasattr(user, 'student_profile') or user.student_profile.id != student_id:
                return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                                status=status.HTTP_403_FORBIDDEN)
    
    try:
        student = get_object_or_404(Student, id=student_id)
        history = StudentAcademicHistory.objects.filter(
            student=student
        ).select_related('academic_year', 'term', 'school_level', 'class_level', 'classroom', 'promoted_from')
        
        return Response({
            'success': True,
            'language': lang,
            'data': StudentAcademicHistorySerializer(history, many=True).data
        })
    except Exception as exc:
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
        
        
@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_all_parents(request):
    """Admin: List all parents with optional filters and pagination."""
    print(f"\n{SEPARATOR}\n[get_all_parents] Request received\n{SEPARATOR}")
    lang = get_lang_from_request(request)

    try:
        qs = Parent.objects.select_related('user', 'created_by').prefetch_related('students')

        # Filters
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(full_name__icontains=search)

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        relationship_type = request.query_params.get('relationship_type')
        if relationship_type:
            qs = qs.filter(relationship_type=relationship_type)

        student_id = request.query_params.get('student_id')
        if student_id:
            qs = qs.filter(students__id=student_id)

        # Pagination
        page = max(int(request.query_params.get('page', 1)), 1)
        page_size = min(int(request.query_params.get('page_size', 10)), 100)
        total = qs.count()
        start = (page - 1) * page_size
        paginated = qs[start:start + page_size]

        print(f"[get_all_parents] Returning {len(paginated)} of {total}")
        return Response({
            'success': True,
            'language': lang,
            'data': {
                'count': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size,
                'results': ParentListSerializer(paginated, many=True).data,
            },
        })

    except Exception as exc:
        logger.error(f"[get_all_parents] Error: {exc}", exc_info=True)
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
"""
Students app views.

All view functions use @api_view decorator and are fully independent.
Language detection follows the same pattern as the accounts app.
"""
import logging

from django.shortcuts import get_object_or_404
from django.db import transaction
from django.conf import settings

from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from accounts.models import User
from accounts.permissions import IsAdmin
from teachers.models import Teacher, TeacherAssignment

from notifications.services import NotificationService

from .models import Student, Parent, StudentParent
from .serializers import (
    StudentListSerializer, StudentDetailSerializer,
    StudentCreateSerializer, StudentUpdateSerializer,
    ParentListSerializer, ParentDetailSerializer,
    ParentCreateSerializer, ParentUpdateSerializer,
)
from .translations import get_message
from .utils import (
    create_user_for_student, create_user_for_parent,
    send_student_credentials, send_parent_credentials,
)

logger = logging.getLogger(__name__)

SEPARATOR = '=' * 60


# ─────────────────────────────────────────────────────────────
# HELPER
# ─────────────────────────────────────────────────────────────

def get_lang(request) -> str:
    """Detect language from request: X-Language > Accept-Language > user profile > 'en'."""
    for source, value in [
        ('X-Language header', request.headers.get('X-Language')),
        ('Accept-Language header', (request.headers.get('Accept-Language') or '').split(',')[0].split('-')[0]),
    ]:
        if value and value in ('en', 'fr', 'rw'):
            print(f"[Language] Detected from {source}: {value}")
            return value

    if request.user.is_authenticated and getattr(request.user, 'language', None) in ('en', 'fr', 'rw'):
        print(f"[Language] Detected from user profile: {request.user.language}")
        return request.user.language

    print("[Language] Defaulting to: en")
    return 'en'


def _notify(user, notification_type, title, message, priority='medium', created_by=None, extra_data=None, action_url=''):
    """Wrapper to safely fire a notification without crashing the main flow."""
    try:
        NotificationService.create_notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            created_by=created_by,
            data=extra_data or {},
            action_url=action_url,
        )
        print(f"[Notification] '{notification_type}' sent to {user.username}")
    except Exception as exc:
        logger.error(f"[Notification] Failed to create '{notification_type}' for {user.username}: {exc}")
        print(f"[Notification] Failed to create '{notification_type}': {exc}")


# ═══════════════════════════════════════════════════════════════
# STUDENT VIEWS
# ═══════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_student(request):
    """Admin: Create a new student, auto-create user account, send credentials."""
    print(f"\n{SEPARATOR}\n[create_student] Request received\n{SEPARATOR}")
    lang = get_lang(request)
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
            student = serializer.save(user=user, created_by=request.user)
            print(f"[create_student] Student created: {student.roll_number}")

            # 3. Send credentials by email
            send_student_credentials(student, raw_password, recipient_email=email)

            # 4. Notifications
            notif_title = get_message('notif_student_created_title', lang)
            notif_msg = get_message('notif_student_created_msg', lang, roll_number=student.roll_number)
            _notify(
                user=user,
                notification_type='user_created',
                title=notif_title,
                message=notif_msg,
                priority='high',
                created_by=request.user,
                extra_data={'roll_number': student.roll_number, 'role': 'student'},
                action_url='/app/dashboard',
            )
            _notify(
                user=request.user,
                notification_type='user_created',
                title='Student Created',
                message=f'Student {student.full_name} ({student.roll_number}) has been created.',
                priority='medium',
                created_by=request.user,
                extra_data={'student_id': student.id},
                action_url=f'/app/students/{student.id}',
            )

        print(f"[create_student] Success: {student.roll_number}\n{SEPARATOR}\n")
        return Response({
            'success': True,
            'message': get_message('student_created', lang),
            'language': lang,
            'data': StudentDetailSerializer(student).data,
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
    """Admin: List all students with optional filters and pagination."""
    print(f"\n{SEPARATOR}\n[get_all_students] Request received\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        qs = Student.objects.select_related(
            'user', 'current_academic_year', 'current_school_level', 'current_class_level', 'created_by'
        ).prefetch_related('parents')

        # Filters
        search = request.query_params.get('search')
        if search:
            qs = qs.filter(full_name__icontains=search)
            print(f"[get_all_students] Search: {search}")

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        class_level_id = request.query_params.get('class_level_id')
        if class_level_id:
            qs = qs.filter(current_class_level_id=class_level_id)

        school_level_id = request.query_params.get('school_level_id')
        if school_level_id:
            qs = qs.filter(current_school_level_id=school_level_id)

        academic_year_id = request.query_params.get('academic_year_id')
        if academic_year_id:
            qs = qs.filter(current_academic_year_id=academic_year_id)

        # Pagination
        page = max(int(request.query_params.get('page', 1)), 1)
        page_size = min(int(request.query_params.get('page_size', 10)), 100)
        total = qs.count()
        start = (page - 1) * page_size
        paginated = qs[start:start + page_size]

        print(f"[get_all_students] Returning {len(paginated)} of {total}")
        return Response({
            'success': True,
            'language': lang,
            'data': {
                'count': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size,
                'results': StudentListSerializer(paginated, many=True).data,
            },
        })

    except Exception as exc:
        logger.error(f"[get_all_students] Error: {exc}", exc_info=True)
        print(f"[get_all_students] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_student_by_id(request, student_id):
    """Admin: Get full student details by ID."""
    print(f"\n{SEPARATOR}\n[get_student_by_id] ID={student_id}\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        student = get_object_or_404(Student, id=student_id)
        print(f"[get_student_by_id] Found: {student.roll_number}")
        return Response({
            'success': True,
            'language': lang,
            'data': StudentDetailSerializer(student).data,
        })
    except Exception as exc:
        logger.error(f"[get_student_by_id] Error: {exc}", exc_info=True)
        print(f"[get_student_by_id] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_student(request, student_id):
    """Admin: Update student details."""
    print(f"\n{SEPARATOR}\n[update_student] ID={student_id}\n{SEPARATOR}")
    lang = get_lang(request)
    print(f"[update_student] Data: {request.data}")

    try:
        student = get_object_or_404(Student, id=student_id)
        serializer = StudentUpdateSerializer(student, data=request.data, partial=True)

        if not serializer.is_valid():
            print(f"[update_student] Validation errors: {serializer.errors}")
            return Response({'success': False, 'errors': serializer.errors, 'language': lang},
                            status=status.HTTP_400_BAD_REQUEST)

        student = serializer.save()
        print(f"[update_student] Updated: {student.roll_number}")

        # Notification to student
        if student.user:
            _notify(
                user=student.user,
                notification_type='user_updated',
                title=get_message('notif_student_updated_title', lang),
                message=f'Your student profile has been updated by {request.user.username}.',
                priority='medium',
                created_by=request.user,
                extra_data={'updated_fields': list(request.data.keys())},
                action_url='/app/profile',
            )

        return Response({
            'success': True,
            'message': get_message('student_updated', lang),
            'language': lang,
            'data': StudentDetailSerializer(student).data,
        })

    except Exception as exc:
        logger.error(f"[update_student] Error: {exc}", exc_info=True)
        print(f"[update_student] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_student(request, student_id):
    """Admin: Delete a student and their linked user account."""
    print(f"\n{SEPARATOR}\n[delete_student] ID={student_id}\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        student = get_object_or_404(Student, id=student_id)
        full_name = student.full_name
        roll_number = student.roll_number

        # Notify before delete
        if student.user:
            _notify(
                user=student.user,
                notification_type='user_deleted',
                title=get_message('notif_student_deleted_title', lang),
                message=f'Your student account has been removed from the system.',
                priority='high',
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
        print(f"[delete_student] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_student_profile(request):
    """
    Logged-in student: Get own profile including parent/guardian details.
    """
    print(f"\n{SEPARATOR}\n[get_my_student_profile] User: {request.user.username}\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        student = getattr(request.user, 'student_profile', None)
        if not student:
            print(f"[get_my_student_profile] No student profile for {request.user.username}")
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
        print(f"[get_my_student_profile] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def student_get_my_parents(request):
    """
    Logged-in student: Get own parent/guardian details.
    """
    print(f"\n{SEPARATOR}\n[student_get_my_parents] User: {request.user.username}\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        student = getattr(request.user, 'student_profile', None)
        if not student:
            return Response({
                'success': False,
                'message': get_message('student_not_found', lang),
                'language': lang,
            }, status=status.HTTP_404_NOT_FOUND)

        parents = student.parents.all()
        print(f"[student_get_my_parents] Found {parents.count()} parent(s)")
        from .serializers import ParentDetailSerializer
        return Response({
            'success': True,
            'language': lang,
            'data': ParentDetailSerializer(parents, many=True).data,
        })

    except Exception as exc:
        logger.error(f"[student_get_my_parents] Error: {exc}", exc_info=True)
        print(f"[student_get_my_parents] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═══════════════════════════════════════════════════════════════
# PARENT VIEWS
# ═══════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated, IsAdmin])
def create_parent(request):
    """
    Admin: Create a parent/guardian, auto-create user account, send credentials.
    A parent must be linked to at least one student.
    """
    print(f"\n{SEPARATOR}\n[create_parent] Request received\n{SEPARATOR}")
    lang = get_lang(request)
    print(f"[create_parent] Lang: {lang} | Data: {request.data}")

    serializer = ParentCreateSerializer(data=request.data)
    if not serializer.is_valid():
        print(f"[create_parent] Validation errors: {serializer.errors}")
        return Response({'success': False, 'errors': serializer.errors, 'language': lang},
                        status=status.HTTP_400_BAD_REQUEST)

    try:
        with transaction.atomic():
            validated = serializer.validated_data
            full_name = validated.get('full_name', '')
            email = validated.get('email', '')

            # 1. Create user account
            user, raw_password = create_user_for_parent(full_name, email, request.user)
            print(f"[create_parent] User created: {user.username}")

            # 2. Create parent
            parent = serializer.save(user=user, created_by=request.user)
            print(f"[create_parent] Parent created: {parent.full_name}")

            # 3. Send credentials
            send_parent_credentials(parent, raw_password)

            # 4. Notifications
            _notify(
                user=user,
                notification_type='user_created',
                title=get_message('notif_parent_created_title', lang),
                message=get_message('notif_parent_created_msg', lang),
                priority='high',
                created_by=request.user,
                extra_data={'role': 'parent'},
                action_url='/app/dashboard',
            )
            _notify(
                user=request.user,
                notification_type='user_created',
                title='Parent/Guardian Created',
                message=f'Parent {parent.full_name} has been created and linked to student(s).',
                priority='medium',
                created_by=request.user,
                extra_data={'parent_id': parent.id},
                action_url=f'/app/parents/{parent.id}',
            )

        print(f"[create_parent] Success: {parent.id}\n{SEPARATOR}\n")
        return Response({
            'success': True,
            'message': get_message('parent_created', lang),
            'language': lang,
            'data': ParentDetailSerializer(parent).data,
        }, status=status.HTTP_201_CREATED)

    except Exception as exc:
        logger.error(f"[create_parent] Unexpected error: {exc}", exc_info=True)
        print(f"[create_parent] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_all_parents(request):
    """Admin: List all parents/guardians with pagination."""
    print(f"\n{SEPARATOR}\n[get_all_parents] Request received\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        qs = Parent.objects.select_related('user', 'created_by').prefetch_related('students')

        search = request.query_params.get('search')
        if search:
            qs = qs.filter(full_name__icontains=search)

        status_filter = request.query_params.get('status')
        if status_filter:
            qs = qs.filter(status=status_filter)

        relationship = request.query_params.get('relationship_type')
        if relationship:
            qs = qs.filter(relationship_type=relationship)

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
        print(f"[get_all_parents] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated, IsAdmin])
def get_parent_by_id(request, parent_id):
    """Admin: Get full parent/guardian details by ID."""
    print(f"\n{SEPARATOR}\n[get_parent_by_id] ID={parent_id}\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        parent = get_object_or_404(Parent, id=parent_id)
        print(f"[get_parent_by_id] Found: {parent.full_name}")
        return Response({
            'success': True,
            'language': lang,
            'data': ParentDetailSerializer(parent).data,
        })
    except Exception as exc:
        logger.error(f"[get_parent_by_id] Error: {exc}", exc_info=True)
        print(f"[get_parent_by_id] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated, IsAdmin])
def update_parent(request, parent_id):
    """Admin: Update parent/guardian details."""
    print(f"\n{SEPARATOR}\n[update_parent] ID={parent_id}\n{SEPARATOR}")
    lang = get_lang(request)
    print(f"[update_parent] Data: {request.data}")

    try:
        parent = get_object_or_404(Parent, id=parent_id)
        serializer = ParentUpdateSerializer(parent, data=request.data, partial=True)

        if not serializer.is_valid():
            print(f"[update_parent] Validation errors: {serializer.errors}")
            return Response({'success': False, 'errors': serializer.errors, 'language': lang},
                            status=status.HTTP_400_BAD_REQUEST)

        parent = serializer.save()
        print(f"[update_parent] Updated: {parent.full_name}")

        if parent.user:
            _notify(
                user=parent.user,
                notification_type='user_updated',
                title=get_message('notif_parent_updated_title', lang),
                message=f'Your parent/guardian profile has been updated by {request.user.username}.',
                priority='medium',
                created_by=request.user,
                action_url='/app/profile',
            )

        return Response({
            'success': True,
            'message': get_message('parent_updated', lang),
            'language': lang,
            'data': ParentDetailSerializer(parent).data,
        })

    except Exception as exc:
        logger.error(f"[update_parent] Error: {exc}", exc_info=True)
        print(f"[update_parent] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated, IsAdmin])
def delete_parent(request, parent_id):
    """Admin: Delete a parent/guardian and their linked user account."""
    print(f"\n{SEPARATOR}\n[delete_parent] ID={parent_id}\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        parent = get_object_or_404(Parent, id=parent_id)
        full_name = parent.full_name

        if parent.user:
            _notify(
                user=parent.user,
                notification_type='user_deleted',
                title=get_message('notif_parent_deleted_title', lang),
                message='Your parent/guardian account has been removed from the system.',
                priority='high',
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
        print(f"[delete_parent] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_my_parent_profile(request):
    """
    Logged-in parent: Get own profile including all associated students.
    """
    print(f"\n{SEPARATOR}\n[get_my_parent_profile] User: {request.user.username}\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent:
            print(f"[get_my_parent_profile] No parent profile for {request.user.username}")
            return Response({
                'success': False,
                'message': get_message('parent_not_found', lang),
                'language': lang,
            }, status=status.HTTP_404_NOT_FOUND)

        print(f"[get_my_parent_profile] Found: {parent.full_name}")
        return Response({
            'success': True,
            'language': lang,
            'data': ParentDetailSerializer(parent).data,
        })

    except Exception as exc:
        logger.error(f"[get_my_parent_profile] Error: {exc}", exc_info=True)
        print(f"[get_my_parent_profile] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def update_my_parent_profile(request):
    """
    Logged-in parent: Update own profile (non-sensitive fields only).
    """
    print(f"\n{SEPARATOR}\n[update_my_parent_profile] User: {request.user.username}\n{SEPARATOR}")
    lang = get_lang(request)
    print(f"[update_my_parent_profile] Data: {request.data}")

    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent:
            return Response({
                'success': False,
                'message': get_message('parent_not_found', lang),
                'language': lang,
            }, status=status.HTTP_404_NOT_FOUND)

        # Parents can only update their own non-sensitive info
        allowed_fields = {'physical_address', 'phone_number'}
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        serializer = ParentUpdateSerializer(parent, data=update_data, partial=True)
        if not serializer.is_valid():
            print(f"[update_my_parent_profile] Validation errors: {serializer.errors}")
            return Response({'success': False, 'errors': serializer.errors, 'language': lang},
                            status=status.HTTP_400_BAD_REQUEST)

        parent = serializer.save()
        print(f"[update_my_parent_profile] Updated: {parent.full_name}")

        _notify(
            user=request.user,
            notification_type='user_updated',
            title=get_message('notif_parent_updated_title', lang),
            message='Your profile has been updated successfully.',
            priority='low',
            created_by=request.user,
            action_url='/app/profile',
        )

        return Response({
            'success': True,
            'message': get_message('parent_updated', lang),
            'language': lang,
            'data': ParentDetailSerializer(parent).data,
        })

    except Exception as exc:
        logger.error(f"[update_my_parent_profile] Error: {exc}", exc_info=True)
        print(f"[update_my_parent_profile] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['PUT', 'PATCH'])
@permission_classes([IsAuthenticated])
def parent_update_student(request, student_id):
    """
    Logged-in parent: Update limited fields on their own child's profile.
    Only allowed if the logged-in user is a parent of this student.
    """
    print(f"\n{SEPARATOR}\n[parent_update_student] Parent: {request.user.username} | Student: {student_id}\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        parent = getattr(request.user, 'parent_profile', None)
        if not parent:
            return Response({
                'success': False,
                'message': get_message('parent_not_found', lang),
                'language': lang,
            }, status=status.HTTP_404_NOT_FOUND)

        # Verify this student belongs to the parent
        if not parent.students.filter(id=student_id).exists():
            return Response({
                'success': False,
                'message': get_message('permission_denied', lang),
                'language': lang,
            }, status=status.HTTP_403_FORBIDDEN)

        student = get_object_or_404(Student, id=student_id)

        # Parents may only update limited fields
        allowed_fields = {'phone_number', 'email'}
        update_data = {k: v for k, v in request.data.items() if k in allowed_fields}

        serializer = StudentUpdateSerializer(student, data=update_data, partial=True)
        if not serializer.is_valid():
            return Response({'success': False, 'errors': serializer.errors, 'language': lang},
                            status=status.HTTP_400_BAD_REQUEST)

        student = serializer.save()
        print(f"[parent_update_student] Student {student.roll_number} updated by parent {parent.full_name}")

        return Response({
            'success': True,
            'message': get_message('student_updated', lang),
            'language': lang,
            'data': StudentDetailSerializer(student).data,
        })

    except Exception as exc:
        logger.error(f"[parent_update_student] Error: {exc}", exc_info=True)
        print(f"[parent_update_student] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def student_add_parent(request):
    """
    Logged-in student: Add a parent/guardian to their own profile.

    Rules:
    - Allowed ONLY when the student currently has NO parents assigned.
    - If the student already has one or more parents, the request is rejected —
      only an admin can modify parent assignments in that case.
    - A new User account is created for the parent and credentials are emailed.
    """
    print(f"\n{SEPARATOR}\n[student_add_parent] User: {request.user.username}\n{SEPARATOR}")
    lang = get_lang(request)
    print(f"[student_add_parent] Lang: {lang} | Data: {request.data}")

    try:
        # 1. Confirm caller is a student
        if request.user.role != 'student':
            print(f"[student_add_parent] Rejected – role is {request.user.role}, not student")
            return Response({
                'success': False,
                'message': get_message('permission_denied', lang),
                'language': lang,
            }, status=status.HTTP_403_FORBIDDEN)

        # 2. Resolve student profile
        student = getattr(request.user, 'student_profile', None)
        if not student:
            print(f"[student_add_parent] No student profile found for {request.user.username}")
            return Response({
                'success': False,
                'message': get_message('student_not_found', lang),
                'language': lang,
            }, status=status.HTTP_404_NOT_FOUND)

        # 3. Block if parent(s) already assigned — admin-only territory
        existing_count = student.parents.count()
        if existing_count > 0:
            print(f"[student_add_parent] Blocked – student {student.roll_number} already has {existing_count} parent(s)")
            return Response({
                'success': False,
                'message': get_message('student_already_has_parents', lang),
                'language': lang,
                'data': {
                    'existing_parents_count': existing_count,
                    'hint': get_message('contact_admin_to_update_parents', lang),
                },
            }, status=status.HTTP_403_FORBIDDEN)

        # 4. Validate incoming parent data.
        #    We re-use ParentCreateSerializer but inject the student's own ID
        #    so the caller doesn't have to (and cannot spoof another student).
        data = request.data.copy()
        data['student_ids'] = [student.id]

        serializer = ParentCreateSerializer(data=data)
        if not serializer.is_valid():
            print(f"[student_add_parent] Validation errors: {serializer.errors}")
            return Response({
                'success': False,
                'errors': serializer.errors,
                'language': lang,
            }, status=status.HTTP_400_BAD_REQUEST)

        # 5. Create user account + parent record inside a transaction
        with transaction.atomic():
            validated = serializer.validated_data
            full_name = validated.get('full_name', '')
            email = validated.get('email', '')

            parent_user, raw_password = create_user_for_parent(full_name, email, request.user)
            print(f"[student_add_parent] Parent user account created: {parent_user.username}")

            parent = serializer.save(user=parent_user, created_by=request.user)
            print(f"[student_add_parent] Parent record created: {parent.full_name} (id={parent.id})")

            # 6. Send credentials to the parent
            send_parent_credentials(parent, raw_password)

            # 7. Notifications
            # → to the new parent's user account
            _notify(
                user=parent_user,
                notification_type='user_created',
                title=get_message('notif_parent_created_title', lang),
                message=get_message('notif_parent_created_msg', lang),
                priority='high',
                created_by=request.user,
                extra_data={'role': 'parent', 'linked_student': student.roll_number},
                action_url='/app/dashboard',
            )
            # → to the student who triggered the action
            _notify(
                user=request.user,
                notification_type='user_created',
                title=get_message('notif_student_parent_added_title', lang),
                message=get_message('notif_student_parent_added_msg', lang, parent_name=parent.full_name),
                priority='medium',
                created_by=request.user,
                extra_data={'parent_id': parent.id, 'parent_name': parent.full_name},
                action_url='/app/profile',
            )

        print(f"[student_add_parent] Success – parent {parent.full_name} linked to student {student.roll_number}")
        print(f"{SEPARATOR}\n")

        return Response({
            'success': True,
            'message': get_message('parent_created', lang),
            'language': lang,
            'data': ParentDetailSerializer(parent).data,
        }, status=status.HTTP_201_CREATED)

    except Exception as exc:
        logger.error(f"[student_add_parent] Unexpected error: {exc}", exc_info=True)
        print(f"[student_add_parent] ERROR: {exc}")
        return Response({
            'success': False,
            'message': str(exc),
            'language': lang,
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ═══════════════════════════════════════════════════════════════
# TEACHER ↔ STUDENT CROSS-VIEWS
# ═══════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_teachers(request, student_id=None):
    """
    Get teachers who teach a given student.

    Access:
    - Admin: can query any student_id
    - Student (self): no student_id in URL needed
    - Parent: can query their own child's student_id
    """
    print(f"\n{SEPARATOR}\n[get_student_teachers] User: {request.user.username} | student_id: {student_id}\n{SEPARATOR}")
    lang = get_lang(request)

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

        # Find teachers assigned to this student's school level + class level
        if not student.current_school_level or not student.current_class_level:
            return Response({
                'success': True,
                'language': lang,
                'data': [],
                'message': 'Student has no current academic placement.',
            })

        assignments = TeacherAssignment.objects.filter(
            school_level=student.current_school_level,
            class_level=student.current_class_level,
            status='active',
        ).select_related('teacher', 'subject', 'class_level', 'school_level')

        # Build teacher list with subject info
        teacher_data = []
        seen = set()
        for a in assignments:
            teacher = a.teacher
            if teacher.id not in seen:
                seen.add(teacher.id)
                teacher_data.append({
                    'teacher_id': teacher.id,
                    'full_name': teacher.full_name,
                    'email': teacher.email,
                    'phone_number': teacher.phone_number,
                    'specialization': teacher.specialization,
                    'status': teacher.status,
                    'subjects': [],
                })
            # Append subject to this teacher's entry
            for entry in teacher_data:
                if entry['teacher_id'] == teacher.id:
                    entry['subjects'].append({
                        'subject_id': a.subject.id,
                        'subject_name': a.subject.name,
                        'subject_code': a.subject.code,
                    })
                    break

        print(f"[get_student_teachers] Found {len(teacher_data)} teacher(s) for student {student.roll_number}")
        return Response({
            'success': True,
            'language': lang,
            'data': {
                'student': {'id': student.id, 'full_name': student.full_name, 'roll_number': student.roll_number},
                'teachers': teacher_data,
            },
        })

    except Exception as exc:
        logger.error(f"[get_student_teachers] Error: {exc}", exc_info=True)
        print(f"[get_student_teachers] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_get_student_detail(request, student_id):
    """
    Logged-in teacher: Get full details of a student they teach,
    including that student's parent/guardian information.
    """
    print(f"\n{SEPARATOR}\n[teacher_get_student_detail] Teacher: {request.user.username} | Student: {student_id}\n{SEPARATOR}")
    lang = get_lang(request)

    try:
        if request.user.role != 'teacher':
            return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                            status=status.HTTP_403_FORBIDDEN)

        teacher = getattr(request.user, 'teacher_profile', None)
        if not teacher:
            return Response({'success': False, 'message': 'Teacher profile not found.', 'language': lang},
                            status=status.HTTP_404_NOT_FOUND)

        student = get_object_or_404(Student, id=student_id)

        # Verify teacher teaches this student (matching school_level + class_level)
        if not student.current_school_level or not student.current_class_level:
            return Response({'success': False, 'message': 'Student has no academic placement.', 'language': lang},
                            status=status.HTTP_400_BAD_REQUEST)

        teaches_student = TeacherAssignment.objects.filter(
            teacher=teacher,
            school_level=student.current_school_level,
            class_level=student.current_class_level,
            status='active',
        ).exists()

        if not teaches_student:
            print(f"[teacher_get_student_detail] Teacher {teacher.full_name} does not teach student {student.roll_number}")
            return Response({'success': False, 'message': get_message('permission_denied', lang), 'language': lang},
                            status=status.HTTP_403_FORBIDDEN)

        print(f"[teacher_get_student_detail] Access granted. Returning data for {student.roll_number}")
        return Response({
            'success': True,
            'language': lang,
            'data': StudentDetailSerializer(student).data,
        })

    except Exception as exc:
        logger.error(f"[teacher_get_student_detail] Error: {exc}", exc_info=True)
        print(f"[teacher_get_student_detail] ERROR: {exc}")
        return Response({'success': False, 'message': str(exc), 'language': lang},
                        status=status.HTTP_500_INTERNAL_SERVER_ERROR)
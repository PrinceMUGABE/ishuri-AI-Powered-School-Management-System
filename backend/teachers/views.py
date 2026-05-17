# teachers/views.py
"""
All responses use unified format:
    Success: {'success': True, 'data': ..., 'message': <str>}
    Error: {'success': False, 'message': <str>}
"""

import traceback
import re
import json
from datetime import date, datetime
from functools import wraps

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import authenticate
from django.db import models as django_models

from .models import Teacher, TeacherDocument, TeacherAssignment, TeacherTimetable
from .serializers import (
    TeacherSerializer, TeacherCreateSerializer, TeacherProfileUpdateSerializer,
    TeacherDocumentSerializer, TeacherAssignmentSerializer, TeacherTimetableSerializer,
    ChangePasswordSerializer, HolidaySerializer, SchoolDaySettingSerializer,
)
from .translations import get_translation, get_notification_title, get_notification_message
from .services import (
    create_teacher_user_account, generate_username,
    send_teacher_welcome_email, generate_password,
)
from .timetable_generator import generate_timetable_for_term
from academics.models import (
    AcademicYear, SchoolLevel, ClassLevel, Subject, ClassRoom,
    Term, SchoolBreak, SchoolDaySetting, Holiday,
)
from notifications.services import NotificationService
from accounts.models import User


# ---------------------------------------------------------------------------
# Logging Utility
# ---------------------------------------------------------------------------

def log_request_response(func):
    """Decorator to log request data and response data to terminal."""
    @wraps(func)
    def wrapper(request, *args, **kwargs):
        # Log request
        print("\n" + "="*80)
        print(f"[REQUEST] {request.method} {request.path}")
        print(f"[TIMESTAMP] {timezone.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print(f"[USER] {request.user.username if request.user.is_authenticated else 'Anonymous'}")
        print(f"[USER_ROLE] {request.user.role if request.user.is_authenticated else 'None'}")
        
        # Log request data
        if request.method == 'GET':
            print(f"[QUERY_PARAMS] {dict(request.query_params)}")
        elif request.method in ['POST', 'PUT', 'PATCH']:
            try:
                if request.content_type == 'application/json':
                    print(f"[REQUEST_BODY] {json.dumps(request.data, indent=2, default=str)}")
                else:
                    print(f"[REQUEST_DATA] {request.data}")
            except Exception as e:
                print(f"[REQUEST_BODY_ERROR] {str(e)}")
        
        # Execute view
        try:
            response = func(request, *args, **kwargs)
            
            # Log response
            print(f"\n[RESPONSE_STATUS] {response.status_code}")
            try:
                if hasattr(response, 'data'):
                    print(f"[RESPONSE_DATA] {json.dumps(response.data, indent=2, default=str)}")
                else:
                    print(f"[RESPONSE] {response}")
            except Exception as e:
                print(f"[RESPONSE_DATA_ERROR] {str(e)}")
            
            print("="*80 + "\n")
            return response
            
        except Exception as e:
            # Log unhandled exception
            print(f"\n[UNHANDLED_EXCEPTION] {type(e).__name__}: {str(e)}")
            print(f"[TRACEBACK] {traceback.format_exc()}")
            print("="*80 + "\n")
            
            return Response({
                'success': False,
                'message': f'An unexpected error occurred: {str(e)}'
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    return wrapper


def print_error(message, exc=None):
    """Print error to terminal."""
    print(f"[ERROR] {message}")
    if exc:
        print(f"[EXCEPTION] {type(exc).__name__}: {str(exc)}")
        print(f"[TRACEBACK] {traceback.format_exc()}")


def print_success(message, data=None):
    """Print success to terminal."""
    print(f"[SUCCESS] {message}")
    if data:
        print(f"[DATA] {data}")


def _err(message, http_status=status.HTTP_400_BAD_REQUEST):
    """Unified error response - no objects, just message."""
    print_error(message)
    return Response({'success': False, 'message': str(message)}, status=http_status)


def _ok(data=None, message='', http_status=status.HTTP_200_OK):
    """Unified success response."""
    print_success(message, data)
    response_data = {'success': True, 'message': message}
    if data is not None:
        response_data['data'] = data
    return Response(response_data, status=http_status)


def is_admin(user):
    return user.is_authenticated and user.role == 'admin'


def is_teacher(user):
    return user.is_authenticated and user.role == 'teacher'


def get_lang(request):
    lang = request.headers.get('X-Language', 'en')
    return lang if lang in ('en', 'fr', 'rw') else 'en'


# ---------------------------------------------------------------------------
# Teacher CRUD
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@log_request_response
def teacher_list_create(request):
    lang = get_lang(request)

    try:
        if request.method == 'GET':
            try:
                qs = Teacher.objects.all()
                s = request.query_params.get('status')
                if s:
                    qs = qs.filter(status=s)
                    print(f"[FILTER] status={s}")
                
                search = request.query_params.get('search')
                if search:
                    qs = qs.filter(
                        django_models.Q(first_name__icontains=search) |
                        django_models.Q(last_name__icontains=search) |
                        django_models.Q(email__icontains=search) |
                        django_models.Q(phone_number__icontains=search)
                    )
                    print(f"[FILTER] search={search}")
                
                school_level = request.query_params.get('school_level')
                if school_level:
                    qs = qs.filter(
                        assignments__school_level_id=school_level,
                        assignments__status='active'
                    ).distinct()
                    print(f"[FILTER] school_level={school_level}")

                serializer = TeacherSerializer(qs, many=True, context={'request': request})
                return _ok(serializer.data, get_translation('teachers_retrieved', lang))
                
            except Exception as e:
                print_error(f"Error in GET teacher_list_create: {str(e)}", e)
                return _err(get_translation('database_error', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # POST method
        try:
            if not is_admin(request.user):
                return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

            serializer = TeacherCreateSerializer(data=request.data)
            if not serializer.is_valid():
                print(f"[VALIDATION_ERRORS] {serializer.errors}")
                return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")

            with transaction.atomic():
                password = generate_password()
                username = generate_username(
                    f"{serializer.validated_data.get('first_name', '')} "
                    f"{serializer.validated_data.get('last_name', '')}"
                )
                
                print(f"[CREATE_USER] username={username}, email={serializer.validated_data['email']}")
                
                user = User.objects.create(
                    username=username,
                    email=serializer.validated_data['email'],
                    role='teacher',
                    status='active',
                )
                user.set_password(password)
                user.save()

                vd = dict(serializer.validated_data)
                specializations = vd.pop('specializations', [])
                teacher = Teacher.objects.create(user=user, created_by=request.user, **vd)

                if specializations:
                    teacher.specializations.set(specializations)
                
                print(f"[TEACHER_CREATED] id={teacher.id}, name={teacher.full_name}")

            email_sent = send_teacher_welcome_email(teacher, password, lang)
            
            try:
                NotificationService.create_academic_notification(
                    user=request.user,
                    notification_type='teacher_created',
                    title=get_notification_title('teacher_created', lang),
                    message=get_notification_message('teacher_created_notification', lang, name=teacher.full_name),
                    created_by=request.user,
                    extra_data={'teacher_id': teacher.id, 'teacher_name': teacher.full_name},
                    action_url='/app/teachers',
                    priority='medium',
                )
                NotificationService.create_academic_notification(
                    user=user,
                    notification_type='teacher_created',
                    title=get_notification_title('teacher_created', lang),
                    message=get_notification_message('teacher_welcome_notification', lang, name=teacher.full_name),
                    created_by=request.user,
                    extra_data={'teacher_id': teacher.id},
                    action_url='/app/teacher/profile',
                    priority='high',
                )
            except Exception as e:
                print_error(f"Notification failed: {str(e)}", e)

            response_data = TeacherSerializer(teacher, context={'request': request}).data
            response_data['username'] = user.username
            if not email_sent:
                response_data['warning'] = f'Password: {password}. Could not send email to {teacher.email}'

            return _ok(
                response_data,
                get_translation('teacher_create_success', lang, name=teacher.full_name),
                status.HTTP_201_CREATED,
            )

        except IntegrityError as e:
            print_error(f"IntegrityError in POST teacher_list_create: {str(e)}", e)
            if 'email' in str(e).lower():
                return _err(get_translation('email_already_exists', lang))
            elif 'phone' in str(e).lower():
                return _err(get_translation('phone_already_exists', lang))
            return _err(get_translation('teacher_already_exists', lang))
            
        except Exception as e:
            print_error(f"Error in POST teacher_list_create: {str(e)}", e)
            return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in teacher_list_create: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@log_request_response
def teacher_detail(request, pk):
    lang = get_lang(request)
    
    try:
        teacher = get_object_or_404(Teacher, id=pk)
        print(f"[TEACHER_FOUND] id={teacher.id}, name={teacher.full_name}")
    except Exception as e:
        print_error(f"Teacher not found with id={pk}", e)
        return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)

    try:
        if request.method == 'GET':
            if not is_admin(request.user) and request.user.id != teacher.user_id:
                return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
            
            serializer = TeacherSerializer(teacher, context={'request': request})
            return _ok(serializer.data, get_translation('teacher_retrieved', lang))

        if not is_admin(request.user):
            return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

        if request.method == 'PUT':
            try:
                serializer = TeacherSerializer(teacher, data=request.data, partial=True, context={'request': request})
                if not serializer.is_valid():
                    print(f"[VALIDATION_ERRORS] {serializer.errors}")
                    return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")
                
                old_name = teacher.full_name
                with transaction.atomic():
                    serializer.save()
                    print(f"[TEACHER_UPDATED] id={teacher.id}, old_name={old_name}, new_name={teacher.full_name}")
                
                try:
                    NotificationService.create_academic_notification(
                        user=request.user,
                        notification_type='teacher_updated',
                        title=get_notification_title('teacher_updated', lang),
                        message=get_notification_message('teacher_updated_notification', lang, name=old_name),
                        created_by=request.user,
                        extra_data={'teacher_id': teacher.id},
                        action_url=f'/app/teachers/{teacher.id}',
                        priority='low',
                    )
                except Exception as e:
                    print_error(f"Notification failed: {str(e)}", e)
                
                return _ok(serializer.data, get_translation('teacher_update_success', lang, name=old_name))
                
            except IntegrityError as e:
                print_error(f"IntegrityError in PUT: {str(e)}", e)
                if 'email' in str(e).lower():
                    return _err(get_translation('email_already_exists', lang))
                return _err(get_translation('integrity_error', lang))
            except Exception as e:
                print_error(f"Error in PUT teacher_detail: {str(e)}", e)
                return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # DELETE method
        try:
            if teacher.assignments.filter(status='active').exists():
                return _err(get_translation('cannot_delete_has_assignments', lang))
            
            name = teacher.full_name
            user_to_del = teacher.user
            teacher.delete()
            if user_to_del:
                user_to_del.delete()
            
            print(f"[TEACHER_DELETED] id={pk}, name={name}")
            
            try:
                NotificationService.create_academic_notification(
                    user=request.user,
                    notification_type='teacher_deleted',
                    title=get_notification_title('teacher_deleted', lang),
                    message=get_notification_message('teacher_deleted_notification', lang, name=name),
                    created_by=request.user,
                    extra_data={'teacher_name': name},
                    action_url='/app/teachers',
                    priority='medium',
                )
            except Exception as e:
                print_error(f"Notification failed: {str(e)}", e)
            
            return _ok(message=get_translation('teacher_delete_success', lang, name=name))
            
        except Exception as e:
            print_error(f"Error in DELETE teacher_detail: {str(e)}", e)
            return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in teacher_detail: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Teacher profile (self-service)
# ---------------------------------------------------------------------------

@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
@log_request_response
def teacher_profile(request):
    lang = get_lang(request)
    
    try:
        if not is_teacher(request.user):
            return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
        
        try:
            teacher = Teacher.objects.get(user=request.user)
            print(f"[TEACHER_FOUND] id={teacher.id}, name={teacher.full_name}")
        except Teacher.DoesNotExist:
            return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            try:
                serializer = TeacherSerializer(teacher, context={'request': request})
                return _ok({
                    'teacher': serializer.data,
                    'user': {
                        'id': request.user.id,
                        'username': request.user.username,
                        'email': request.user.email,
                        'role': request.user.role,
                        'status': request.user.status,
                        'language': request.user.language,
                    }
                }, get_translation('profile_retrieved', lang))
            except Exception as e:
                print_error(f"Error in GET teacher_profile: {str(e)}", e)
                return _err(get_translation('database_error', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # PUT method
        try:
            serializer = TeacherProfileUpdateSerializer(teacher, data=request.data, partial=True)
            if not serializer.is_valid():
                print(f"[VALIDATION_ERRORS] {serializer.errors}")
                return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")
            
            with transaction.atomic():
                serializer.save()
                print(f"[PROFILE_UPDATED] teacher_id={teacher.id}")
            
            try:
                NotificationService.create_academic_notification(
                    user=request.user,
                    notification_type='profile_updated',
                    title=get_notification_title('profile_updated', lang),
                    message=get_notification_message('teacher_profile_updated_notification', lang),
                    created_by=request.user,
                    extra_data={},
                    action_url='/app/teacher/profile',
                    priority='low',
                )
            except Exception as e:
                print_error(f"Notification failed: {str(e)}", e)
            
            return _ok(serializer.data, get_translation('profile_update_success', lang))
            
        except Exception as e:
            print_error(f"Error in PUT teacher_profile: {str(e)}", e)
            return _err(get_translation('profile_update_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in teacher_profile: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Change password
# ---------------------------------------------------------------------------

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@log_request_response
def change_password(request):
    lang = get_lang(request)
    
    try:
        if not is_teacher(request.user) and not is_admin(request.user):
            return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)

        serializer = ChangePasswordSerializer(data=request.data)
        if not serializer.is_valid():
            print(f"[VALIDATION_ERRORS] {serializer.errors}")
            return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")

        user = authenticate(
            username=request.user.username,
            password=serializer.validated_data['current_password']
        )
        if not user:
            return _err(get_translation('current_password_incorrect', lang))

        request.user.set_password(serializer.validated_data['new_password'])
        request.user.save()
        print(f"[PASSWORD_CHANGED] user_id={request.user.id}, username={request.user.username}")

        try:
            NotificationService.create_academic_notification(
                user=request.user,
                notification_type='password_changed',
                title=get_notification_title('password_changed', lang),
                message=get_translation('password_change_success', lang),
                created_by=request.user,
                extra_data={},
                action_url='/app/teacher/profile',
                priority='high',
            )
        except Exception as e:
            print_error(f"Notification failed: {str(e)}", e)

        return _ok(message=get_translation('password_change_success', lang))
        
    except Exception as e:
        print_error(f"Error in change_password: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Teacher Documents
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@log_request_response
def teacher_documents(request, teacher_id=None):
    lang = get_lang(request)

    try:
        if teacher_id:
            if not is_admin(request.user):
                return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)
            try:
                teacher = Teacher.objects.get(id=teacher_id)
                print(f"[TEACHER_FOUND] id={teacher.id} for documents")
            except Teacher.DoesNotExist:
                return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)
        else:
            if not is_teacher(request.user):
                return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
            try:
                teacher = Teacher.objects.get(user=request.user)
            except Teacher.DoesNotExist:
                return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            try:
                docs = teacher.documents.all()
                serializer = TeacherDocumentSerializer(docs, many=True, context={'request': request})
                return _ok(serializer.data, get_translation('documents_retrieved', lang))
            except Exception as e:
                print_error(f"Error in GET teacher_documents: {str(e)}", e)
                return _err(get_translation('database_error', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # POST method
        try:
            serializer = TeacherDocumentSerializer(data=request.data, context={'request': request})
            if not serializer.is_valid():
                print(f"[VALIDATION_ERRORS] {serializer.errors}")
                return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")
            
            with transaction.atomic():
                doc = serializer.save(teacher=teacher)
                print(f"[DOCUMENT_UPLOADED] id={doc.id}, title={doc.title}, teacher_id={teacher.id}")
            
            return _ok(
                serializer.data,
                get_translation('document_upload_success', lang, title=doc.title),
                status.HTTP_201_CREATED,
            )
            
        except Exception as e:
            print_error(f"Error in POST teacher_documents: {str(e)}", e)
            return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in teacher_documents: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@log_request_response
def teacher_document_delete(request, document_id):
    lang = get_lang(request)
    
    try:
        doc = TeacherDocument.objects.get(id=document_id)
        print(f"[DOCUMENT_FOUND] id={doc.id}, title={doc.title}")
    except TeacherDocument.DoesNotExist:
        return _err(get_translation('document_not_found', lang), status.HTTP_404_NOT_FOUND)

    try:
        if not is_admin(request.user) and doc.teacher.user_id != request.user.id:
            return _err(get_translation('permission_denied', lang), status.HTTP_403_FORBIDDEN)

        doc.delete()
        print(f"[DOCUMENT_DELETED] id={document_id}")
        return _ok(message=get_translation('document_delete_success', lang))
        
    except Exception as e:
        print_error(f"Error in teacher_document_delete: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Teacher Assignments
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@log_request_response
def assignment_list_create(request):
    lang = get_lang(request)

    try:
        if request.method == 'GET':
            try:
                qs = TeacherAssignment.objects.all()
                filters = []
                
                for param, field in [
                    ('teacher', 'teacher_id'),
                    ('academic_year', 'academic_year_id'),
                    ('term', 'term_id'),
                    ('status', 'status'),
                    ('school_level', 'school_level_id'),
                ]:
                    val = request.query_params.get(param)
                    if val:
                        qs = qs.filter(**{field: val})
                        filters.append(f"{param}={val}")
                
                if filters:
                    print(f"[FILTERS] {', '.join(filters)}")
                
                serializer = TeacherAssignmentSerializer(qs, many=True)
                return _ok(serializer.data, get_translation('assignments_retrieved', lang))
                
            except Exception as e:
                print_error(f"Error in GET assignment_list_create: {str(e)}", e)
                return _err(get_translation('database_error', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # POST method
        try:
            if not is_admin(request.user):
                return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

            serializer = TeacherAssignmentSerializer(data=request.data)
            if not serializer.is_valid():
                print(f"[VALIDATION_ERRORS] {serializer.errors}")
                return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")

            with transaction.atomic():
                assignment = serializer.save(assigned_by=request.user)
                print(f"[ASSIGNMENT_CREATED] id={assignment.id}, teacher={assignment.teacher.full_name}, subject={assignment.subject.name}")

            _regenerate_timetable_after_change(
                assignment.academic_year, assignment.term, request.user, lang
            )

            try:
                NotificationService.create_academic_notification(
                    user=assignment.teacher.user,
                    notification_type='assignment_created',
                    title=get_notification_title('assignment_created', lang),
                    message=get_notification_message(
                        'assignment_created_notification', lang,
                        subject=assignment.subject.name,
                        class_level=assignment.class_level.name,
                    ),
                    created_by=request.user,
                    extra_data={'assignment_id': assignment.id},
                    action_url='/app/teacher/assignments',
                    priority='high',
                )
            except Exception as e:
                print_error(f"Notification failed: {str(e)}", e)

            return _ok(
                serializer.data,
                get_translation('assignment_create_success', lang, teacher=assignment.teacher.full_name),
                status.HTTP_201_CREATED,
            )
            
        except Exception as e:
            print_error(f"Error in POST assignment_list_create: {str(e)}", e)
            return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in assignment_list_create: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@log_request_response
def assignment_detail(request, pk):
    lang = get_lang(request)

    try:
        if not is_admin(request.user):
            return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

        try:
            assignment = TeacherAssignment.objects.get(id=pk)
            print(f"[ASSIGNMENT_FOUND] id={assignment.id}")
        except TeacherAssignment.DoesNotExist:
            return _err(get_translation('assignment_not_found', lang), status.HTTP_404_NOT_FOUND)

        if request.method == 'GET':
            try:
                serializer = TeacherAssignmentSerializer(assignment)
                return _ok(serializer.data, get_translation('assignment_retrieved', lang))
            except Exception as e:
                print_error(f"Error in GET assignment_detail: {str(e)}", e)
                return _err(get_translation('database_error', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        if request.method == 'PUT':
            try:
                serializer = TeacherAssignmentSerializer(assignment, data=request.data, partial=True)
                if not serializer.is_valid():
                    print(f"[VALIDATION_ERRORS] {serializer.errors}")
                    return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")
                
                with transaction.atomic():
                    updated = serializer.save()
                    print(f"[ASSIGNMENT_UPDATED] id={assignment.id}")
                
                _regenerate_timetable_after_change(
                    updated.academic_year, updated.term, request.user, lang
                )
                
                return _ok(
                    serializer.data,
                    get_translation('assignment_update_success', lang, teacher=assignment.teacher.full_name),
                )
                
            except Exception as e:
                print_error(f"Error in PUT assignment_detail: {str(e)}", e)
                return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # DELETE method
        try:
            teacher_user = assignment.teacher.user
            subj = assignment.subject.name
            cl = assignment.class_level.name
            academic_year = assignment.academic_year
            term = assignment.term
            
            assignment.delete()
            print(f"[ASSIGNMENT_DELETED] id={pk}, subject={subj}, class_level={cl}")

            _regenerate_timetable_after_change(academic_year, term, request.user, lang)

            try:
                NotificationService.create_academic_notification(
                    user=teacher_user,
                    notification_type='assignment_deleted',
                    title=get_notification_title('assignment_deleted', lang),
                    message=get_notification_message(
                        'assignment_deleted_notification', lang,
                        subject=subj, class_level=cl,
                    ),
                    created_by=request.user,
                    extra_data={'subject': subj},
                    action_url='/app/teacher/assignments',
                    priority='medium',
                )
            except Exception as e:
                print_error(f"Notification failed: {str(e)}", e)

            return _ok(message=get_translation('assignment_delete_success', lang))
            
        except Exception as e:
            print_error(f"Error in DELETE assignment_detail: {str(e)}", e)
            return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in assignment_detail: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Timetable
# ---------------------------------------------------------------------------

def _regenerate_timetable_after_change(academic_year, term, user, lang):
    """Helper - silently re-generates the timetable."""
    try:
        TeacherTimetable.objects.filter(academic_year=academic_year, term=term).delete()
        entries, conflicts = generate_timetable_for_term(
            academic_year, term, created_by=user
        )
        if entries:
            TeacherTimetable.objects.bulk_create(entries)
            print(f"[TIMETABLE_REGENERATED] {len(entries)} entries created")
        if conflicts:
            print(f"[TIMETABLE_CONFLICTS] {len(conflicts)} conflicts during auto-regen")
    except Exception as e:
        print_error(f"Error in _regenerate_timetable_after_change: {str(e)}", e)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
@log_request_response
def generate_timetable(request):
    lang = get_lang(request)
    
    try:
        if not is_admin(request.user):
            return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

        academic_year_id = request.data.get('academic_year')
        term_id = request.data.get('term')
        teacher_id = request.data.get('teacher_id')

        if not academic_year_id:
            return _err('academic_year is required')
        if not term_id:
            return _err('term is required')

        try:
            academic_year = AcademicYear.objects.get(id=academic_year_id)
            print(f"[ACADEMIC_YEAR_FOUND] id={academic_year.id}, name={academic_year.name}")
        except AcademicYear.DoesNotExist:
            return _err(get_translation('academic_year_not_found', lang), status.HTTP_404_NOT_FOUND)

        try:
            term = Term.objects.get(id=term_id, academic_year=academic_year)
            print(f"[TERM_FOUND] id={term.id}, name={term.name}")
        except Term.DoesNotExist:
            return _err(get_translation('term_not_found', lang), status.HTTP_404_NOT_FOUND)

        teacher_filter = None
        if teacher_id:
            try:
                teacher_filter = Teacher.objects.get(id=teacher_id)
                print(f"[TEACHER_FILTER] id={teacher_filter.id}, name={teacher_filter.full_name}")
            except Teacher.DoesNotExist:
                return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)

        try:
            del_filter = {'academic_year': academic_year, 'term': term}
            if teacher_filter:
                del_filter['teacher'] = teacher_filter
            deleted = TeacherTimetable.objects.filter(**del_filter).delete()[0]
            print(f"[TIMETABLE_DELETED] {deleted} old entries")

            entries, conflicts = generate_timetable_for_term(
                academic_year, term,
                teacher_filter=teacher_filter,
                created_by=request.user,
            )

            if entries:
                TeacherTimetable.objects.bulk_create(entries)
                print(f"[TIMETABLE_CREATED] {len(entries)} entries")

            try:
                title = get_notification_title('timetable_generated', lang)
                NotificationService.create_academic_notification(
                    user=request.user,
                    notification_type='timetable_generated',
                    title=title,
                    message=get_notification_message('timetable_generated_notification', lang, week=1),
                    created_by=request.user,
                    extra_data={
                        'academic_year': academic_year.name,
                        'term': term.name,
                        'entries_count': len(entries),
                    },
                    action_url='/app/timetable',
                    priority='medium',
                )
                
                notified = set()
                for e in entries:
                    if e.teacher.user_id not in notified:
                        NotificationService.create_academic_notification(
                            user=e.teacher.user,
                            notification_type='timetable_generated',
                            title=title,
                            message=get_notification_message('timetable_generated_notification', lang, week=1),
                            created_by=request.user,
                            extra_data={},
                            action_url='/app/teacher/timetable',
                            priority='high',
                        )
                        notified.add(e.teacher.user_id)
                        print(f"[NOTIFICATION_SENT] to teacher_id={e.teacher.user_id}")
            except Exception as e:
                print_error(f"Notification failed: {str(e)}", e)

            return _ok(
                {
                    'total_entries': len(entries),
                    'conflicts': conflicts,
                    'conflicts_count': len(conflicts),
                    'academic_year': academic_year.name,
                    'term': term.name,
                },
                get_translation('timetable_generate_success', lang, week=1),
            )
            
        except Exception as e:
            print_error(f"Error generating timetable: {str(e)}", e)
            return _err(get_translation('timetable_generate_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in generate_timetable: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_request_response
def get_teacher_timetable(request, teacher_id=None):
    lang = get_lang(request)

    try:
        academic_year_id = request.query_params.get('academic_year')
        term_id = request.query_params.get('term')
        day_filter = request.query_params.get('day')
        url_teacher_id = teacher_id or request.query_params.get('teacher_id')

        try:
            if academic_year_id:
                academic_year = AcademicYear.objects.get(id=academic_year_id)
                print(f"[ACADEMIC_YEAR] id={academic_year.id}, name={academic_year.name}")
            else:
                academic_year = AcademicYear.objects.filter(is_current=True).first()
                if not academic_year:
                    return _ok({
                        'timetables': [], 'academic_year': None, 'term': None,
                        'days_of_week': _day_names(),
                        'message': 'No current academic year. Please select one.',
                    }, get_translation('academic_year_not_found', lang))
        except AcademicYear.DoesNotExist:
            return _err(get_translation('academic_year_not_found', lang), status.HTTP_404_NOT_FOUND)

        try:
            if term_id:
                term = Term.objects.get(id=term_id, academic_year=academic_year)
                print(f"[TERM] id={term.id}, name={term.name}")
            else:
                term = Term.objects.filter(academic_year=academic_year, is_current=True).first()
                if not term:
                    return _ok({
                        'timetables': [],
                        'academic_year': {'id': academic_year.id, 'name': academic_year.name},
                        'term': None,
                        'days_of_week': _day_names(),
                        'message': 'No current term. Please select one.',
                    }, get_translation('term_not_found', lang))
        except Term.DoesNotExist:
            return _err(get_translation('term_not_found', lang), status.HTTP_404_NOT_FOUND)

        if is_admin(request.user):
            if url_teacher_id:
                try:
                    teachers = [Teacher.objects.get(id=url_teacher_id)]
                    print(f"[TEACHER_FILTER] id={url_teacher_id}")
                except Teacher.DoesNotExist:
                    return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)
            else:
                teachers = list(Teacher.objects.filter(status='active'))
                print(f"[TEACHERS_COUNT] {len(teachers)} active teachers")
        else:
            if not is_teacher(request.user):
                return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
            try:
                teachers = [Teacher.objects.get(user=request.user)]
            except Teacher.DoesNotExist:
                return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)

        days = _day_names()
        all_timetables = []

        for teacher in teachers:
            try:
                qs = TeacherTimetable.objects.filter(
                    teacher=teacher, term=term, academic_year=academic_year
                ).order_by('day_of_week', 'start_time')

                if day_filter is not None:
                    try:
                        qs = qs.filter(day_of_week=int(day_filter))
                        print(f"[DAY_FILTER] {day_filter}")
                    except ValueError:
                        pass

                serializer = TeacherTimetableSerializer(qs, many=True)
                grouped = {d: [] for d in days}
                for entry in serializer.data:
                    d_name = days[entry['day_of_week']] if entry['day_of_week'] < len(days) else str(entry['day_of_week'])
                    grouped[d_name].append(entry)

                total_mins = sum(e['duration_minutes'] for e in serializer.data if e.get('duration_minutes'))
                all_timetables.append({
                    'teacher': TeacherSerializer(teacher, context={'request': request}).data,
                    'timetable': grouped,
                    'total_weekly_hours': round(total_mins / 60, 1),
                    'total_entries': len(serializer.data),
                })
            except Exception as e:
                print_error(f"Error processing teacher {teacher.id}: {str(e)}", e)

        result = {
            'timetables': all_timetables,
            'academic_year': {'id': academic_year.id, 'name': academic_year.name},
            'term': {'id': term.id, 'name': term.name},
            'days_of_week': days,
        }

        if is_admin(request.user) and not url_teacher_id:
            total_t = len(teachers)
            with_tt = sum(1 for t in all_timetables if t['total_entries'] > 0)
            total_e = sum(t['total_entries'] for t in all_timetables)
            result['summary'] = {
                'total_teachers': total_t,
                'teachers_with_timetable': with_tt,
                'teachers_without_timetable': total_t - with_tt,
                'total_timetable_entries': total_e,
                'average_entries_per_teacher': round(total_e / total_t, 1) if total_t else 0,
            }

        return _ok(result, get_translation('timetable_retrieved', lang))

    except Exception as e:
        print_error(f"Unhandled error in get_teacher_timetable: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_request_response
def export_teacher_timetable(request, teacher_id=None):
    lang = get_lang(request)
    
    try:
        academic_year_id = request.query_params.get('academic_year')
        term_id = request.query_params.get('term')

        if teacher_id:
            if not is_admin(request.user):
                return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)
            try:
                teacher = Teacher.objects.get(id=teacher_id)
                print(f"[TEACHER_FOUND] id={teacher.id}, name={teacher.full_name}")
            except Teacher.DoesNotExist:
                return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)
        else:
            if not is_teacher(request.user):
                return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
            try:
                teacher = Teacher.objects.get(user=request.user)
            except Teacher.DoesNotExist:
                return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)

        try:
            if academic_year_id:
                academic_year = AcademicYear.objects.get(id=academic_year_id)
            else:
                academic_year = AcademicYear.objects.filter(is_current=True).first()
                if not academic_year:
                    return _err('No current academic year found')
        except AcademicYear.DoesNotExist:
            return _err(get_translation('academic_year_not_found', lang), status.HTTP_404_NOT_FOUND)

        try:
            if term_id:
                term = Term.objects.get(id=term_id, academic_year=academic_year)
            else:
                term = Term.objects.filter(academic_year=academic_year, is_current=True).first()
                if not term:
                    return _err('No current term found')
        except Term.DoesNotExist:
            return _err(get_translation('term_not_found', lang), status.HTTP_404_NOT_FOUND)

        qs = TeacherTimetable.objects.filter(
            teacher=teacher, term=term, academic_year=academic_year
        ).order_by('day_of_week', 'start_time')

        days = _day_names()
        rows = []
        for entry in TeacherTimetableSerializer(qs, many=True).data:
            rows.append({
                'day': days[entry['day_of_week']] if entry['day_of_week'] < len(days) else str(entry['day_of_week']),
                'start_time': entry['start_time'],
                'end_time': entry['end_time'],
                'duration_minutes': entry['duration_minutes'],
                'subject': entry['subject_name'],
                'class_level': entry['class_level_name'],
                'classroom': entry['classroom_name'],
                'school_level': entry['school_level_name'],
            })

        data = {
            'teacher': TeacherSerializer(teacher, context={'request': request}).data,
            'academic_year': academic_year.name,
            'term': term.name,
            'generated_on': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            'timetable': rows,
        }
        
        return _ok(data, get_translation('timetable_exported', lang))

    except Exception as e:
        print_error(f"Unhandled error in export_teacher_timetable: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Teacher report
# ---------------------------------------------------------------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_request_response
def teacher_report(request):
    lang = get_lang(request)
    
    try:
        if not is_admin(request.user):
            return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

        try:
            academic_year_id = request.query_params.get('academic_year')
            term_id = request.query_params.get('term')

            academic_year = (
                AcademicYear.objects.get(id=academic_year_id)
                if academic_year_id
                else AcademicYear.objects.filter(is_current=True).first()
            )
            
            term = None
            if academic_year:
                term = (
                    Term.objects.get(id=term_id, academic_year=academic_year)
                    if term_id
                    else Term.objects.filter(academic_year=academic_year, is_current=True).first()
                )

            total = Teacher.objects.count()
            active = Teacher.objects.filter(status='active').count()
            
            report = {
                'summary': {
                    'total_teachers': total,
                    'active_teachers': active,
                    'inactive_teachers': Teacher.objects.filter(status='inactive').count(),
                    'on_leave_teachers': Teacher.objects.filter(status='on_leave').count(),
                    'active_percentage': round(active / total * 100, 1) if total else 0,
                },
                'gender_distribution': {
                    g: Teacher.objects.filter(gender=g).count()
                    for g in ('male', 'female', 'other')
                },
                'education_distribution': {
                    str(label): Teacher.objects.filter(education_level=code).count()
                    for code, label in Teacher.EducationLevel.choices
                    if Teacher.objects.filter(education_level=code).exists()
                },
            }

            if academic_year and term:
                active_assignments = TeacherAssignment.objects.filter(
                    academic_year=academic_year, term=term, status='active'
                )
                teachers_with_asn = active_assignments.values('teacher').distinct().count()
                report['assignment_stats'] = {
                    'total_assignments': active_assignments.count(),
                    'teachers_with_assignments': teachers_with_asn,
                    'teachers_without_assignments': active - teachers_with_asn,
                    'timetable_entries': TeacherTimetable.objects.filter(
                        academic_year=academic_year, term=term
                    ).count(),
                }
                report['academic_year'] = {'id': academic_year.id, 'name': academic_year.name}
                report['term'] = {'id': term.id, 'name': term.name}

            from django.db.models import Count
            top_spec = Subject.objects.annotate(
                tc=Count('specialized_teachers')
            ).filter(tc__gt=0).order_by('-tc')[:10]
            report['top_specializations'] = [
                {'subject': s.name, 'teacher_count': s.tc} for s in top_spec
            ]

            return _ok(report, get_translation('report_generated', lang))
            
        except Exception as e:
            print_error(f"Error generating report: {str(e)}", e)
            return _err(get_translation('database_error', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in teacher_report: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Holidays
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@log_request_response
def holiday_list_create(request):
    lang = get_lang(request)

    try:
        if request.method == 'GET':
            try:
                qs = Holiday.objects.select_related('school_level', 'academic_year')
                filters = []
                
                for param, field in [
                    ('academic_year', 'academic_year_id'),
                    ('school_level', 'school_level_id'),
                ]:
                    val = request.query_params.get(param)
                    if val:
                        qs = qs.filter(**{field: val})
                        filters.append(f"{param}={val}")
                
                is_rec = request.query_params.get('is_recurring')
                if is_rec is not None:
                    qs = qs.filter(is_recurring=is_rec.lower() == 'true')
                    filters.append(f"is_recurring={is_rec}")
                
                start = request.query_params.get('start_date')
                if start:
                    qs = qs.filter(date__gte=start)
                    filters.append(f"start_date={start}")
                
                end = request.query_params.get('end_date')
                if end:
                    qs = qs.filter(date__lte=end)
                    filters.append(f"end_date={end}")
                
                if filters:
                    print(f"[FILTERS] {', '.join(filters)}")
                
                serializer = HolidaySerializer(qs, many=True)
                return _ok(serializer.data, get_translation('holidays_retrieved', lang))
                
            except Exception as e:
                print_error(f"Error in GET holiday_list_create: {str(e)}", e)
                return _err(get_translation('database_error', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # POST method
        try:
            if not is_admin(request.user):
                return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

            serializer = HolidaySerializer(data=request.data)
            if not serializer.is_valid():
                print(f"[VALIDATION_ERRORS] {serializer.errors}")
                return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")
            
            with transaction.atomic():
                holiday = serializer.save()
                print(f"[HOLIDAY_CREATED] id={holiday.id}, name={holiday.name}, date={holiday.date}")
            
            return _ok(
                serializer.data,
                get_translation('holiday_create_success', lang, name=holiday.name),
                status.HTTP_201_CREATED,
            )
            
        except Exception as e:
            print_error(f"Error in POST holiday_list_create: {str(e)}", e)
            return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in holiday_list_create: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@log_request_response
def holiday_detail(request, pk):
    lang = get_lang(request)
    
    try:
        holiday = Holiday.objects.get(id=pk)
        print(f"[HOLIDAY_FOUND] id={holiday.id}, name={holiday.name}")
    except Holiday.DoesNotExist:
        return _err(get_translation('holiday_not_found', lang), status.HTTP_404_NOT_FOUND)

    try:
        if request.method == 'GET':
            serializer = HolidaySerializer(holiday)
            return _ok(serializer.data, get_translation('holiday_retrieved', lang))

        if not is_admin(request.user):
            return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

        if request.method == 'PUT':
            try:
                serializer = HolidaySerializer(holiday, data=request.data, partial=True)
                if not serializer.is_valid():
                    print(f"[VALIDATION_ERRORS] {serializer.errors}")
                    return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")
                
                with transaction.atomic():
                    updated = serializer.save()
                    print(f"[HOLIDAY_UPDATED] id={pk}, name={updated.name}")
                
                return _ok(serializer.data, get_translation('holiday_update_success', lang, name=updated.name))
                
            except Exception as e:
                print_error(f"Error in PUT holiday_detail: {str(e)}", e)
                return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # DELETE method
        try:
            name = holiday.name
            holiday.delete()
            print(f"[HOLIDAY_DELETED] id={pk}, name={name}")
            return _ok(message=get_translation('holiday_delete_success', lang, name=name))
            
        except Exception as e:
            print_error(f"Error in DELETE holiday_detail: {str(e)}", e)
            return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in holiday_detail: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
@log_request_response
def holiday_delete(request, pk):
    lang = get_lang(request)
    
    try:
        holiday = Holiday.objects.get(id=pk)
        print(f"[HOLIDAY_FOUND] id={holiday.id}, name={holiday.name}")
    except Holiday.DoesNotExist:
        return _err(get_translation('holiday_not_found', lang), status.HTTP_404_NOT_FOUND)

    try:
        if not is_admin(request.user):
            return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

        name = holiday.name
        holiday.delete()
        print(f"[HOLIDAY_DELETED] id={pk}, name={name}")
        return _ok(message=get_translation('holiday_delete_success', lang, name=name))
        
    except Exception as e:
        print_error(f"Error in holiday_delete: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# School Day Settings
# ---------------------------------------------------------------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
@log_request_response
def day_setting_list_create(request):
    lang = get_lang(request)

    try:
        if request.method == 'GET':
            try:
                qs = SchoolDaySetting.objects.select_related('academic_year')
                filters = []
                
                for param, field in [
                    ('academic_year', 'academic_year_id'),
                    ('day_of_week', 'weekday'),
                    ('day_type', 'day_type'),
                ]:
                    val = request.query_params.get(param)
                    if val:
                        qs = qs.filter(**{field: val})
                        filters.append(f"{param}={val}")
                
                if filters:
                    print(f"[FILTERS] {', '.join(filters)}")
                
                serializer = SchoolDaySettingSerializer(qs, many=True)
                return _ok(serializer.data, get_translation('day_settings_retrieved', lang))
                
            except Exception as e:
                print_error(f"Error in GET day_setting_list_create: {str(e)}", e)
                return _err(get_translation('database_error', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # POST method
        try:
            if not is_admin(request.user):
                return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

            serializer = SchoolDaySettingSerializer(data=request.data)
            if not serializer.is_valid():
                print(f"[VALIDATION_ERRORS] {serializer.errors}")
                return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")
            
            with transaction.atomic():
                setting = serializer.save()
                print(f"[DAY_SETTING_CREATED] id={setting.id}")
            
            return _ok(
                serializer.data,
                get_translation('day_setting_create_success', lang),
                status.HTTP_201_CREATED,
            )
            
        except Exception as e:
            print_error(f"Error in POST day_setting_list_create: {str(e)}", e)
            return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in day_setting_list_create: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
@log_request_response
def day_setting_detail(request, pk):
    lang = get_lang(request)
    
    try:
        setting = SchoolDaySetting.objects.get(id=pk)
        print(f"[DAY_SETTING_FOUND] id={setting.id}")
    except SchoolDaySetting.DoesNotExist:
        return _err(get_translation('day_setting_not_found', lang), status.HTTP_404_NOT_FOUND)

    try:
        if request.method == 'GET':
            serializer = SchoolDaySettingSerializer(setting)
            return _ok(serializer.data, get_translation('day_setting_retrieved', lang))

        if not is_admin(request.user):
            return _err(get_translation('admin_access_required', lang), status.HTTP_403_FORBIDDEN)

        if request.method == 'PUT':
            try:
                serializer = SchoolDaySettingSerializer(setting, data=request.data, partial=True)
                if not serializer.is_valid():
                    print(f"[VALIDATION_ERRORS] {serializer.errors}")
                    return _err(f"Validation failed: {', '.join([str(v) for v in serializer.errors.values()])}")
                
                serializer.save()
                print(f"[DAY_SETTING_UPDATED] id={pk}")
                return _ok(serializer.data, get_translation('day_setting_update_success', lang))
                
            except Exception as e:
                print_error(f"Error in PUT day_setting_detail: {str(e)}", e)
                return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

        # DELETE method
        try:
            setting.delete()
            print(f"[DAY_SETTING_DELETED] id={pk}")
            return _ok(message=get_translation('day_setting_delete_success', lang))
            
        except Exception as e:
            print_error(f"Error in DELETE day_setting_detail: {str(e)}", e)
            return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)

    except Exception as e:
        print_error(f"Unhandled error in day_setting_detail: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# Add this to teachers/views.py

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_request_response
def get_my_teaching_assignments(request):
    """
    Get all teaching assignments for the logged-in teacher.
    Returns unique school levels, class levels, and classrooms.
    """
    lang = get_lang(request)
    
    try:
        if not is_teacher(request.user):
            return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
        
        try:
            teacher = Teacher.objects.get(user=request.user)
            print(f"[GET_MY_TEACHING_ASSIGNMENTS] Teacher: {teacher.full_name} (ID: {teacher.id})")
        except Teacher.DoesNotExist:
            return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)
        
        # Get all active assignments for this teacher
        assignments = TeacherAssignment.objects.filter(
            teacher=teacher,
            status='active'
        ).select_related(
            'school_level', 'class_level', 'subject', 'academic_year', 'term'
        ).prefetch_related('classrooms')
        
        print(f"[GET_MY_TEACHING_ASSIGNMENTS] Found {assignments.count()} assignments")
        
        # Build unique sets
        school_levels = {}
        class_levels = {}
        classrooms = {}
        subjects = {}
        
        for assignment in assignments:
            # School levels
            if assignment.school_level:
                school_levels[assignment.school_level.id] = {
                    'id': assignment.school_level.id,
                    'name': assignment.school_level.name,
                }
                print(f"  - School level: {assignment.school_level.name}")
            
            # Class levels (with school level reference)
            if assignment.class_level:
                class_levels[assignment.class_level.id] = {
                    'id': assignment.class_level.id,
                    'name': assignment.class_level.name,
                    'school_level_id': assignment.school_level.id if assignment.school_level else None,
                }
                print(f"  - Class level: {assignment.class_level.name}")
            
            # Subjects
            if assignment.subject:
                subjects[assignment.subject.id] = {
                    'id': assignment.subject.id,
                    'name': assignment.subject.name,
                    'code': assignment.subject.code,
                }
                print(f"  - Subject: {assignment.subject.name}")
            
            # Classrooms from M2M
            for classroom in assignment.classrooms.all():
                if classroom.status == 'active':
                    classrooms[classroom.id] = {
                        'id': classroom.id,
                        'name': classroom.name,
                        'code': classroom.code,
                        'class_level_id': assignment.class_level.id if assignment.class_level else None,
                        'capacity': classroom.capacity,
                        'room_type': classroom.get_room_type_display(),
                    }
                    print(f"  - Classroom: {classroom.name} (via assignment)")
        
        # Also get timetable entries for additional classroom assignments
        timetable_entries = TeacherTimetable.objects.filter(
            teacher=teacher,
       
        ).select_related('classroom', 'class_level', 'school_level').distinct()
        
        print(f"[GET_MY_TEACHING_ASSIGNMENTS] Found {timetable_entries.count()} timetable entries")
        
        for entry in timetable_entries:
            if entry.classroom and entry.classroom.status == 'active':
                classrooms[entry.classroom.id] = {
                    'id': entry.classroom.id,
                    'name': entry.classroom.name,
                    'code': entry.classroom.code,
                    'class_level_id': entry.class_level.id if entry.class_level else None,
                    'capacity': entry.classroom.capacity,
                    'room_type': entry.classroom.get_room_type_display(),
                }
                print(f"  - Classroom: {entry.classroom.name} (via timetable)")
            
            if entry.school_level:
                school_levels[entry.school_level.id] = {
                    'id': entry.school_level.id,
                    'name': entry.school_level.name,
                }
            
            if entry.class_level:
                class_levels[entry.class_level.id] = {
                    'id': entry.class_level.id,
                    'name': entry.class_level.name,
                    'school_level_id': entry.school_level.id if entry.school_level else None,
                }
        
        result = {
            'teacher': {
                'id': teacher.id,
                'full_name': teacher.full_name,
                'email': teacher.email,
                'phone_number': teacher.phone_number,
            },
            'school_levels': list(school_levels.values()),
            'class_levels': list(class_levels.values()),
            'classrooms': list(classrooms.values()),
            'subjects': list(subjects.values()),
            'stats': {
                'total_assignments': assignments.count(),
                'total_school_levels': len(school_levels),
                'total_class_levels': len(class_levels),
                'total_classrooms': len(classrooms),
            }
        }
        
        print(f"[GET_MY_TEACHING_ASSIGNMENTS] Response: {len(school_levels)} school levels, {len(class_levels)} class levels, {len(classrooms)} classrooms")
        return _ok(result, get_translation('assignments_retrieved', lang))
        
    except Exception as e:
        print_error(f"Error in get_my_teaching_assignments: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)   
    
    
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_request_response
def get_my_students(request):
    """
    Get all students taught by the logged-in teacher.
    Returns students from all classrooms the teacher is assigned to.
    """
    lang = get_lang(request)
    
    try:
        if not is_teacher(request.user):
            return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
        
        try:
            teacher = Teacher.objects.get(user=request.user)
            print(f"[TEACHER_FOUND] id={teacher.id}, name={teacher.full_name}")
        except Teacher.DoesNotExist:
            return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)
        
        # Get current academic year
        current_academic_year = AcademicYear.objects.filter(is_current=True).first()
        if not current_academic_year:
            current_academic_year = AcademicYear.objects.order_by('-start_date').first()
        
        # Get all classrooms the teacher is assigned to (via assignments or timetable)
        teacher_classrooms = set()
        
        # From assignments
        assignments = TeacherAssignment.objects.filter(
            teacher=teacher,
            status='active'
        ).prefetch_related('classrooms')
        
        for assignment in assignments:
            for classroom in assignment.classrooms.all():
                if classroom.status == 'active':
                    teacher_classrooms.add(classroom.id)
        
        # From timetable
        timetable_entries = TeacherTimetable.objects.filter(
            teacher=teacher,
            status='active'
        ).select_related('classroom')
        
        for entry in timetable_entries:
            if entry.classroom and entry.classroom.status == 'active':
                teacher_classrooms.add(entry.classroom.id)
        
        if not teacher_classrooms:
            return _ok({
                'students': [],
                'total': 0,
                'teacher': {'id': teacher.id, 'full_name': teacher.full_name},
                'message': 'No classrooms assigned to this teacher.'
            }, get_translation('no_classrooms_assigned', lang))
        
        # Get students in these classrooms
        from students.models import Student, StudentClassroomAssignment
        from students.serializers import StudentListSerializer
        
        classroom_assignments = StudentClassroomAssignment.objects.filter(
            classroom_id__in=teacher_classrooms,
            status='active'
        ).select_related(
            'student',
            'student__user',
            'student__current_academic_year',
            'student__current_school_level',
            'student__current_class_level',
            'classroom'
        ).prefetch_related('student__parents')
        
        # Deduplicate students (a student may appear in multiple classrooms)
        students_map = {}
        for ca in classroom_assignments:
            student = ca.student
            if student.id not in students_map:
                # Add classroom info to student object
                student.current_classroom = {
                    'id': ca.classroom.id,
                    'name': ca.classroom.name,
                    'code': ca.classroom.code,
                }
                students_map[student.id] = student
        
        students = list(students_map.values())
        
        # Apply filters
        school_level_id = request.query_params.get('school_level_id')
        if school_level_id:
            students = [s for s in students if s.current_school_level and str(s.current_school_level.id) == school_level_id]
        
        class_level_id = request.query_params.get('class_level_id')
        if class_level_id:
            students = [s for s in students if s.current_class_level and str(s.current_class_level.id) == class_level_id]
        
        classroom_id = request.query_params.get('classroom_id')
        if classroom_id:
            students = [s for s in students if s.current_classroom and str(s.current_classroom.get('id')) == classroom_id]
        
        status_filter = request.query_params.get('status')
        if status_filter:
            students = [s for s in students if s.status == status_filter]
        
        search = request.query_params.get('search')
        if search:
            search_lower = search.lower()
            students = [
                s for s in students
                if search_lower in s.full_name.lower()
                or search_lower in s.roll_number.lower()
                or (s.email and search_lower in s.email.lower())
            ]
        
        # Serialize
        from students.serializers import StudentListSerializer
        serializer = StudentListSerializer(students, many=True, context={'request': request})
        
        result = {
            'students': serializer.data,
            'total': len(students),
            'teacher': {
                'id': teacher.id,
                'full_name': teacher.full_name,
            },
            'filters_applied': {
                'school_level_id': school_level_id,
                'class_level_id': class_level_id,
                'classroom_id': classroom_id,
                'status': status_filter,
                'search': search,
            }
        }
        
        print(f"[MY_STUDENTS] teacher={teacher.full_name}, total_students={len(students)}")
        return _ok(result, get_translation('students_retrieved', lang))
        
    except Exception as e:
        print_error(f"Error in get_my_students: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
    
    
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_request_response
def get_classroom_students(request, classroom_id):
    """
    Get all students in a specific classroom.
    Teacher must be assigned to this classroom.
    """
    lang = get_lang(request)
    
    try:
        if not is_teacher(request.user):
            return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
        
        try:
            teacher = Teacher.objects.get(user=request.user)
        except Teacher.DoesNotExist:
            return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)
        
        # Verify classroom exists
        try:
            classroom = ClassRoom.objects.get(id=classroom_id)
            print(f"[CLASSROOM_FOUND] id={classroom.id}, name={classroom.name}")
        except ClassRoom.DoesNotExist:
            return _err(get_translation('classroom_not_found', lang), status.HTTP_404_NOT_FOUND)
        
        # Verify teacher is assigned to this classroom
        is_assigned = False
        
        # Check assignments
        if TeacherAssignment.objects.filter(
            teacher=teacher,
            classrooms=classroom,
            status='active'
        ).exists():
            is_assigned = True
        
        # Check timetable
        if not is_assigned and TeacherTimetable.objects.filter(
            teacher=teacher,
            classroom=classroom,
            status='active'
        ).exists():
            is_assigned = True
        
        if not is_assigned:
            return _err(get_translation('not_assigned_to_classroom', lang), status.HTTP_403_FORBIDDEN)
        
        # Get current academic year
        current_academic_year = AcademicYear.objects.filter(is_current=True).first()
        if not current_academic_year:
            current_academic_year = AcademicYear.objects.order_by('-start_date').first()
        
        # Get students in this classroom
        from students.models import StudentClassroomAssignment
        from students.serializers import StudentListSerializer
        
        assignments = StudentClassroomAssignment.objects.filter(
            classroom=classroom,
            status='active'
        ).select_related(
            'student',
            'student__user',
            'student__current_academic_year',
            'student__current_school_level',
            'student__current_class_level',
        )
        
        students = []
        for ca in assignments:
            student = ca.student
            student.current_classroom = {
                'id': classroom.id,
                'name': classroom.name,
                'code': classroom.code,
            }
            students.append(student)
        
        # Apply filters
        status_filter = request.query_params.get('status')
        if status_filter:
            students = [s for s in students if s.status == status_filter]
        
        search = request.query_params.get('search')
        if search:
            search_lower = search.lower()
            students = [
                s for s in students
                if search_lower in s.full_name.lower()
                or search_lower in s.roll_number.lower()
                or (s.email and search_lower in s.email.lower())
            ]
        
        # Serialize
        serializer = StudentListSerializer(students, many=True, context={'request': request})
        
        result = {
            'classroom': {
                'id': classroom.id,
                'name': classroom.name,
                'code': classroom.code,
                'capacity': classroom.capacity,
                'room_type': classroom.get_room_type_display(),
            },
            'students': serializer.data,
            'total': len(students),
            'total_capacity': classroom.capacity,
            'available_spots': classroom.capacity - len(students),
        }
        
        print(f"[CLASSROOM_STUDENTS] classroom={classroom.name}, students={len(students)}")
        return _ok(result, get_translation('students_retrieved', lang))
        
    except Exception as e:
        print_error(f"Error in get_classroom_students: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
    
    
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_request_response
def teacher_get_student_detail(request, student_id):
    """
    Get detailed student information including parents and current classroom.
    Teacher must be assigned to teach this student.
    """
    lang = get_lang(request)
    
    try:
        if not is_teacher(request.user):
            return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
        
        try:
            teacher = Teacher.objects.get(user=request.user)
        except Teacher.DoesNotExist:
            return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)
        
        # Get student
        from students.models import Student, StudentClassroomAssignment, Parent
        from students.serializers import StudentDetailSerializer
        
        try:
            student = Student.objects.get(id=student_id)
            print(f"[STUDENT_FOUND] id={student.id}, name={student.full_name}")
        except Student.DoesNotExist:
            return _err(get_translation('student_not_found', lang), status.HTTP_404_NOT_FOUND)
        
        # Verify teacher teaches this student
        # Get student's current classroom
        classroom_assignment = StudentClassroomAssignment.objects.filter(
            student=student,
            status='active'
        ).select_related('classroom').first()
        
        if classroom_assignment:
            classroom = classroom_assignment.classroom
            
            # Check if teacher is assigned to this classroom
            is_assigned = TeacherAssignment.objects.filter(
                teacher=teacher,
                classrooms=classroom,
                status='active'
            ).exists() or TeacherTimetable.objects.filter(
                teacher=teacher,
                classroom=classroom,
                status='active'
            ).exists()
            
            if not is_assigned:
                return _err(get_translation('not_authorized_to_view_student', lang), status.HTTP_403_FORBIDDEN)
        else:
            # If student has no classroom, check if teacher teaches any subject at student's class level
            if student.current_class_level:
                is_assigned = TeacherAssignment.objects.filter(
                    teacher=teacher,
                    class_level=student.current_class_level,
                    status='active'
                ).exists()
                
                if not is_assigned:
                    return _err(get_translation('not_authorized_to_view_student', lang), status.HTTP_403_FORBIDDEN)
            else:
                return _err(get_translation('not_authorized_to_view_student', lang), status.HTTP_403_FORBIDDEN)
        
        # Get student's parents
        parents = Parent.objects.filter(students__id=student.id).select_related('user')
        from students.serializers import ParentMinimalSerializer
        
        # Get current classroom details
        current_classroom = None
        if classroom_assignment:
            current_classroom = {
                'id': classroom_assignment.classroom.id,
                'name': classroom_assignment.classroom.name,
                'code': classroom_assignment.classroom.code,
                'capacity': classroom_assignment.classroom.capacity,
                'room_type': classroom_assignment.classroom.get_room_type_display(),
            }
        
        result = {
            'student': StudentDetailSerializer(student, context={'request': request}).data,
            'parents': ParentMinimalSerializer(parents, many=True).data,
            'current_classroom': current_classroom,
            'total_parents': parents.count(),
        }
        
        print(f"[TEACHER_STUDENT_DETAIL] teacher={teacher.full_name}, student={student.full_name}")
        return _ok(result, get_translation('student_details_retrieved', lang))
        
    except Exception as e:
        print_error(f"Error in teacher_get_student_detail: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    
    
    
# Add this function to teachers/views.py

@api_view(['GET'])
@permission_classes([IsAuthenticated])
@log_request_response
def teacher_me(request):
    """
    Alias for teacher_profile - returns current teacher's profile.
    This endpoint matches the frontend expectation of /teachers/me/
    """
    lang = get_lang(request)
    
    try:
        if not is_teacher(request.user):
            return _err(get_translation('teacher_access_required', lang), status.HTTP_403_FORBIDDEN)
        
        try:
            teacher = Teacher.objects.get(user=request.user)
            print(f"[TEACHER_ME] Found teacher: {teacher.full_name} (ID: {teacher.id})")
        except Teacher.DoesNotExist:
            return _err(get_translation('teacher_not_found', lang), status.HTTP_404_NOT_FOUND)
        
        serializer = TeacherSerializer(teacher, context={'request': request})
        
        response_data = {
            'id': teacher.id,
            'full_name': teacher.full_name,
            'first_name': teacher.first_name,
            'last_name': teacher.last_name,
            'email': teacher.email,
            'phone_number': teacher.phone_number,
            'status': teacher.status,
            'user': {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'role': request.user.role,
            }
        }
        
        print(f"[TEACHER_ME] Response data: {response_data}")
        return _ok(response_data, get_translation('profile_retrieved', lang))
        
    except Exception as e:
        print_error(f"Error in teacher_me: {str(e)}", e)
        return _err(get_translation('operation_failed', lang), status.HTTP_500_INTERNAL_SERVER_ERROR)


# ---------------------------------------------------------------------------
# Utility
# ---------------------------------------------------------------------------

def _day_names():
    return ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
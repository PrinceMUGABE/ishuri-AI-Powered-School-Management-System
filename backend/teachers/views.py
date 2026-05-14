from datetime import date, datetime, timedelta
import traceback
import re
import os
from decimal import Decimal

from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.contrib.auth import authenticate
from django.core.files.base import ContentFile
from django.db import models as django_models
from django.db import models

from .models import (
    Teacher, TeacherDocument, TeacherAssignment, TeacherTimetable
)
from .serializers import (
    TeacherSerializer, TeacherCreateSerializer, TeacherProfileUpdateSerializer,
    TeacherDocumentSerializer, TeacherAssignmentSerializer, TeacherTimetableSerializer,
    ChangePasswordSerializer, HolidaySerializer, SchoolDaySettingSerializer
)
from .translations import get_translation, get_notification_title, get_notification_message
from .services import create_teacher_user_account, generate_username, send_teacher_welcome_email, generate_password
from academics.models import AcademicYear, SchoolLevel, ClassLevel, Subject, ClassRoom, Term, SchoolBreak, SchoolDaySetting
from notifications.services import NotificationService
from accounts.models import User


def is_admin(user):
    """Check if user is admin"""
    return user.is_authenticated and user.role == 'admin'


def is_teacher(user):
    """Check if user is teacher"""
    return user.is_authenticated and user.role == 'teacher'


def get_request_language(request):
    """Extract language from request headers"""
    lang = request.headers.get('X-Language', 'en')
    if lang not in ['en', 'fr', 'rw']:
        lang = 'en'
    return lang


def log_request(view_name, request, extra_data=None):
    """Log request details for debugging"""
    print("\n" + "="*80)
    print(f"  ▶  REQUEST  |  {view_name}  |  {request.method}")
    print("="*80)
    print(f"  User       : {request.user} (ID: {getattr(request.user, 'id', 'N/A')}, Role: {getattr(request.user, 'role', 'N/A')})")
    print(f"  Path       : {request.path}")
    print(f"  Method     : {request.method}")
    print(f"  Language   : {get_request_language(request)}")
    
    if request.query_params:
        print(f"  Query Params: {dict(request.query_params)}")
    
    if request.data and request.data != {}:
        safe_data = {}
        for k, v in request.data.items():
            if 'password' in k.lower() or 'token' in k.lower() or 'confirm' in k.lower():
                safe_data[k] = '***'
            elif isinstance(v, str) and len(v) > 100:
                safe_data[k] = v[:100] + '...'
            else:
                safe_data[k] = v
        print(f"  Body       : {safe_data}")
    
    if extra_data:
        for key, value in extra_data.items():
            print(f"  {key} : {value}")
    
    print("-"*80)


def log_response(view_name, status_code, message, data=None, error=None):
    """Log response details for debugging"""
    symbol = "✔" if status_code < 400 else "✘"
    print(f"\n  {symbol}  RESPONSE |  {view_name}  |  HTTP {status_code}")
    print(f"  Message    : {message}")
    if data:
        print(f"  Data       : {data if isinstance(data, str) else 'Data returned'}")
    if error:
        print(f"  Error      : {error}")
    print("="*80 + "\n")


def log_error(view_name, step, error, lang='en', error_type="ERROR"):
    """Log error details with translation support"""
    print(f"\n  ✘  {error_type}  |  {view_name}  |  {step}")
    print(f"     Message   : {str(error)}")
    print(f"     Type      : {type(error).__name__}")
    if hasattr(error, '__traceback__') and error.__traceback__:
        print(f"     Line      : {error.__traceback__.tb_lineno}")
        print(f"     Traceback : {traceback.format_exc()}")
    print("-"*80)


def handle_api_exception(e, view_name, step, lang, default_message_key='operation_failed'):
    """Handle exceptions uniformly and return appropriate response"""
    error_msg = str(e)
    status_code = status.HTTP_500_INTERNAL_SERVER_ERROR
    
    if isinstance(e, ValidationError):
        status_code = status.HTTP_400_BAD_REQUEST
        log_error(view_name, step, e, lang, "VALIDATION_ERROR")
    elif isinstance(e, IntegrityError):
        status_code = status.HTTP_400_BAD_REQUEST
        log_error(view_name, step, e, lang, "INTEGRITY_ERROR")
        error_msg = get_translation('integrity_error', lang)
    elif isinstance(e, Teacher.DoesNotExist) or isinstance(e, TeacherAssignment.DoesNotExist):
        status_code = status.HTTP_404_NOT_FOUND
        error_msg = get_translation('teacher_not_found', lang)
    else:
        log_error(view_name, step, e, lang, "UNEXPECTED_ERROR")
        error_msg = get_translation(default_message_key, lang)
    
    return Response({
        'success': False,
        'message': error_msg,
        'error_type': type(e).__name__
    }, status=status_code)


# ==================== TEACHER CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def teacher_list_create(request):
    """List all teachers or create a new teacher"""
    view_name = "TeacherListCreate"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    try:
        if request.method == 'GET':
            try:
                queryset = Teacher.objects.all()
                
                # Apply filters
                status_filter = request.query_params.get('status')
                if status_filter:
                    queryset = queryset.filter(status=status_filter)
                
                search = request.query_params.get('search')
                if search:
                    queryset = queryset.filter(
                        models.Q(first_name__icontains=search) |
                        models.Q(last_name__icontains=search) |
                        models.Q(email__icontains=search) |
                        models.Q(phone_number__icontains=search)
                    )
                
                school_level = request.query_params.get('school_level')
                if school_level:
                    queryset = queryset.filter(assignments__school_level_id=school_level, assignments__status='active').distinct()
                
                serializer = TeacherSerializer(queryset, many=True, context={'request': request})
                log_response(view_name, 200, "Teachers retrieved successfully")
                return Response({'success': True, 'data': serializer.data})
                
            except Exception as e:
                return handle_api_exception(e, view_name, "GET database query", lang, 'database_error')
        
        elif request.method == 'POST':
            # Check admin permissions
            if not is_admin(request.user):
                msg = get_translation('admin_access_required', lang)
                log_response(view_name, 403, msg)
                return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
            
            try:
                print(f"[{view_name}] Validating teacher data...")
                serializer = TeacherCreateSerializer(data=request.data)
                
                if serializer.is_valid():
                    print(f"[{view_name}] Data is valid, creating user account...")
                    
                    with transaction.atomic():
                        # Generate password and create user account
                        password = generate_password()
                        username = generate_username(
                            f"{serializer.validated_data.get('first_name', '')} {serializer.validated_data.get('last_name', '')}"
                        )
                        
                        # Create the user account
                        user = User.objects.create(
                            username=username,
                            email=serializer.validated_data['email'],
                            role='teacher',
                            status='active'
                        )
                        user.set_password(password)
                        user.save()
                        
                        print(f"[{view_name}] User account created: {username}")
                        
                        # Create teacher with the user
                        teacher = Teacher.objects.create(
                            user=user,
                            created_by=request.user,
                            **serializer.validated_data
                        )
                        
                        # Handle specializations if provided
                        if 'specializations_ids' in serializer.validated_data:
                            teacher.specializations.set(serializer.validated_data['specializations_ids'])
                        
                        print(f"[{view_name}] Teacher created successfully: ID={teacher.id}")
                        
                        # Send welcome email
                        email_sent = send_teacher_welcome_email(teacher, password, lang)
                        
                        if not email_sent:
                            print(f"[{view_name}] WARNING: Failed to send welcome email to {teacher.email}")
                    
                    # Create notifications
                    try:
                        # Admin notification
                        admin_title = get_notification_title('teacher_created', lang)
                        admin_message = get_notification_message('teacher_created_notification', lang, name=teacher.full_name)
                        NotificationService.create_academic_notification(
                            user=request.user,
                            notification_type='teacher_created',
                            title=admin_title,
                            message=admin_message,
                            created_by=request.user,
                            extra_data={'teacher_id': teacher.id, 'teacher_name': teacher.full_name},
                            action_url='/app/teachers',
                            priority='medium'
                        )
                        
                        # Teacher notification
                        teacher_title = get_notification_title('teacher_created', lang)
                        teacher_message = get_notification_message('teacher_welcome_notification', lang, name=teacher.full_name)
                        NotificationService.create_academic_notification(
                            user=user,
                            notification_type='teacher_created',
                            title=teacher_title,
                            message=teacher_message,
                            created_by=request.user,
                            extra_data={'teacher_id': teacher.id},
                            action_url='/app/teacher/profile',
                            priority='high'
                        )
                        print(f"[{view_name}] Notifications created successfully")
                    except Exception as e:
                        print(f"[{view_name}] WARNING: Failed to create notifications: {str(e)}")
                    
                    # Prepare response data
                    response_data = TeacherSerializer(teacher, context={'request': request}).data
                    response_data['username'] = user.username
                    if email_sent:
                        response_data['message'] = get_translation('teacher_password_generated', lang, email=teacher.email)
                    else:
                        response_data['warning'] = f"Password: {password}. Could not send email to {teacher.email}"
                    
                    msg = get_translation('teacher_create_success', lang, name=teacher.full_name)
                    log_response(view_name, 201, msg)
                    return Response({'success': True, 'data': response_data, 'message': msg}, status=status.HTTP_201_CREATED)
                else:
                    print(f"[{view_name}] Validation FAILED! Errors: {serializer.errors}")
                    msg = get_translation('validation_failed', lang)
                    return Response({
                        'success': False,
                        'errors': serializer.errors,
                        'message': msg
                    }, status=status.HTTP_400_BAD_REQUEST)
                    
            except IntegrityError as e:
                print(f"[{view_name}] IntegrityError: {str(e)}")
                if 'email' in str(e).lower():
                    return Response({'success': False, 'message': get_translation('email_already_exists', lang)}, status=status.HTTP_400_BAD_REQUEST)
                elif 'phone_number' in str(e).lower():
                    return Response({'success': False, 'message': get_translation('phone_already_exists', lang)}, status=status.HTTP_400_BAD_REQUEST)
                return Response({'success': False, 'message': get_translation('teacher_already_exists', lang)}, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                traceback.print_exc()
                return handle_api_exception(e, view_name, "POST create", lang, 'operation_failed')
    
    except Exception as e:
        traceback.print_exc()
        return handle_api_exception(e, view_name, "main", lang, 'server_error')


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def teacher_detail(request, pk):
    """Get, update or delete a specific teacher"""
    view_name = "TeacherDetail"
    log_request(view_name, request, extra_data={"teacher_id": pk})
    lang = get_request_language(request)
    
    try:
        teacher = get_object_or_404(Teacher, id=pk)
        print(f"[{view_name}] Found teacher: {teacher.full_name}")
    except Exception as e:
        return handle_api_exception(e, view_name, "get_object", lang, 'teacher_not_found')
    
    if request.method == 'GET':
        try:
            # Check if requesting own profile or admin
            if not is_admin(request.user) and request.user.id != teacher.user.id:
                msg = get_translation('teacher_access_required', lang)
                log_response(view_name, 403, msg)
                return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
            
            serializer = TeacherSerializer(teacher, context={'request': request})
            log_response(view_name, 200, "Teacher retrieved successfully")
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return handle_api_exception(e, view_name, "serialization", lang, 'database_error')
    
    elif request.method == 'PUT':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            log_response(view_name, 403, msg)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            print(f"[{view_name}] Update data: {request.data}")
            serializer = TeacherSerializer(teacher, data=request.data, partial=True, context={'request': request})
            
            if serializer.is_valid():
                old_name = teacher.full_name
                with transaction.atomic():
                    updated_teacher = serializer.save()
                
                print(f"[{view_name}] Teacher updated successfully")
                
                # Create notification
                try:
                    title = get_notification_title('teacher_updated', lang)
                    message = get_notification_message('teacher_updated_notification', lang, name=old_name)
                    NotificationService.create_academic_notification(
                        user=request.user,
                        notification_type='teacher_updated',
                        title=title,
                        message=message,
                        created_by=request.user,
                        extra_data={'teacher_id': teacher.id, 'teacher_name': teacher.full_name},
                        action_url=f'/app/teachers/{teacher.id}',
                        priority='low'
                    )
                except Exception as e:
                    print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
                
                msg = get_translation('teacher_update_success', lang, name=old_name)
                log_response(view_name, 200, msg)
                return Response({'success': True, 'data': serializer.data, 'message': msg})
            else:
                print(f"[{view_name}] Validation FAILED! Errors: {serializer.errors}")
                msg = get_translation('validation_failed', lang)
                return Response({'success': False, 'errors': serializer.errors, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)
                
        except IntegrityError as e:
            log_error(view_name, "update_integrity", e, lang)
            if 'email' in str(e).lower():
                return Response({'success': False, 'message': get_translation('email_already_exists', lang)}, status=status.HTTP_400_BAD_REQUEST)
            elif 'phone_number' in str(e).lower():
                return Response({'success': False, 'message': get_translation('phone_already_exists', lang)}, status=status.HTTP_400_BAD_REQUEST)
            return Response({'success': False, 'message': get_translation('integrity_error', lang)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return handle_api_exception(e, view_name, "update", lang, 'operation_failed')
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            log_response(view_name, 403, msg)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            teacher_name = teacher.full_name
            print(f"[{view_name}] Deleting teacher: {teacher_name}")
            
            # Check for active assignments
            if teacher.assignments.filter(status='active').exists():
                msg = get_translation('cannot_delete_has_assignments', lang)
                return Response({'success': False, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)
            
            # Delete associated user account
            user_to_delete = teacher.user
            teacher.delete()
            
            if user_to_delete:
                user_to_delete.delete()
            
            # Create notification
            try:
                title = get_notification_title('teacher_deleted', lang)
                message = get_notification_message('teacher_deleted_notification', lang, name=teacher_name)
                NotificationService.create_academic_notification(
                    user=request.user,
                    notification_type='teacher_deleted',
                    title=title,
                    message=message,
                    created_by=request.user,
                    extra_data={'teacher_name': teacher_name},
                    action_url='/app/teachers',
                    priority='medium'
                )
            except Exception as e:
                print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
            
            msg = get_translation('teacher_delete_success', lang, name=teacher_name)
            log_response(view_name, 200, msg)
            return Response({'success': True, 'message': msg})
            
        except Exception as e:
            return handle_api_exception(e, view_name, "delete", lang, 'operation_failed')


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def teacher_profile(request):
    """Get or update the logged-in teacher's profile"""
    view_name = "TeacherProfile"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if not is_teacher(request.user):
        msg = get_translation('teacher_access_required', lang)
        log_response(view_name, 403, msg)
        return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        teacher = get_object_or_404(Teacher, user=request.user)
    except Exception as e:
        return handle_api_exception(e, view_name, "get_teacher", lang, 'teacher_not_found')
    
    if request.method == 'GET':
        try:
            serializer = TeacherSerializer(teacher, context={'request': request})
            # Add user info to response
            user_data = {
                'id': request.user.id,
                'username': request.user.username,
                'email': request.user.email,
                'role': request.user.role,
                'status': request.user.status,
                'language': request.user.language
            }
            log_response(view_name, 200, "Profile retrieved successfully")
            return Response({
                'success': True, 
                'data': serializer.data,
                'user': user_data
            })
        except Exception as e:
            return handle_api_exception(e, view_name, "serialization", lang, 'database_error')
    
    elif request.method == 'PUT':
        try:
            print(f"[{view_name}] Profile update data: {request.data}")
            serializer = TeacherProfileUpdateSerializer(teacher, data=request.data, partial=True)
            
            if serializer.is_valid():
                with transaction.atomic():
                    updated_teacher = serializer.save()
                
                print(f"[{view_name}] Profile updated successfully")
                
                # Create notification
                try:
                    title = get_notification_title('profile_updated', lang)
                    message = get_notification_message('teacher_profile_updated_notification', lang)
                    NotificationService.create_academic_notification(
                        user=request.user,
                        notification_type='profile_updated',
                        title=title,
                        message=message,
                        created_by=request.user,
                        extra_data={},
                        action_url='/app/teacher/profile',
                        priority='low'
                    )
                except Exception as e:
                    print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
                
                msg = get_translation('profile_update_success', lang)
                log_response(view_name, 200, msg)
                return Response({'success': True, 'data': serializer.data, 'message': msg})
            else:
                print(f"[{view_name}] Validation FAILED! Errors: {serializer.errors}")
                msg = get_translation('validation_failed', lang)
                return Response({'success': False, 'errors': serializer.errors, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return handle_api_exception(e, view_name, "update", lang, 'profile_update_failed')


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def change_password(request):
    """Change teacher's password"""
    view_name = "ChangePassword"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if not is_teacher(request.user) and not is_admin(request.user):
        msg = get_translation('teacher_access_required', lang)
        log_response(view_name, 403, msg)
        return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        serializer = ChangePasswordSerializer(data=request.data)
        
        if serializer.is_valid():
            current_password = serializer.validated_data['current_password']
            new_password = serializer.validated_data['new_password']
            
            # Verify current password
            user = authenticate(username=request.user.username, password=current_password)
            if not user:
                msg = get_translation('current_password_incorrect', lang)
                log_response(view_name, 400, msg)
                return Response({'success': False, 'message': msg}, status=status.HTTP_400_BAD_REQUEST)
            
            # Change password
            request.user.set_password(new_password)
            request.user.save()
            
            print(f"[{view_name}] Password changed successfully for user: {request.user.username}")
            
            # Create notification
            try:
                title = get_notification_title('password_changed', lang)
                message = get_translation('password_change_success', lang)
                NotificationService.create_academic_notification(
                    user=request.user,
                    notification_type='password_changed',
                    title=title,
                    message=message,
                    created_by=request.user,
                    extra_data={},
                    action_url='/app/teacher/profile',
                    priority='high'
                )
            except Exception as e:
                print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
            
            msg = get_translation('password_change_success', lang)
            log_response(view_name, 200, msg)
            return Response({'success': True, 'message': msg})
        else:
            print(f"[{view_name}] Validation FAILED! Errors: {serializer.errors}")
            return Response({'success': False, 'errors': serializer.errors, 'message': get_translation('validation_failed', lang)}, status=status.HTTP_400_BAD_REQUEST)
            
    except Exception as e:
        return handle_api_exception(e, view_name, "change_password", lang, 'password_change_failed')


# ==================== TEACHER DOCUMENTS ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def teacher_documents(request, teacher_id=None):
    """Get documents for a teacher or upload new document"""
    view_name = "TeacherDocuments"
    log_request(view_name, request, extra_data={"teacher_id": teacher_id})
    lang = get_request_language(request)
    
    # Determine which teacher
    if teacher_id:
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        try:
            teacher = get_object_or_404(Teacher, id=teacher_id)
        except Exception as e:
            return handle_api_exception(e, view_name, "get_teacher", lang, 'teacher_not_found')
    else:
        if not is_teacher(request.user):
            msg = get_translation('teacher_access_required', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        teacher = get_object_or_404(Teacher, user=request.user)
    
    if request.method == 'GET':
        try:
            documents = teacher.documents.all()
            serializer = TeacherDocumentSerializer(documents, many=True, context={'request': request})
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return handle_api_exception(e, view_name, "GET documents", lang, 'database_error')
    
    elif request.method == 'POST':
        try:
            serializer = TeacherDocumentSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                with transaction.atomic():
                    document = serializer.save(teacher=teacher)
                
                print(f"[{view_name}] Document uploaded: {document.title}")
                
                msg = get_translation('document_upload_success', lang, title=document.title)
                return Response({'success': True, 'data': serializer.data, 'message': msg}, status=status.HTTP_201_CREATED)
            else:
                return Response({'success': False, 'errors': serializer.errors, 'message': get_translation('validation_failed', lang)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return handle_api_exception(e, view_name, "POST document", lang, 'operation_failed')


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def teacher_document_delete(request, document_id):
    """Delete a teacher document"""
    view_name = "TeacherDocumentDelete"
    log_request(view_name, request, extra_data={"document_id": document_id})
    lang = get_request_language(request)
    
    try:
        document = get_object_or_404(TeacherDocument, id=document_id)
        
        # Check permissions
        if not is_admin(request.user) and document.teacher.user.id != request.user.id:
            msg = get_translation('permission_denied', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        document_title = document.title
        document.delete()
        
        msg = get_translation('document_delete_success', lang)
        log_response(view_name, 200, msg)
        return Response({'success': True, 'message': msg})
        
    except Exception as e:
        return handle_api_exception(e, view_name, "delete", lang, 'operation_failed')


# ==================== TEACHER ASSIGNMENTS ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def assignment_list_create(request):
    """List assignments or create a new assignment"""
    view_name = "AssignmentListCreate"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if request.method == 'GET':
        try:
            queryset = TeacherAssignment.objects.all()
            
            # Apply filters
            teacher_id = request.query_params.get('teacher')
            if teacher_id:
                queryset = queryset.filter(teacher_id=teacher_id)
            
            academic_year = request.query_params.get('academic_year')
            if academic_year:
                queryset = queryset.filter(academic_year_id=academic_year)
            
            term_id = request.query_params.get('term')
            if term_id:
                queryset = queryset.filter(term_id=term_id)
            
            status_filter = request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            serializer = TeacherAssignmentSerializer(queryset, many=True)
            log_response(view_name, 200, "Assignments retrieved successfully")
            return Response({'success': True, 'data': serializer.data})
            
        except Exception as e:
            return handle_api_exception(e, view_name, "GET database query", lang, 'database_error')
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            log_response(view_name, 403, msg)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            print(f"[{view_name}] Validating assignment data...")
            serializer = TeacherAssignmentSerializer(data=request.data)
            
            if serializer.is_valid():
                with transaction.atomic():
                    assignment = serializer.save(assigned_by=request.user)
                
                print(f"[{view_name}] Assignment created successfully for teacher: {assignment.teacher.full_name}")
                
                # Create notification for the teacher
                try:
                    title = get_notification_title('assignment_created', lang)
                    message = get_notification_message('assignment_created_notification', lang, 
                                                       subject=assignment.subject.name,
                                                       class_level=assignment.class_level.name)
                    NotificationService.create_academic_notification(
                        user=assignment.teacher.user,
                        notification_type='assignment_created',
                        title=title,
                        message=message,
                        created_by=request.user,
                        extra_data={
                            'assignment_id': assignment.id,
                            'subject': assignment.subject.name,
                            'class_level': assignment.class_level.name
                        },
                        action_url='/app/teacher/assignments',
                        priority='high'
                    )
                except Exception as e:
                    print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
                
                msg = get_translation('assignment_create_success', lang, teacher=assignment.teacher.full_name)
                log_response(view_name, 201, msg)
                return Response({'success': True, 'data': serializer.data, 'message': msg}, status=status.HTTP_201_CREATED)
            else:
                print(f"[{view_name}] Validation FAILED! Errors: {serializer.errors}")
                return Response({'success': False, 'errors': serializer.errors, 'message': get_translation('validation_failed', lang)}, status=status.HTTP_400_BAD_REQUEST)
                
        except Exception as e:
            return handle_api_exception(e, view_name, "create", lang, 'operation_failed')


@api_view(['PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def assignment_detail(request, pk):
    """Update or delete a specific assignment"""
    view_name = "AssignmentDetail"
    log_request(view_name, request, extra_data={"assignment_id": pk})
    lang = get_request_language(request)
    
    if not is_admin(request.user):
        msg = get_translation('admin_access_required', lang)
        log_response(view_name, 403, msg)
        return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        assignment = get_object_or_404(TeacherAssignment, id=pk)
    except Exception as e:
        return handle_api_exception(e, view_name, "get_object", lang, 'assignment_not_found')
    
    if request.method == 'PUT':
        try:
            serializer = TeacherAssignmentSerializer(assignment, data=request.data, partial=True)
            if serializer.is_valid():
                with transaction.atomic():
                    updated_assignment = serializer.save()
                
                print(f"[{view_name}] Assignment updated successfully")
                msg = get_translation('assignment_update_success', lang, teacher=assignment.teacher.full_name)
                return Response({'success': True, 'data': serializer.data, 'message': msg})
            else:
                return Response({'success': False, 'errors': serializer.errors, 'message': get_translation('validation_failed', lang)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return handle_api_exception(e, view_name, "update", lang, 'operation_failed')
    
    elif request.method == 'DELETE':
        try:
            teacher_name = assignment.teacher.full_name
            subject_name = assignment.subject.name
            assignment.delete()
            
            # Create notification for teacher
            try:
                title = get_notification_title('assignment_deleted', lang)
                message = get_notification_message('assignment_deleted_notification', lang, 
                                                   subject=subject_name,
                                                   class_level=assignment.class_level.name)
                NotificationService.create_academic_notification(
                    user=assignment.teacher.user,
                    notification_type='assignment_deleted',
                    title=title,
                    message=message,
                    created_by=request.user,
                    extra_data={'subject': subject_name},
                    action_url='/app/teacher/assignments',
                    priority='medium'
                )
            except Exception as e:
                print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
            
            msg = get_translation('assignment_delete_success', lang)
            log_response(view_name, 200, msg)
            return Response({'success': True, 'message': msg})
            
        except Exception as e:
            return handle_api_exception(e, view_name, "delete", lang, 'operation_failed')


# ==================== TIMETABLE GENERATION ====================

def get_available_time_slots(school_level, academic_year, term, day_of_week):
    """Get available time slots for a school level on a specific day"""
    from academics.models import SchoolBreak, SchoolDaySetting
    
    # Get school day settings
    day_setting = SchoolDaySetting.objects.filter(
        school_level=school_level,
        academic_year=academic_year,
        day_of_week=day_of_week,
        is_school_day=True
    ).first()
    
    if not day_setting or not day_setting.start_time or not day_setting.end_time:
        return []
    
    # Get breaks for this school level
    breaks = SchoolBreak.objects.filter(
        school_level=school_level,
        is_active=True
    ).order_by('start_time')
    
    # Generate time slots (1-hour slots)
    slots = []
    current_time = datetime.combine(date.today(), day_setting.start_time)
    end_time = datetime.combine(date.today(), day_setting.end_time)
    slot_duration = timedelta(hours=1)
    
    while current_time + slot_duration <= end_time:
        slot_end = current_time + slot_duration
        slot_start_time = current_time.time()
        slot_end_time = slot_end.time()
        
        # Check if slot overlaps with any break
        is_break = False
        for break_item in breaks:
            break_start = datetime.combine(date.today(), break_item.start_time)
            break_end = datetime.combine(date.today(), break_item.end_time)
            if not (slot_end <= break_start or current_time >= break_end):
                is_break = True
                break
        
        if not is_break:
            slots.append({
                'start_time': slot_start_time,
                'end_time': slot_end_time
            })
        
        current_time = slot_end
    
    return slots


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_timetable(request):
    """
    Generate term-based timetable for teachers based on assignments and school settings.
    """
    view_name = "GenerateTimetable"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if not is_admin(request.user):
        msg = get_translation('admin_access_required', lang)
        log_response(view_name, 403, msg)
        return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        academic_year_id = request.data.get('academic_year')
        term_id = request.data.get('term')
        teacher_id = request.data.get('teacher_id')  # Optional: generate for specific teacher only
        
        print(f"[{view_name}] Generating timetable for Term ID: {term_id}, Academic Year ID: {academic_year_id}")
        if teacher_id:
            print(f"[{view_name}] Filtering for teacher ID: {teacher_id}")
        
        if not academic_year_id:
            return Response({
                'success': False,
                'message': get_translation('academic_year_required', lang)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not term_id:
            return Response({
                'success': False,
                'message': 'Term is required for timetable generation'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        term = get_object_or_404(Term, id=term_id, academic_year=academic_year)
        
        # Clear existing timetables for this term and academic year
        timetable_filter = {
            'academic_year': academic_year,
            'term': term
        }
        if teacher_id:
            timetable_filter['teacher_id'] = teacher_id
        
        deleted_count = TeacherTimetable.objects.filter(**timetable_filter).delete()[0]
        print(f"[{view_name}] Deleted {deleted_count} existing timetable entries")
        
        # Get all active assignments for this term
        assignments = TeacherAssignment.objects.filter(
            status='active',
            academic_year=academic_year,
            term=term
        ).select_related(
            'teacher', 'school_level', 'class_level', 'subject', 'classroom'
        )
        
        if teacher_id:
            assignments = assignments.filter(teacher_id=teacher_id)
        
        if not assignments.exists():
            return Response({
                'success': False,
                'message': get_translation('no_assignments_found', lang)
            }, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"[{view_name}] Found {assignments.count()} active assignments")
        
        # Group assignments by teacher
        assignments_by_teacher = {}
        for assignment in assignments:
            if assignment.teacher.id not in assignments_by_teacher:
                assignments_by_teacher[assignment.teacher.id] = {
                    'teacher': assignment.teacher,
                    'assignments': [],
                    'remaining_hours': float(assignment.teacher.work_hours_per_week)
                }
            assignments_by_teacher[assignment.teacher.id]['assignments'].append(assignment)
        
        # Generate timetable entries
        timetable_entries = []
        conflicts = []
        days_of_week = [0, 1, 2, 3, 4]  # Monday to Friday (can include Saturday if needed)
        
        for teacher_id, teacher_data in assignments_by_teacher.items():
            teacher = teacher_data['teacher']
            teacher_assignments = teacher_data['assignments']
            
            print(f"[{view_name}] Processing teacher: {teacher.full_name}")
            
            for day in days_of_week:
                # Get available time slots for each school level the teacher teaches
                for assignment in teacher_assignments:
                    school_level = assignment.school_level
                    
                    # Get available time slots for this day and school level
                    slots = get_available_time_slots(school_level, academic_year, term, day)
                    
                    for slot in slots:
                        # Check if teacher already has a class at this time on this day
                        existing = TeacherTimetable.objects.filter(
                            teacher=teacher,
                            academic_year=academic_year,
                            term=term,
                            day_of_week=day,
                            start_time=slot['start_time']
                        ).exists()
                        
                        if existing:
                            continue
                        
                        # Check if classroom is available at this time
                        classroom_busy = TeacherTimetable.objects.filter(
                            classroom=assignment.classroom,
                            academic_year=academic_year,
                            term=term,
                            day_of_week=day,
                            start_time__lt=slot['end_time'],
                            end_time__gt=slot['start_time']
                        ).exists()
                        
                        if classroom_busy:
                            conflicts.append({
                                'teacher': teacher.full_name,
                                'classroom': assignment.classroom.name,
                                'day': day,
                                'time': f"{slot['start_time']} - {slot['end_time']}",
                                'error': get_translation('classroom_conflict', lang)
                            })
                            continue
                        
                        # Create timetable entry
                        timetable_entry = TeacherTimetable(
                            teacher=teacher,
                            assignment=assignment,
                            academic_year=academic_year,
                            term=term,
                            day_of_week=day,
                            start_time=slot['start_time'],
                            end_time=slot['end_time'],
                            week_number=1,  # Default week number
                            subject=assignment.subject,
                            class_level=assignment.class_level,
                            classroom=assignment.classroom,
                            school_level=school_level,
                            created_by=request.user
                        )
                        
                        try:
                            timetable_entry.clean()
                            timetable_entries.append(timetable_entry)
                            print(f"[{view_name}] Created entry for {teacher.full_name} on day {day} at {slot['start_time']}")
                            break  # Move to next assignment after scheduling
                        except ValidationError as e:
                            conflicts.append({
                                'teacher': teacher.full_name,
                                'day': day,
                                'time': f"{slot['start_time']} - {slot['end_time']}",
                                'error': str(e)
                            })
        
        # Bulk create timetable entries
        if timetable_entries:
            TeacherTimetable.objects.bulk_create(timetable_entries)
            print(f"[{view_name}] Successfully created {len(timetable_entries)} timetable entries")
        
        # Create notification
        try:
            title = get_notification_title('timetable_generated', lang)
            message = get_notification_message('timetable_generated_notification', lang, week=1)
            
            # Notify admin
            NotificationService.create_academic_notification(
                user=request.user,
                notification_type='timetable_generated',
                title=title,
                message=message,
                created_by=request.user,
                extra_data={
                    'academic_year': academic_year.name,
                    'term': term.name,
                    'entries_count': len(timetable_entries)
                },
                action_url='/app/timetable',
                priority='medium'
            )
            
            # Notify all teachers who got timetable entries
            notified_teachers = set()
            for entry in timetable_entries:
                if entry.teacher.user.id not in notified_teachers:
                    NotificationService.create_academic_notification(
                        user=entry.teacher.user,
                        notification_type='timetable_generated',
                        title=get_notification_title('timetable_generated', lang),
                        message=get_notification_message('timetable_generated_notification', lang, week=1),
                        created_by=request.user,
                        extra_data={},
                        action_url='/app/teacher/timetable',
                        priority='high'
                    )
                    notified_teachers.add(entry.teacher.user.id)
        except Exception as e:
            print(f"[{view_name}] WARNING: Failed to create notifications: {str(e)}")
        
        result = {
            'total_entries': len(timetable_entries),
            'conflicts': conflicts,
            'conflicts_count': len(conflicts),
            'academic_year': academic_year.name,
            'term': term.name,
            'teacher_filter': teacher_id if teacher_id else 'all'
        }
        
        msg = get_translation('timetable_generate_success', lang, week=1)
        log_response(view_name, 200, msg)
        return Response({
            'success': True,
            'data': result,
            'message': msg
        })
        
    except Exception as e:
        traceback.print_exc()
        return handle_api_exception(e, view_name, "generate", lang, 'timetable_generate_failed')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_timetable(request, teacher_id=None):
    """
    Get term-based timetable for teachers.
    """
    view_name = "GetTeacherTimetable"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    try:
        academic_year_id = request.query_params.get('academic_year')
        term_id = request.query_params.get('term')
        day_filter = request.query_params.get('day')  # Optional: filter by day (0-6)
        
        # Determine which teacher(s) to show
        if is_admin(request.user):
            if teacher_id:
                teacher = get_object_or_404(Teacher, id=teacher_id)
                teachers = [teacher]
                print(f"[{view_name}] Admin viewing timetable for teacher: {teacher.full_name}")
            else:
                teachers = Teacher.objects.filter(status='active')
                print(f"[{view_name}] Admin viewing timetable for all {teachers.count()} teachers")
        else:
            if not is_teacher(request.user):
                return Response({'success': False, 'message': get_translation('teacher_access_required', lang)}, status=status.HTTP_403_FORBIDDEN)
            teacher = get_object_or_404(Teacher, user=request.user)
            teachers = [teacher]
            print(f"[{view_name}] Teacher viewing own timetable: {teacher.full_name}")
        
        # Get academic year and term
        if academic_year_id:
            academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        else:
            academic_year = AcademicYear.objects.filter(is_current=True).first()
            if not academic_year:
                return Response({
                    'success': False,
                    'message': 'No current academic year found. Please specify an academic year.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        if term_id:
            term = get_object_or_404(Term, id=term_id, academic_year=academic_year)
        else:
            term = Term.objects.filter(academic_year=academic_year, is_current=True).first()
            if not term:
                return Response({
                    'success': False,
                    'message': 'No current term found. Please specify a term.'
                }, status=status.HTTP_400_BAD_REQUEST)
        
        print(f"[{view_name}] Academic Year: {academic_year.name}, Term: {term.name}")
        
        # Build the timetable data for all teachers
        all_timetables = []
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for teacher in teachers:
            # Get timetable entries for this teacher
            queryset = TeacherTimetable.objects.filter(
                teacher=teacher,
                term=term,
                academic_year=academic_year
            ).order_by('day_of_week', 'start_time')
            
            if day_filter is not None:
                queryset = queryset.filter(day_of_week=int(day_filter))
            
            serializer = TeacherTimetableSerializer(queryset, many=True)
            
            # Group by day
            grouped_timetable = {day: [] for day in days}
            for entry in serializer.data:
                day_name = days[entry['day_of_week']] if entry['day_of_week'] < len(days) else str(entry['day_of_week'])
                grouped_timetable[day_name].append(entry)
            
            # Calculate teacher's weekly hours
            total_hours = sum(
                (datetime.combine(date.today(), datetime.strptime(entry['end_time'], '%H:%M:%S').time()) - 
                 datetime.combine(date.today(), datetime.strptime(entry['start_time'], '%H:%M:%S').time())).seconds / 3600
                for entry in serializer.data if entry.get('start_time') and entry.get('end_time')
            )
            
            teacher_data = {
                'teacher': TeacherSerializer(teacher, context={'request': request}).data,
                'timetable': grouped_timetable,
                'total_weekly_hours': round(total_hours, 1),
                'total_entries': len(serializer.data)
            }
            
            all_timetables.append(teacher_data)
        
        # Get holidays for the term
        holidays = []
        # You can add holiday filtering logic here
        
        result = {
            'timetables': all_timetables,
            'academic_year': {
                'id': academic_year.id,
                'name': academic_year.name
            },
            'term': {
                'id': term.id,
                'name': term.name
            },
            'holidays': holidays,
            'days_of_week': days
        }
        
        # Add summary statistics for admin view
        if is_admin(request.user) and not teacher_id:
            total_teachers = len(teachers)
            teachers_with_timetable = len([t for t in all_timetables if t['total_entries'] > 0])
            total_entries = sum(t['total_entries'] for t in all_timetables)
            
            result['summary'] = {
                'total_teachers': total_teachers,
                'teachers_with_timetable': teachers_with_timetable,
                'teachers_without_timetable': total_teachers - teachers_with_timetable,
                'total_timetable_entries': total_entries,
                'average_entries_per_teacher': round(total_entries / total_teachers, 1) if total_teachers > 0 else 0
            }
        
        log_response(view_name, 200, "Timetable retrieved successfully")
        return Response({'success': True, 'data': result})
        
    except Exception as e:
        traceback.print_exc()
        return handle_api_exception(e, view_name, "get_timetable", lang, 'database_error')


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def export_teacher_timetable(request, teacher_id=None):
    """
    Export timetable for a teacher in a formatted way.
    """
    view_name = "ExportTeacherTimetable"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    try:
        academic_year_id = request.query_params.get('academic_year')
        term_id = request.query_params.get('term')
        
        # Determine which teacher
        if teacher_id:
            if not is_admin(request.user):
                return Response({'success': False, 'message': get_translation('admin_access_required', lang)}, status=status.HTTP_403_FORBIDDEN)
            teacher = get_object_or_404(Teacher, id=teacher_id)
        else:
            if not is_teacher(request.user):
                return Response({'success': False, 'message': get_translation('teacher_access_required', lang)}, status=status.HTTP_403_FORBIDDEN)
            teacher = get_object_or_404(Teacher, user=request.user)
        
        # Get academic year and term
        if academic_year_id:
            academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        else:
            academic_year = AcademicYear.objects.filter(is_current=True).first()
            if not academic_year:
                return Response({'success': False, 'message': 'No current academic year found'}, status=status.HTTP_400_BAD_REQUEST)
        
        if term_id:
            term = get_object_or_404(Term, id=term_id, academic_year=academic_year)
        else:
            term = Term.objects.filter(academic_year=academic_year, is_current=True).first()
            if not term:
                return Response({'success': False, 'message': 'No current term found'}, status=status.HTTP_400_BAD_REQUEST)
        
        # Get timetable entries
        queryset = TeacherTimetable.objects.filter(
            teacher=teacher,
            term=term,
            academic_year=academic_year
        ).order_by('day_of_week', 'start_time')
        
        serializer = TeacherTimetableSerializer(queryset, many=True)
        
        # Format for export
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        export_data = {
            'teacher': TeacherSerializer(teacher, context={'request': request}).data,
            'academic_year': academic_year.name,
            'term': term.name,
            'generated_on': timezone.now().strftime('%Y-%m-%d %H:%M:%S'),
            'timetable': []
        }
        
        for entry in serializer.data:
            day_name = days[entry['day_of_week']] if entry['day_of_week'] < len(days) else str(entry['day_of_week'])
            export_data['timetable'].append({
                'day': day_name,
                'start_time': entry['start_time'],
                'end_time': entry['end_time'],
                'subject': entry['subject_name'],
                'class_level': entry['class_level_name'],
                'classroom': entry['classroom_name'],
                'school_level': entry['school_level_name']
            })
        
        log_response(view_name, 200, "Timetable exported successfully")
        return Response({'success': True, 'data': export_data})
        
    except Exception as e:
        traceback.print_exc()
        return handle_api_exception(e, view_name, "export_timetable", lang, 'database_error')


# ==================== TEACHER REPORT ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def teacher_report(request):
    """
    Generate comprehensive report about teachers, assignments, and timetables.
    """
    view_name = "TeacherReport"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if not is_admin(request.user):
        msg = get_translation('admin_access_required', lang)
        log_response(view_name, 403, msg)
        return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
    
    try:
        academic_year_id = request.query_params.get('academic_year')
        term_id = request.query_params.get('term')
        
        # Get academic year and term
        if academic_year_id:
            academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        else:
            academic_year = AcademicYear.objects.filter(is_current=True).first()
        
        if term_id and academic_year:
            term = get_object_or_404(Term, id=term_id, academic_year=academic_year)
        elif academic_year:
            term = Term.objects.filter(academic_year=academic_year, is_current=True).first()
        else:
            term = None
        
        # Teacher statistics
        total_teachers = Teacher.objects.count()
        active_teachers = Teacher.objects.filter(status='active').count()
        inactive_teachers = Teacher.objects.filter(status='inactive').count()
        on_leave_teachers = Teacher.objects.filter(status='on_leave').count()
        
        # Assignment statistics
        assignment_stats = {}
        if academic_year and term:
            total_assignments = TeacherAssignment.objects.filter(
                academic_year=academic_year,
                term=term,
                status='active'
            ).count()
            
            teachers_with_assignments = TeacherAssignment.objects.filter(
                academic_year=academic_year,
                term=term,
                status='active'
            ).values('teacher').distinct().count()
            
            assignment_stats = {
                'total_assignments': total_assignments,
                'teachers_with_assignments': teachers_with_assignments,
                'teachers_without_assignments': active_teachers - teachers_with_assignments
            }
            
            # Timetable statistics
            timetable_entries = TeacherTimetable.objects.filter(
                academic_year=academic_year,
                term=term
            ).count()
            
            assignment_stats['timetable_entries'] = timetable_entries
        
        # Gender distribution
        gender_distribution = {
            'male': Teacher.objects.filter(gender='male').count(),
            'female': Teacher.objects.filter(gender='female').count(),
            'other': Teacher.objects.filter(gender='other').count()
        }
        
        # Education level distribution
        education_distribution = {}
        for level in Teacher.EducationLevel.choices:
            count = Teacher.objects.filter(education_level=level[0]).count()
            if count > 0:
                education_distribution[level[1]] = count
        
        # Specializations (most common subjects)
        specialization_stats = []
        from django.db.models import Count
        specializations = Subject.objects.annotate(
            teacher_count=Count('specialized_teachers')
        ).filter(teacher_count__gt=0).order_by('-teacher_count')[:10]
        
        for subject in specializations:
            specialization_stats.append({
                'subject': subject.name,
                'teacher_count': subject.teacher_count
            })
        
        report_data = {
            'summary': {
                'total_teachers': total_teachers,
                'active_teachers': active_teachers,
                'inactive_teachers': inactive_teachers,
                'on_leave_teachers': on_leave_teachers,
                'active_percentage': round((active_teachers / total_teachers * 100), 1) if total_teachers > 0 else 0
            },
            'gender_distribution': gender_distribution,
            'education_distribution': education_distribution,
            'top_specializations': specialization_stats,
        }
        
        if assignment_stats:
            report_data['assignment_stats'] = assignment_stats
        
        if academic_year:
            report_data['academic_year'] = {
                'id': academic_year.id,
                'name': academic_year.name
            }
        
        if term:
            report_data['term'] = {
                'id': term.id,
                'name': term.name
            }
        
        log_response(view_name, 200, "Report generated successfully")
        return Response({'success': True, 'data': report_data})
        
    except Exception as e:
        traceback.print_exc()
        return handle_api_exception(e, view_name, "generate_report", lang, 'database_error')
    
    
    


# ==================== HOLIDAY CRUD ====================
from academics.models import Holiday
from academics.serializers import HolidaySerializer

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def holiday_list_create(request):
    """List holidays or create a new holiday"""
    view_name = "HolidayListCreate"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if request.method == 'GET':
        try:
            queryset = Holiday.objects.all().select_related('school_level', 'academic_year')
            
            # Apply filters
            academic_year_id = request.query_params.get('academic_year')
            if academic_year_id:
                queryset = queryset.filter(academic_year_id=academic_year_id)
            
            school_level_id = request.query_params.get('school_level')
            if school_level_id:
                queryset = queryset.filter(school_level_id=school_level_id)
            
            is_recurring = request.query_params.get('is_recurring')
            if is_recurring:
                queryset = queryset.filter(is_recurring=is_recurring.lower() == 'true')
            
            # Filter by date range
            start_date = request.query_params.get('start_date')
            if start_date:
                queryset = queryset.filter(date__gte=start_date)
            
            end_date = request.query_params.get('end_date')
            if end_date:
                queryset = queryset.filter(date__lte=end_date)
            
            serializer = HolidaySerializer(queryset, many=True)
            log_response(view_name, 200, f"{queryset.count()} holiday(s) retrieved successfully")
            return Response({'success': True, 'data': serializer.data})
            
        except Exception as e:
            log_error(view_name, "GET database query", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('database_error', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            log_response(view_name, 403, msg)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            print(f"[{view_name}] Validating holiday data...")
            serializer = HolidaySerializer(data=request.data)
            
            if serializer.is_valid():
                with transaction.atomic():
                    holiday = serializer.save()
                
                print(f"[{view_name}] Holiday created successfully: {holiday.name}")
                
                # Create notification for admin
                try:
                    title = get_notification_title('holiday_created', lang)
                    message = get_notification_message('holiday_created_notification', lang, name=holiday.name)
                    NotificationService.create_academic_notification(
                        user=request.user,
                        notification_type='holiday_created',
                        title=title,
                        message=message,
                        created_by=request.user,
                        extra_data={'holiday_id': holiday.id, 'holiday_name': holiday.name},
                        action_url='/app/holidays',
                        priority='medium'
                    )
                except Exception as e:
                    print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
                
                msg = get_translation('holiday_create_success', lang, name=holiday.name)
                log_response(view_name, 201, msg)
                return Response({'success': True, 'data': serializer.data, 'message': msg}, status=status.HTTP_201_CREATED)
            else:
                print(f"[{view_name}] Validation FAILED! Errors: {serializer.errors}")
                return Response({
                    'success': False, 
                    'errors': serializer.errors, 
                    'message': get_translation('validation_failed', lang)
                }, status=status.HTTP_400_BAD_REQUEST)
                
        except IntegrityError as e:
            log_error(view_name, "create_integrity", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('integrity_error', lang)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            log_error(view_name, "create", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('operation_failed', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def holiday_detail(request, pk):
    """Get, update or delete a specific holiday"""
    view_name = "HolidayDetail"
    log_request(view_name, request, extra_data={"holiday_id": pk})
    lang = get_request_language(request)
    
    try:
        holiday = get_object_or_404(Holiday, id=pk)
    except Exception as e:
        return Response({
            'success': False, 
            'message': get_translation('holiday_not_found', lang)
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        try:
            serializer = HolidaySerializer(holiday)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            log_error(view_name, "serialization", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('database_error', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'PUT':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            serializer = HolidaySerializer(holiday, data=request.data, partial=True)
            if serializer.is_valid():
                with transaction.atomic():
                    updated_holiday = serializer.save()
                
                msg = get_translation('holiday_update_success', lang, name=updated_holiday.name)
                return Response({'success': True, 'data': serializer.data, 'message': msg})
            else:
                return Response({
                    'success': False, 
                    'errors': serializer.errors, 
                    'message': get_translation('validation_failed', lang)
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            log_error(view_name, "update", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('operation_failed', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            holiday_name = holiday.name
            holiday.delete()
            
            msg = get_translation('holiday_delete_success', lang, name=holiday_name)
            return Response({'success': True, 'message': msg})
        except Exception as e:
            log_error(view_name, "delete", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('operation_failed', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def holiday_delete(request, pk):
    """Delete a holiday (alias for consistency)"""
    return holiday_detail(request, pk)


# ==================== SCHOOL DAY SETTINGS (if missing) ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def day_setting_list_create(request):
    """List school day settings or create a new one"""
    view_name = "DaySettingListCreate"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if request.method == 'GET':
        try:
            from academics.models import SchoolDaySetting
            queryset = SchoolDaySetting.objects.all().select_related('school_level', 'academic_year')
            
            # Apply filters
            school_level_id = request.query_params.get('school_level')
            if school_level_id:
                queryset = queryset.filter(school_level_id=school_level_id)
            
            academic_year_id = request.query_params.get('academic_year')
            if academic_year_id:
                queryset = queryset.filter(academic_year_id=academic_year_id)
            
            day_of_week = request.query_params.get('day_of_week')
            if day_of_week:
                queryset = queryset.filter(day_of_week=day_of_week)
            
            serializer = SchoolDaySettingSerializer(queryset, many=True)
            return Response({'success': True, 'data': serializer.data})
            
        except Exception as e:
            log_error(view_name, "GET database query", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('database_error', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            from academics.models import SchoolDaySetting
            serializer = SchoolDaySettingSerializer(data=request.data)
            if serializer.is_valid():
                with transaction.atomic():
                    day_setting = serializer.save()
                
                msg = get_translation('day_setting_create_success', lang)
                return Response({'success': True, 'data': serializer.data, 'message': msg}, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False, 
                    'errors': serializer.errors, 
                    'message': get_translation('validation_failed', lang)
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            log_error(view_name, "create", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('operation_failed', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def day_setting_detail(request, pk):
    """Get, update or delete a specific school day setting"""
    view_name = "DaySettingDetail"
    log_request(view_name, request, extra_data={"day_setting_id": pk})
    lang = get_request_language(request)
    
    try:
        from academics.models import SchoolDaySetting
        day_setting = get_object_or_404(SchoolDaySetting, id=pk)
    except Exception as e:
        return Response({
            'success': False, 
            'message': get_translation('day_setting_not_found', lang)
        }, status=status.HTTP_404_NOT_FOUND)
    
    if request.method == 'GET':
        try:
            from academics.serializers import SchoolDaySettingSerializer
            serializer = SchoolDaySettingSerializer(day_setting)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            return Response({
                'success': False, 
                'message': get_translation('database_error', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'PUT':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            from academics.serializers import SchoolDaySettingSerializer
            serializer = SchoolDaySettingSerializer(day_setting, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'success': True, 'data': serializer.data})
            else:
                return Response({
                    'success': False, 
                    'errors': serializer.errors, 
                    'message': get_translation('validation_failed', lang)
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            return Response({
                'success': False, 
                'message': get_translation('operation_failed', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        try:
            day_setting.delete()
            return Response({'success': True, 'message': get_translation('day_setting_delete_success', lang)})
        except Exception as e:
            return Response({
                'success': False, 
                'message': get_translation('operation_failed', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ==================== TEACHER DOCUMENTS ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def teacher_documents(request, teacher_id=None):
    """Get documents for a teacher or upload new document"""
    view_name = "TeacherDocuments"
    log_request(view_name, request, extra_data={"teacher_id": teacher_id})
    lang = get_request_language(request)
    
    # Determine which teacher
    if teacher_id:
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        try:
            teacher = get_object_or_404(Teacher, id=teacher_id)
        except Exception as e:
            return Response({
                'success': False, 
                'message': get_translation('teacher_not_found', lang)
            }, status=status.HTTP_404_NOT_FOUND)
    else:
        if not is_teacher(request.user):
            msg = get_translation('teacher_access_required', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        teacher = get_object_or_404(Teacher, user=request.user)
    
    if request.method == 'GET':
        try:
            documents = teacher.documents.all()
            serializer = TeacherDocumentSerializer(documents, many=True, context={'request': request})
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            log_error(view_name, "GET documents", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('database_error', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        try:
            serializer = TeacherDocumentSerializer(data=request.data, context={'request': request})
            if serializer.is_valid():
                with transaction.atomic():
                    document = serializer.save(teacher=teacher)
                
                print(f"[{view_name}] Document uploaded: {document.title}")
                msg = get_translation('document_upload_success', lang, title=document.title)
                return Response({'success': True, 'data': serializer.data, 'message': msg}, status=status.HTTP_201_CREATED)
            else:
                return Response({
                    'success': False, 
                    'errors': serializer.errors, 
                    'message': get_translation('validation_failed', lang)
                }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            log_error(view_name, "POST document", e, lang)
            return Response({
                'success': False, 
                'message': get_translation('operation_failed', lang)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def teacher_document_delete(request, document_id):
    """Delete a teacher document"""
    view_name = "TeacherDocumentDelete"
    log_request(view_name, request, extra_data={"document_id": document_id})
    lang = get_request_language(request)
    
    try:
        document = get_object_or_404(TeacherDocument, id=document_id)
        
        # Check permissions
        if not is_admin(request.user) and document.teacher.user.id != request.user.id:
            msg = get_translation('permission_denied', lang)
            return Response({'success': False, 'message': msg}, status=status.HTTP_403_FORBIDDEN)
        
        document_title = document.title
        document.delete()
        
        msg = get_translation('document_delete_success', lang)
        log_response(view_name, 200, msg)
        return Response({'success': True, 'message': msg})
        
    except Exception as e:
        log_error(view_name, "delete", e, lang)
        return Response({
            'success': False, 
            'message': get_translation('operation_failed', lang)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_timetable(request, teacher_id=None):
    """
    Get term-based timetable for teachers.
    """
    view_name = "GetTeacherTimetable"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    try:
        academic_year_id = request.query_params.get('academic_year')
        term_id = request.query_params.get('term')
        teacher_id_param = request.query_params.get('teacher_id')
        
        # Use teacher_id from URL or query param
        effective_teacher_id = teacher_id or teacher_id_param
        
        # If no academic year specified, get current
        if not academic_year_id:
            academic_year = AcademicYear.objects.filter(is_current=True).first()
            if not academic_year:
                return Response({
                    'success': True,
                    'data': {
                        'timetables': [],
                        'academic_year': None,
                        'term': None,
                        'holidays': [],
                        'days_of_week': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                        'message': 'No current academic year found. Please select an academic year.'
                    },
                    'message': 'No academic year selected'
                }, status=status.HTTP_200_OK)
        else:
            academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        
        # If no term specified, get current term for the academic year
        if not term_id:
            term = Term.objects.filter(academic_year=academic_year, is_current=True).first()
            if not term:
                return Response({
                    'success': True,
                    'data': {
                        'timetables': [],
                        'academic_year': {'id': academic_year.id, 'name': academic_year.name},
                        'term': None,
                        'holidays': [],
                        'days_of_week': ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
                        'message': 'No current term found. Please select a term.'
                    },
                    'message': 'No term selected'
                }, status=status.HTTP_200_OK)
        else:
            term = get_object_or_404(Term, id=term_id, academic_year=academic_year)
        
        # Determine which teacher(s) to show
        if is_admin(request.user):
            if effective_teacher_id:
                teacher = get_object_or_404(Teacher, id=effective_teacher_id)
                teachers = [teacher]
            else:
                teachers = Teacher.objects.filter(status='active')
        else:
            if not is_teacher(request.user):
                return Response({'success': False, 'message': get_translation('teacher_access_required', lang)}, status=status.HTTP_403_FORBIDDEN)
            teacher = get_object_or_404(Teacher, user=request.user)
            teachers = [teacher]
        
        # Build the timetable data
        all_timetables = []
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        
        for teacher in teachers:
            # Get timetable entries for this teacher
            queryset = TeacherTimetable.objects.filter(
                teacher=teacher,
                term=term,
                academic_year=academic_year
            ).order_by('day_of_week', 'start_time')
            
            serializer = TeacherTimetableSerializer(queryset, many=True)
            
            # Group by day
            grouped_timetable = {day: [] for day in days}
            for entry in serializer.data:
                day_name = days[entry['day_of_week']] if entry['day_of_week'] < len(days) else str(entry['day_of_week'])
                grouped_timetable[day_name].append(entry)
            
            # Calculate teacher's weekly hours
            total_hours = 0
            for entry in serializer.data:
                if entry.get('start_time') and entry.get('end_time'):
                    start = datetime.strptime(entry['start_time'], '%H:%M:%S')
                    end = datetime.strptime(entry['end_time'], '%H:%M:%S')
                    duration = (end - start).seconds / 3600
                    total_hours += duration
            
            teacher_data = {
                'teacher': TeacherSerializer(teacher, context={'request': request}).data,
                'timetable': grouped_timetable,
                'total_weekly_hours': round(total_hours, 1),
                'total_entries': len(serializer.data)
            }
            all_timetables.append(teacher_data)
        
        result = {
            'timetables': all_timetables,
            'academic_year': {
                'id': academic_year.id,
                'name': academic_year.name
            },
            'term': {
                'id': term.id,
                'name': term.name
            },
            'holidays': [],
            'days_of_week': days
        }
        
        # Add summary statistics for admin view
        if is_admin(request.user) and not effective_teacher_id:
            total_teachers = len(teachers)
            teachers_with_timetable = len([t for t in all_timetables if t['total_entries'] > 0])
            total_entries = sum(t['total_entries'] for t in all_timetables)
            
            result['summary'] = {
                'total_teachers': total_teachers,
                'teachers_with_timetable': teachers_with_timetable,
                'teachers_without_timetable': total_teachers - teachers_with_timetable,
                'total_timetable_entries': total_entries,
                'average_entries_per_teacher': round(total_entries / total_teachers, 1) if total_teachers > 0 else 0
            }
        
        log_response(view_name, 200, "Timetable retrieved successfully")
        return Response({'success': True, 'data': result})
        
    except Exception as e:
        traceback.print_exc()
        log_error(view_name, "get_timetable", e, lang)
        return Response({
            'success': False,
            'data': {
                'timetables': [],
                'message': str(e)
            },
            'message': get_translation('database_error', lang)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
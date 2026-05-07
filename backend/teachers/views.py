import traceback
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from .models import (
    Teacher, TeacherAssignment, SchoolDaySetting, Holiday, TeacherTimetable
)
from .serializers import (
    TeacherSerializer, TeacherProfileUpdateSerializer, TeacherAssignmentSerializer,
    SchoolDaySettingSerializer, HolidaySerializer, TeacherTimetableSerializer
)
from .translations import get_translation, get_notification_title, get_notification_message
from .services import create_teacher_user_account, send_teacher_welcome_email, generate_password
from academics.models import AcademicYear, SchoolLevel, ClassLevel, Subject, ClassRoom
from notifications.services import NotificationService


def is_admin(user):
    return user.is_authenticated and user.role == 'admin'


def is_teacher(user):
    return user.is_authenticated and user.role == 'teacher'


def get_request_language(request):
    lang = request.headers.get('X-Language', 'en')
    if lang not in ['en', 'fr', 'rw']:
        lang = 'en'
    return lang


def log_request(view_name, request, extra_data=None):
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
            else:
                safe_data[k] = v
        print(f"  Body       : {safe_data}")
    
    if extra_data:
        for key, value in extra_data.items():
            print(f"  {key} : {value}")
    
    print("-"*80)


def log_response(view_name, status_code, message, data=None, error=None):
    symbol = "✔" if status_code < 400 else "✘"
    print(f"\n  {symbol}  RESPONSE |  {view_name}  |  HTTP {status_code}")
    print(f"  Message    : {message}")
    if data:
        print(f"  Data       : {data if isinstance(data, str) else 'Data returned'}")
    if error:
        print(f"  Error      : {error}")
    print("="*80 + "\n")


def log_error(view_name, step, error, error_type="ERROR"):
    print(f"\n  ✘  {error_type}  |  {view_name}  |  {step}")
    print(f"     Message   : {str(error)}")
    print(f"     Type      : {type(error).__name__}")
    if hasattr(error, '__traceback__') and error.__traceback__:
        import traceback
        print(f"     Line      : {error.__traceback__.tb_lineno}")
        print(f"     Traceback : {traceback.format_exc()}")
    print("-"*80)


# ==================== TEACHER CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def teacher_list_create(request):
    view_name = "TeacherListCreate"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if request.method == 'GET':
        try:
            queryset = Teacher.objects.all()
            
            status_filter = request.query_params.get('status')
            if status_filter:
                queryset = queryset.filter(status=status_filter)
            
            search = request.query_params.get('search')
            if search:
                queryset = queryset.filter(
                    models.Q(full_name__icontains=search) |
                    models.Q(email__icontains=search) |
                    models.Q(phone_number__icontains=search)
                )
            
            serializer = TeacherSerializer(queryset, many=True)
            log_response(view_name, 200, "Teachers retrieved successfully")
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            log_error(view_name, "GET database query", e)
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            log_response(view_name, 403, msg)
            return Response({'success': False, 'message': msg}, status=403)
        
        try:
            print(f"[{view_name}] Validating teacher data...")
            serializer = TeacherSerializer(data=request.data)
            
            if serializer.is_valid():
                print(f"[{view_name}] Data is valid, creating teacher...")
                
                with transaction.atomic():
                    teacher = serializer.save(created_by=request.user)
                    
                    # Generate password and create user account
                    password = generate_password()
                    user = create_teacher_user_account(teacher, password)
                    teacher.user = user
                    teacher.save()
                    
                    # Send welcome email
                    email_sent = send_teacher_welcome_email(teacher, password, lang)
                    
                    if not email_sent:
                        print(f"[{view_name}] WARNING: Failed to send welcome email to {teacher.email}")
                
                print(f"[{view_name}] Teacher created successfully: ID={teacher.id}, Name={teacher.full_name}")
                
                # Create notification
                try:
                    title = get_notification_title('teacher_created', lang)
                    message = get_notification_message('teacher_create_success', lang, name=teacher.full_name)
                    NotificationService.create_user_notification(
                        user=request.user,
                        notification_type='teacher_created',
                        title=title,
                        message=message,
                        created_by=request.user,
                        extra_data={
                            'teacher_id': teacher.id,
                            'teacher_name': teacher.full_name,
                            'username': teacher.user.username,
                            'password_sent': email_sent
                        },
                        action_url='/app/teachers',
                        priority='medium'
                    )
                    print(f"[{view_name}] Notification created successfully")
                except Exception as e:
                    print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
                
                response_data = TeacherSerializer(teacher).data
                response_data['username'] = teacher.user.username
                if email_sent:
                    response_data['message'] = get_translation('teacher_password_generated', lang, email=teacher.email)
                else:
                    response_data['warning'] = f"Password: {password}. Could not send email to {teacher.email}"
                
                msg = get_translation('teacher_create_success', lang, name=teacher.full_name)
                log_response(view_name, 201, msg)
                return Response({'success': True, 'data': response_data, 'message': msg}, status=201)
            else:
                print(f"[{view_name}] Validation FAILED! Errors: {serializer.errors}")
                msg = get_translation('validation_failed', lang)
                log_response(view_name, 400, msg, error=serializer.errors)
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': msg
                }, status=400)
                
        except IntegrityError as e:
            print(f"[{view_name}] IntegrityError: {str(e)}")
            log_error(view_name, "save", e)
            if 'email' in str(e):
                return Response({'success': False, 'message': get_translation('email_already_exists', lang)}, status=400)
            elif 'phone_number' in str(e):
                return Response({'success': False, 'message': get_translation('phone_already_exists', lang)}, status=400)
            return Response({'success': False, 'message': 'A record with this data already exists'}, status=400)
        except Exception as e:
            print(f"[{view_name}] Unexpected error: {str(e)}")
            traceback.print_exc()
            log_error(view_name, "unexpected", e)
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def teacher_detail(request, pk):
    view_name = "TeacherDetail"
    log_request(view_name, request, extra_data={"teacher_id": pk})
    lang = get_request_language(request)
    
    try:
        teacher = get_object_or_404(Teacher, id=pk)
        print(f"[{view_name}] Found teacher: {teacher.full_name}")
    except Exception as e:
        log_error(view_name, "get_object", e)
        return Response({'success': False, 'message': get_translation('teacher_not_found', lang)}, status=404)
    
    if request.method == 'GET':
        try:
            # Check if requesting own profile or admin
            if not is_admin(request.user) and request.user.id != teacher.user.id:
                msg = get_translation('teacher_access_required', lang)
                return Response({'success': False, 'message': msg}, status=403)
            
            serializer = TeacherSerializer(teacher)
            log_response(view_name, 200, "Teacher retrieved successfully")
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            log_error(view_name, "serialization", e)
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'PUT':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            log_response(view_name, 403, msg)
            return Response({'success': False, 'message': msg}, status=403)
        
        try:
            print(f"[{view_name}] Update data: {request.data}")
            serializer = TeacherSerializer(teacher, data=request.data, partial=True)
            
            if serializer.is_valid():
                old_name = teacher.full_name
                with transaction.atomic():
                    serializer.save()
                
                print(f"[{view_name}] Teacher updated successfully")
                
                try:
                    title = get_notification_title('teacher_updated', lang)
                    message = get_notification_message('teacher_update_success', lang, name=old_name)
                    NotificationService.create_user_notification(
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
                return Response({'success': False, 'errors': serializer.errors, 'message': msg}, status=400)
        except IntegrityError as e:
            log_error(view_name, "update_integrity", e)
            if 'email' in str(e):
                return Response({'success': False, 'message': get_translation('email_already_exists', lang)}, status=400)
            elif 'phone_number' in str(e):
                return Response({'success': False, 'message': get_translation('phone_already_exists', lang)}, status=400)
            return Response({'success': False, 'message': str(e)}, status=400)
        except Exception as e:
            log_error(view_name, "update", e)
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            log_response(view_name, 403, msg)
            return Response({'success': False, 'message': msg}, status=403)
        
        try:
            teacher_name = teacher.full_name
            print(f"[{view_name}] Deleting teacher: {teacher_name}")
            
            if teacher.assignments.filter(status='active').exists():
                msg = get_translation('cannot_delete_has_assignments', lang)
                return Response({'success': False, 'message': msg}, status=400)
            
            # Delete the associated user account
            if teacher.user:
                teacher.user.delete()
            
            teacher.delete()
            
            try:
                title = get_notification_title('teacher_deleted', lang)
                message = get_notification_message('teacher_delete_success', lang, name=teacher_name)
                NotificationService.create_user_notification(
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
            log_error(view_name, "delete", e)
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def teacher_profile(request):
    view_name = "TeacherProfile"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if not is_teacher(request.user):
        msg = get_translation('teacher_access_required', lang)
        return Response({'success': False, 'message': msg}, status=403)
    
    try:
        teacher = get_object_or_404(Teacher, user=request.user)
    except Exception as e:
        log_error(view_name, "get_teacher", e)
        return Response({'success': False, 'message': get_translation('teacher_not_found', lang)}, status=404)
    
    if request.method == 'GET':
        try:
            serializer = TeacherSerializer(teacher)
            log_response(view_name, 200, "Profile retrieved successfully")
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            log_error(view_name, "serialization", e)
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'PUT':
        try:
            print(f"[{view_name}] Update data: {request.data}")
            serializer = TeacherProfileUpdateSerializer(teacher, data=request.data, partial=True)
            
            if serializer.is_valid():
                with transaction.atomic():
                    serializer.save()
                
                print(f"[{view_name}] Profile updated successfully")
                
                try:
                    title = get_notification_title('profile_updated', lang)
                    message = get_notification_message('profile_update_success', lang)
                    NotificationService.create_user_notification(
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
                return Response({'success': False, 'errors': serializer.errors, 'message': msg}, status=400)
        except Exception as e:
            log_error(view_name, "update", e)
            return Response({'success': False, 'message': str(e)}, status=500)


# ==================== TEACHER ASSIGNMENT CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def assignment_list_create(request):
    view_name = "AssignmentListCreate"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if request.method == 'GET':
        try:
            queryset = TeacherAssignment.objects.all()
            
            teacher_id = request.query_params.get('teacher')
            if teacher_id:
                queryset = queryset.filter(teacher_id=teacher_id)
            
            serializer = TeacherAssignmentSerializer(queryset, many=True)
            log_response(view_name, 200, "Assignments retrieved successfully")
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            log_error(view_name, "GET database query", e)
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            log_response(view_name, 403, msg)
            return Response({'success': False, 'message': msg}, status=403)
        
        try:
            print(f"[{view_name}] Validating assignment data...")
            serializer = TeacherAssignmentSerializer(data=request.data)
            
            if serializer.is_valid():
                with transaction.atomic():
                    assignment = serializer.save(assigned_by=request.user)
                
                print(f"[{view_name}] Assignment created successfully")
                
                try:
                    title = get_notification_title('assignment_created', lang)
                    message = get_notification_message('assignment_create_success', lang, teacher=assignment.teacher.full_name)
                    NotificationService.create_user_notification(
                        user=request.user,
                        notification_type='assignment_created',
                        title=title,
                        message=message,
                        created_by=request.user,
                        extra_data={
                            'assignment_id': assignment.id,
                            'teacher_id': assignment.teacher.id,
                            'teacher_name': assignment.teacher.full_name
                        },
                        action_url='/app/teachers/assignments',
                        priority='medium'
                    )
                except Exception as e:
                    print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
                
                msg = get_translation('assignment_create_success', lang, teacher=assignment.teacher.full_name)
                log_response(view_name, 201, msg)
                return Response({'success': True, 'data': serializer.data, 'message': msg}, status=201)
            else:
                print(f"[{view_name}] Validation FAILED! Errors: {serializer.errors}")
                msg = get_translation('validation_failed', lang)
                return Response({'success': False, 'errors': serializer.errors, 'message': msg}, status=400)
        except Exception as e:
            log_error(view_name, "create", e)
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def assignment_delete(request, pk):
    view_name = "AssignmentDelete"
    log_request(view_name, request, extra_data={"assignment_id": pk})
    lang = get_request_language(request)
    
    if not is_admin(request.user):
        msg = get_translation('admin_access_required', lang)
        log_response(view_name, 403, msg)
        return Response({'success': False, 'message': msg}, status=403)
    
    try:
        assignment = get_object_or_404(TeacherAssignment, id=pk)
        teacher_name = assignment.teacher.full_name
        assignment.delete()
        
        try:
            title = get_notification_title('assignment_deleted', lang)
            message = get_notification_message('assignment_delete_success', lang)
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='assignment_deleted',
                title=title,
                message=message,
                created_by=request.user,
                extra_data={'teacher_name': teacher_name},
                action_url='/app/teachers/assignments',
                priority='medium'
            )
        except Exception as e:
            print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
        
        msg = get_translation('assignment_delete_success', lang)
        log_response(view_name, 200, msg)
        return Response({'success': True, 'message': msg})
    except Exception as e:
        log_error(view_name, "delete", e)
        return Response({'success': False, 'message': str(e)}, status=500)


# ======================== TIMETABLE GENERATION ========================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def generate_timetable(request):
    """
    Generate weekly timetable for teachers based on assignments and school settings.
    """
    view_name = "GenerateTimetable"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if not is_admin(request.user):
        msg = get_translation('admin_access_required', lang)
        return Response({'success': False, 'message': msg}, status=403)
    
    try:
        academic_year_id = request.data.get('academic_year')
        week_number = request.data.get('week_number', 1)
        
        if not academic_year_id:
            return Response({
                'success': False,
                'message': get_translation('academic_year_required', lang)
            }, status=400)
        
        academic_year = get_object_or_404(AcademicYear, id=academic_year_id)
        
        # Clear existing timetables for this week and academic year
        TeacherTimetable.objects.filter(
            academic_year=academic_year,
            week_number=week_number
        ).delete()
        
        # Get all active assignments
        assignments = TeacherAssignment.objects.filter(
            status='active',
            academic_year=academic_year
        ).select_related('teacher', 'school_level', 'class_level', 'subject')
        
        if not assignments.exists():
            return Response({
                'success': False,
                'message': 'No active assignments found for this academic year'
            }, status=400)
        
        # Get school day settings
        school_days = SchoolDaySetting.objects.filter(
            academic_year=academic_year,
            is_school_day=True
        ).select_related('school_level')
        
        # Group assignments by school level
        assignments_by_school = {}
        for assignment in assignments:
            school_id = assignment.school_level.id
            if school_id not in assignments_by_school:
                assignments_by_school[school_id] = []
            assignments_by_school[school_id].append(assignment)
        
        # Generate timetable entries
        timetable_entries = []
        conflicts = []
        
        for school_id, school_assignments in assignments_by_school.items():
            # Get school day settings for this school level
            school_days_for_level = school_days.filter(school_level_id=school_id)
            
            for school_day in school_days_for_level:
                day = school_day.day_of_week
                
                # Calculate available time slots
                current_time = school_day.start_time
                end_time = school_day.end_time
                
                from datetime import datetime, timedelta
                
                while current_time < end_time:
                    # Calculate slot end time (assuming 1 hour slots)
                    slot_end = (datetime.combine(date.today(), current_time) + timedelta(hours=1)).time()
                    
                    if slot_end > end_time:
                        slot_end = end_time
                    
                    # Find available classroom for this time
                    for assignment in school_assignments:
                        # Find available classroom for this class level
                        classroom = ClassRoom.objects.filter(
                            class_level=assignment.class_level,
                            status='active'
                        ).first()
                        
                        if classroom:
                            # Check for conflicts
                            timetable_entry = TeacherTimetable(
                                teacher=assignment.teacher,
                                day_of_week=day,
                                start_time=current_time,
                                end_time=slot_end,
                                subject=assignment.subject,
                                class_level=assignment.class_level,
                                classroom=classroom,
                                assignment=assignment,
                                academic_year=academic_year,
                                week_number=week_number
                            )
                            
                            try:
                                timetable_entry.clean()
                                timetable_entries.append(timetable_entry)
                                break  # Assign this slot to this teacher
                            except ValidationError as e:
                                conflicts.append({
                                    'teacher': assignment.teacher.full_name,
                                    'time': f"{current_time} - {slot_end}",
                                    'error': str(e)
                                })
                    
                    current_time = slot_end
        
        # Bulk create timetable entries
        if timetable_entries:
            TeacherTimetable.objects.bulk_create(timetable_entries)
        
        result = {
            'total_entries': len(timetable_entries),
            'conflicts': conflicts,
            'week_number': week_number,
            'academic_year': academic_year.name
        }
        
        log_response(view_name, 200, get_translation('timetable_generate_success', lang))
        return Response({
            'success': True,
            'data': result,
            'message': get_translation('timetable_generate_success', lang)
        })
        
    except Exception as e:
        log_error(view_name, "generate", e)
        return Response({
            'success': False,
            'message': get_translation('timetable_generate_error', lang)
        }, status=500)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_timetable(request, teacher_id=None):
    """Get timetable for a specific teacher or current teacher."""
    view_name = "GetTeacherTimetable"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    try:
        # Determine which teacher to show
        if teacher_id:
            if not is_admin(request.user):
                return Response({'success': False, 'message': get_translation('admin_access_required', lang)}, status=403)
            teacher = get_object_or_404(Teacher, id=teacher_id)
        else:
            if not is_teacher(request.user):
                return Response({'success': False, 'message': get_translation('teacher_access_required', lang)}, status=403)
            teacher = get_object_or_404(Teacher, user=request.user)
        
        academic_year_id = request.query_params.get('academic_year')
        week_number = request.query_params.get('week_number', 1)
        
        queryset = TeacherTimetable.objects.filter(
            teacher=teacher,
            week_number=week_number
        )
        
        if academic_year_id:
            queryset = queryset.filter(academic_year_id=academic_year_id)
        
        serializer = TeacherTimetableSerializer(queryset, many=True)
        
        # Group by day
        days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
        grouped_data = {day: [] for day in days}
        
        for entry in serializer.data:
            day_name = days[entry['day_of_week']]
            grouped_data[day_name].append(entry)
        
        log_response(view_name, 200, "Timetable retrieved successfully")
        return Response({
            'success': True,
            'data': {
                'teacher': TeacherSerializer(teacher).data,
                'timetable': grouped_data,
                'week_number': int(week_number)
            }
        })
        
    except Exception as e:
        log_error(view_name, "get_timetable", e)
        return Response({'success': False, 'message': str(e)}, status=500)


# ==================== DAY SETTINGS CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def day_setting_list_create(request):
    view_name = "DaySettingListCreate"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if request.method == 'GET':
        try:
            queryset = SchoolDaySetting.objects.all()
            
            school_level = request.query_params.get('school_level')
            if school_level:
                queryset = queryset.filter(school_level_id=school_level)
            
            academic_year = request.query_params.get('academic_year')
            if academic_year:
                queryset = queryset.filter(academic_year_id=academic_year)
            
            serializer = SchoolDaySettingSerializer(queryset, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            log_error(view_name, "GET database query", e)
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=403)
        
        try:
            serializer = SchoolDaySettingSerializer(data=request.data)
            if serializer.is_valid():
                day_setting = serializer.save()
                
                try:
                    day_name = dict(SchoolDaySetting.DAYS_OF_WEEK)[day_setting.day_of_week]
                    title = get_notification_title('day_setting_created', lang)
                    message = get_notification_message('day_setting_create_success', lang,
                                                       school_level=day_setting.school_level.name,
                                                       day=day_name)
                    NotificationService.create_user_notification(
                        user=request.user,
                        notification_type='day_setting_created',
                        title=title,
                        message=message,
                        created_by=request.user,
                        extra_data={'day_setting_id': day_setting.id},
                        action_url='/app/school-days',
                        priority='medium'
                    )
                except Exception as e:
                    print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
                
                return Response({'success': True, 'data': serializer.data}, status=201)
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        except Exception as e:
            log_error(view_name, "create", e)
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def day_setting_detail(request, pk):
    view_name = "DaySettingDetail"
    log_request(view_name, request, extra_data={"day_setting_id": pk})
    lang = get_request_language(request)
    
    day_setting = get_object_or_404(SchoolDaySetting, id=pk)
    
    if request.method == 'GET':
        serializer = SchoolDaySettingSerializer(day_setting)
        return Response({'success': True, 'data': serializer.data})
    
    elif request.method == 'PUT':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=403)
        
        try:
            serializer = SchoolDaySettingSerializer(day_setting, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({'success': True, 'data': serializer.data})
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        except Exception as e:
            log_error(view_name, "update", e)
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=403)
        
        day_setting.delete()
        return Response({'success': True, 'message': 'Deleted successfully'})


# ==================== HOLIDAY CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def holiday_list_create(request):
    view_name = "HolidayListCreate"
    log_request(view_name, request)
    lang = get_request_language(request)
    
    if request.method == 'GET':
        try:
            queryset = Holiday.objects.all()
            academic_year = request.query_params.get('academic_year')
            if academic_year:
                queryset = queryset.filter(academic_year_id=academic_year)
            serializer = HolidaySerializer(queryset, many=True)
            return Response({'success': True, 'data': serializer.data})
        except Exception as e:
            log_error(view_name, "GET database query", e)
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            msg = get_translation('admin_access_required', lang)
            return Response({'success': False, 'message': msg}, status=403)
        
        try:
            serializer = HolidaySerializer(data=request.data)
            if serializer.is_valid():
                holiday = serializer.save()
                
                try:
                    title = get_notification_title('holiday_created', lang)
                    message = get_notification_message('holiday_create_success', lang, name=holiday.name)
                    NotificationService.create_user_notification(
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
                
                return Response({'success': True, 'data': serializer.data}, status=201)
            return Response({'success': False, 'errors': serializer.errors}, status=400)
        except Exception as e:
            log_error(view_name, "create", e)
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def holiday_delete(request, pk):
    view_name = "HolidayDelete"
    log_request(view_name, request, extra_data={"holiday_id": pk})
    lang = get_request_language(request)
    
    if not is_admin(request.user):
        msg = get_translation('admin_access_required', lang)
        return Response({'success': False, 'message': msg}, status=403)
    
    try:
        holiday = get_object_or_404(Holiday, id=pk)
        holiday_name = holiday.name
        holiday.delete()
        
        try:
            title = get_notification_title('holiday_deleted', lang)
            message = get_notification_message('holiday_delete_success', lang, name=holiday_name)
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='holiday_deleted',
                title=title,
                message=message,
                created_by=request.user,
                extra_data={'holiday_name': holiday_name},
                action_url='/app/holidays',
                priority='medium'
            )
        except Exception as e:
            print(f"[{view_name}] WARNING: Failed to create notification: {str(e)}")
        
        return Response({'success': True, 'message': get_translation('holiday_delete_success', lang, name=holiday_name)})
    except Exception as e:
        log_error(view_name, "delete", e)
        return Response({'success': False, 'message': str(e)}, status=500)
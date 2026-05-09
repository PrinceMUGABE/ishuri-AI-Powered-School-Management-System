# views.py
import traceback
import re
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError as DjangoValidationError
from .models import (
    AcademicYear, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, ClassLevelCost
)
from .serializers import (
    AcademicYearSerializer, SchoolLevelSerializer, ClassLevelSerializer,
    ClassRoomSerializer, SubjectSerializer, ClassLevelSubjectSerializer,
    ClassLevelCostSerializer
)
from .translations import get_translation, get_notification_title, get_notification_message
from notifications.services import NotificationService


def ok(message_key, data=None, status_code=200, lang='en', **kwargs):
    """
    Build a successful JSON response with translations.
    
    Args:
        message_key: Translation key for the message
        data: Response data (optional)
        status_code: HTTP status code
        lang: Language code
        **kwargs: Format arguments for the message
    
    Returns:
        Response object with translated message
    """
    message = get_translation(message_key, lang, **kwargs)
    body = {"success": True, "message": message}
    if data is not None:
        body["data"] = data
    
    # Log the response
    print(f"\n  ✔  RESPONSE | HTTP {status_code}")
    print(f"  Message : {message}")
    print("=" * 80 + "\n")
    
    return Response(body, status=status_code)


def err(message_key, errors=None, status_code=400, lang='en', **kwargs):
    """
    Build an error JSON response with translations.
    
    Args:
        message_key: Translation key for the error message
        errors: Additional error details (optional)
        status_code: HTTP status code
        lang: Language code
        **kwargs: Format arguments for the message
    
    Returns:
        Response object with translated error message
    """
    message = get_translation(message_key, lang, **kwargs)
    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors
    
    # Log the response
    print(f"\n  ✘  RESPONSE | HTTP {status_code}")
    print(f"  Message : {message}")
    print("=" * 80 + "\n")
    
    return Response(body, status=status_code)


# ══════════════════════════════════════════════════════════════════════════════
#  UTILITIES
# ══════════════════════════════════════════════════════════════════════════════

def is_admin(user):
    return user.is_authenticated and user.role == 'admin'


def get_lang(request):
    """Extract language from request headers or query params."""
    # Priority: 1. X-Language header, 2. lang query param, 3. default 'en'
    lang = request.headers.get('X-Language')
    if not lang:
        lang = request.query_params.get('lang')
    if not lang:
        lang = 'en'
    # Attach lang to request for use in serializers
    request.lang = lang if lang in ('en', 'fr', 'rw') else 'en'
    return request.lang


def _first_error(serializer_errors):
    """Pull the very first human-readable error string out of DRF error dicts."""
    for field_errors in serializer_errors.values():
        if isinstance(field_errors, list) and field_errors:
            return str(field_errors[0])
        if isinstance(field_errors, str):
            return field_errors
    return "Validation failed."


def log_request(view_name, request, extra_data=None):
    """Log incoming request details."""
    print("\n" + "=" * 80)
    print(f"  ▶  REQUEST  |  {view_name}  |  {request.method}")
    print("=" * 80)
    print(f"  User    : {request.user} (role={getattr(request.user, 'role', 'N/A')})")
    print(f"  Path    : {request.path}")
    print(f"  Lang    : {get_lang(request)}")
    if request.query_params:
        print(f"  Params  : {dict(request.query_params)}")
    if request.data:
        safe = {k: ('***' if 'password' in k or 'token' in k else v)
                for k, v in request.data.items()}
        print(f"  Body    : {safe}")
    if extra_data:
        for k, v in extra_data.items():
            print(f"  {k} : {v}")
    print("-" * 80)


def log_error(view_name, step, exc):
    """Log error details."""
    print(f"\n  ✘  ERROR | {view_name} | {step}")
    print(f"     {type(exc).__name__}: {exc}")
    if exc.__traceback__:
        print(f"     line {exc.__traceback__.tb_lineno}")
        print(traceback.format_exc())
    print("-" * 80)


def _notify(user, notification_type, title_key, message_key, lang='en', extra_data=None, action_url='/', priority='medium'):
    """Fire-and-forget notification — never raises."""
    try:
        title = get_notification_title(title_key, lang)
        message = get_notification_message(message_key, lang, **(extra_data or {}))
        NotificationService.create_user_notification(
            user=user,
            notification_type=notification_type,
            title=title,
            message=message,
            created_by=user,
            extra_data=extra_data or {},
            action_url=action_url,
            priority=priority,
        )
    except Exception as exc:
        print(f"[NOTIFY WARNING] {notification_type}: {exc}")


def handle_integrity_error(exc, lang):
    """Handle database integrity errors and return appropriate translation key."""
    error_msg = str(exc).lower()
    if 'unique' in error_msg or 'duplicate' in error_msg:
        if 'code' in error_msg:
            return 'code_already_exists'
        elif 'name' in error_msg:
            return 'duplicate_name'
        elif 'key' in error_msg:
            return 'already_exists'
    return 'create_error'


# ══════════════════════════════════════════════════════════════════════════════
#  ACADEMIC YEAR
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def academic_year_list_create(request):
    vn = "AcademicYearListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = AcademicYear.objects.all().order_by('-start_date')
            data = AcademicYearSerializer(qs, many=True, context={'request': request}).data
            return ok('academic_years_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    # POST
    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    serializer = AcademicYearSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        msg_key = _first_error(serializer.errors)
        return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        
        _notify(request.user, 'academic_year_created',
                'academic_year_created_title',
                'academic_year_create_msg', lang,
                {'academic_year_id': obj.id, 'name': obj.name},
                '/app/academics/academic-years')
        
        return ok('academic_year_create_msg', serializer.data, 201, lang, name=obj.name)
    except IntegrityError as exc:
        error_key = handle_integrity_error(exc, lang)
        return err(error_key, status_code=400, lang=lang)
    except Exception as exc:
        log_error(vn, 'POST', exc)
        return err('create_error', status_code=500, lang=lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def academic_year_detail(request, pk):
    vn = "AcademicYearDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    try:
        obj = get_object_or_404(AcademicYear, id=pk)
    except Exception as exc:
        log_error(vn, 'lookup', exc)
        return err('not_found', status_code=404, lang=lang)

    if request.method == 'GET':
        data = AcademicYearSerializer(obj, context={'request': request}).data
        return ok('academic_year_fetched', data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        serializer = AcademicYearSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            msg_key = _first_error(serializer.errors)
            return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            
            _notify(request.user, 'academic_year_updated',
                    'academic_year_updated_title',
                    'academic_year_update_msg', lang,
                    {'academic_year_id': obj.id},
                    '/app/academics/academic-years', priority='low')
            
            return ok('academic_year_update_msg', serializer.data, 200, lang, name=old_name)
        except IntegrityError as exc:
            error_key = handle_integrity_error(exc, lang)
            return err(error_key, status_code=400, lang=lang)
        except Exception as exc:
            log_error(vn, 'PUT', exc)
            return err('update_error', status_code=500, lang=lang)

    if request.method == 'DELETE':
        try:
            name = obj.name
            with transaction.atomic():
                obj.delete()
            
            _notify(request.user, 'academic_year_deleted',
                    'academic_year_deleted_title',
                    'academic_year_delete_msg', lang,
                    {'name': name},
                    '/app/academics/academic-years')
            
            return ok('academic_year_delete_msg', None, 200, lang, name=name)
        except Exception as exc:
            log_error(vn, 'DELETE', exc)
            return err('delete_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  SCHOOL LEVEL
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def school_level_list_create(request):
    vn = "SchoolLevelListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = SchoolLevel.objects.filter(is_active=True)
            data = SchoolLevelSerializer(qs, many=True, context={'request': request}).data
            return ok('school_levels_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    # Clean and validate name
    if 'name' in request.data:
        request.data['name'] = request.data['name'].strip().title()

    serializer = SchoolLevelSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        # Check for duplicate name error and translate it
        errors = serializer.errors
        if 'name' in errors:
            for error_msg in errors['name']:
                if 'already exists' in str(error_msg).lower() or 'unique' in str(error_msg).lower():
                    return err('duplicate_name', errors=errors, status_code=400, lang=lang)
        msg_key = _first_error(serializer.errors)
        return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        
        _notify(request.user, 'school_level_created',
                'school_level_created_title',
                'school_level_create_msg', lang,
                {'school_level_id': obj.id, 'name': obj.name},
                '/app/academics/school-levels')
        
        return ok('school_level_create_msg', serializer.data, 201, lang, name=obj.name)
    except IntegrityError as exc:
        error_key = handle_integrity_error(exc, lang)
        return err(error_key, status_code=400, lang=lang)
    except Exception as exc:
        log_error(vn, 'POST', exc)
        return err('create_error', status_code=500, lang=lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def school_level_detail(request, pk):
    vn = "SchoolLevelDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    try:
        obj = get_object_or_404(SchoolLevel, id=pk)
    except Exception as exc:
        log_error(vn, 'lookup', exc)
        return err('not_found', status_code=404, lang=lang)

    if request.method == 'GET':
        return ok('school_level_fetched', SchoolLevelSerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        # Clean name if provided
        if 'name' in request.data:
            request.data['name'] = request.data['name'].strip().title()
        
        serializer = SchoolLevelSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            errors = serializer.errors
            if 'name' in errors:
                for error_msg in errors['name']:
                    if 'already exists' in str(error_msg).lower() or 'unique' in str(error_msg).lower():
                        return err('duplicate_name', errors=errors, status_code=400, lang=lang)
            msg_key = _first_error(serializer.errors)
            return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            
            _notify(request.user, 'school_level_updated',
                    'school_level_updated_title',
                    'school_level_update_msg', lang,
                    {'school_level_id': obj.id},
                    '/app/academics/school-levels', priority='low')
            
            return ok('school_level_update_msg', serializer.data, 200, lang, name=old_name)
        except IntegrityError as exc:
            error_key = handle_integrity_error(exc, lang)
            return err(error_key, status_code=400, lang=lang)
        except Exception as exc:
            log_error(vn, 'PUT', exc)
            return err('update_error', status_code=500, lang=lang)

    if request.method == 'DELETE':
        if obj.class_levels.filter(is_active=True).exists():
            return err('cannot_delete_has_children', status_code=400, lang=lang)
        try:
            name = obj.name
            with transaction.atomic():
                obj.delete()
            
            _notify(request.user, 'school_level_deleted',
                    'school_level_deleted_title',
                    'school_level_delete_msg', lang,
                    {'name': name},
                    '/app/academics/school-levels')
            
            return ok('school_level_delete_msg', None, 200, lang, name=name)
        except Exception as exc:
            log_error(vn, 'DELETE', exc)
            return err('delete_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  CLASS LEVEL
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def class_level_list_create(request):
    vn = "ClassLevelListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = ClassLevel.objects.filter(is_active=True)
            if sl := request.query_params.get('school_level'):
                qs = qs.filter(school_level_id=sl)
            data = ClassLevelSerializer(qs, many=True, context={'request': request}).data
            return ok('class_levels_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    # Process and validate code before serializer
    if 'code' in request.data:
        request.data['code'] = request.data['code'].upper().strip()
        if not re.match(r'^[A-Z0-9]+$', request.data['code']):
            return err('class_code_invalid', status_code=400, lang=lang)

    serializer = ClassLevelSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        errors = serializer.errors
        # Check for duplicate errors
        if 'code' in errors:
            for error_msg in errors['code']:
                if 'already exists' in str(error_msg).lower() or 'unique' in str(error_msg).lower():
                    return err('code_already_exists', errors=errors, status_code=400, lang=lang)
        if 'name' in errors:
            for error_msg in errors['name']:
                if 'already exists' in str(error_msg).lower():
                    return err('duplicate_name_in_school_level', errors=errors, status_code=400, lang=lang)
        msg_key = _first_error(serializer.errors)
        return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        
        _notify(request.user, 'class_level_created',
                'class_level_created_title',
                'class_level_create_msg', lang,
                {'class_level_id': obj.id, 'name': obj.name, 'code': obj.code},
                f'/app/academics/class-levels/{obj.id}')
        
        return ok('class_level_create_msg', serializer.data, 201, lang, name=obj.name, code=obj.code)
    except IntegrityError as exc:
        error_key = handle_integrity_error(exc, lang)
        return err(error_key, status_code=400, lang=lang)
    except Exception as exc:
        log_error(vn, 'POST', exc)
        return err('create_error', status_code=500, lang=lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_level_detail(request, pk):
    vn = "ClassLevelDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    try:
        obj = get_object_or_404(ClassLevel, id=pk)
    except Exception as exc:
        log_error(vn, 'lookup', exc)
        return err('not_found', status_code=404, lang=lang)

    if request.method == 'GET':
        return ok('class_level_fetched', ClassLevelSerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        if 'code' in request.data:
            request.data['code'] = request.data['code'].upper().strip()
            if not re.match(r'^[A-Z0-9]+$', request.data['code']):
                return err('class_code_invalid', status_code=400, lang=lang)
        
        serializer = ClassLevelSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            errors = serializer.errors
            if 'code' in errors:
                for error_msg in errors['code']:
                    if 'already exists' in str(error_msg).lower() or 'unique' in str(error_msg).lower():
                        return err('code_already_exists', errors=errors, status_code=400, lang=lang)
            if 'name' in errors:
                for error_msg in errors['name']:
                    if 'already exists' in str(error_msg).lower():
                        return err('duplicate_name_in_school_level', errors=errors, status_code=400, lang=lang)
            msg_key = _first_error(serializer.errors)
            return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name, old_code = obj.name, obj.code
            with transaction.atomic():
                serializer.save()
            
            _notify(request.user, 'class_level_updated',
                    'class_level_updated_title',
                    'class_level_update_msg', lang,
                    {'class_level_id': obj.id},
                    f'/app/academics/class-levels/{obj.id}', priority='low')
            
            return ok('class_level_update_msg', serializer.data, 200, lang, name=old_name, code=old_code)
        except IntegrityError as exc:
            error_key = handle_integrity_error(exc, lang)
            return err(error_key, status_code=400, lang=lang)
        except Exception as exc:
            log_error(vn, 'PUT', exc)
            return err('update_error', status_code=500, lang=lang)

    if request.method == 'DELETE':
        if obj.classrooms.filter(status='active').exists():
            return err('cannot_delete_has_children', status_code=400, lang=lang)
        if obj.subjects.exists():
            return err('cannot_delete_has_children', status_code=400, lang=lang)
        if obj.costs.exists():
            return err('cannot_delete_has_children', status_code=400, lang=lang)
        try:
            name, code = obj.name, obj.code
            with transaction.atomic():
                obj.delete()
            
            _notify(request.user, 'class_level_deleted',
                    'class_level_deleted_title',
                    'class_level_delete_msg', lang,
                    {'name': name, 'code': code},
                    '/app/academics/class-levels')
            
            return ok('class_level_delete_msg', None, 200, lang, name=name, code=code)
        except Exception as exc:
            log_error(vn, 'DELETE', exc)
            return err('delete_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  CLASSROOM
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def classroom_list_create(request):
    vn = "ClassroomListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = ClassRoom.objects.all()
            if cl := request.query_params.get('class_level'):
                qs = qs.filter(class_level_id=cl)
            if st := request.query_params.get('status'):
                qs = qs.filter(status=st)
            if rt := request.query_params.get('room_type'):
                qs = qs.filter(room_type=rt)
            data = ClassRoomSerializer(qs, many=True, context={'request': request}).data
            return ok('classrooms_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    # Process code before serializer
    if 'code' in request.data:
        request.data['code'] = request.data['code'].upper().strip()
        if not re.match(r'^[A-Z0-9]+$', request.data['code']):
            return err('room_code_invalid', status_code=400, lang=lang)

    serializer = ClassRoomSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        errors = serializer.errors
        if 'code' in errors:
            for error_msg in errors['code']:
                if 'already exists' in str(error_msg).lower() or 'unique' in str(error_msg).lower():
                    return err('code_already_exists', errors=errors, status_code=400, lang=lang)
        if 'name' in errors:
            for error_msg in errors['name']:
                if 'already exists' in str(error_msg).lower():
                    return err('duplicate_name_in_class_level', errors=errors, status_code=400, lang=lang)
        msg_key = _first_error(serializer.errors)
        return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        
        _notify(request.user, 'classroom_created',
                'classroom_created_title',
                'classroom_create_msg', lang,
                {'classroom_id': obj.id, 'name': obj.name},
                f'/app/academics/class-rooms/{obj.id}')
        
        return ok('classroom_create_msg', serializer.data, 201, lang, name=obj.name, code=obj.code)
    except IntegrityError as exc:
        error_key = handle_integrity_error(exc, lang)
        return err(error_key, status_code=400, lang=lang)
    except Exception as exc:
        log_error(vn, 'POST', exc)
        return err('create_error', status_code=500, lang=lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def classroom_detail(request, pk):
    vn = "ClassroomDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    try:
        obj = get_object_or_404(ClassRoom, id=pk)
    except Exception as exc:
        log_error(vn, 'lookup', exc)
        return err('not_found', status_code=404, lang=lang)

    if request.method == 'GET':
        return ok('classroom_fetched', ClassRoomSerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        if 'code' in request.data:
            request.data['code'] = request.data['code'].upper().strip()
            if not re.match(r'^[A-Z0-9]+$', request.data['code']):
                return err('room_code_invalid', status_code=400, lang=lang)
        
        serializer = ClassRoomSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            errors = serializer.errors
            if 'code' in errors:
                for error_msg in errors['code']:
                    if 'already exists' in str(error_msg).lower() or 'unique' in str(error_msg).lower():
                        return err('code_already_exists', errors=errors, status_code=400, lang=lang)
            if 'name' in errors:
                for error_msg in errors['name']:
                    if 'already exists' in str(error_msg).lower():
                        return err('duplicate_name_in_class_level', errors=errors, status_code=400, lang=lang)
            msg_key = _first_error(serializer.errors)
            return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            
            _notify(request.user, 'classroom_updated',
                    'classroom_updated_title',
                    'classroom_update_msg', lang,
                    {'classroom_id': obj.id},
                    f'/app/academics/class-rooms/{obj.id}', priority='low')
            
            return ok('classroom_update_msg', serializer.data, 200, lang, name=old_name)
        except IntegrityError as exc:
            error_key = handle_integrity_error(exc, lang)
            return err(error_key, status_code=400, lang=lang)
        except Exception as exc:
            log_error(vn, 'PUT', exc)
            return err('update_error', status_code=500, lang=lang)

    if request.method == 'DELETE':
        try:
            name = obj.name
            with transaction.atomic():
                obj.delete()
            
            _notify(request.user, 'classroom_deleted',
                    'classroom_deleted_title',
                    'classroom_delete_msg', lang,
                    {'name': name},
                    '/app/academics/class-rooms')
            
            return ok('classroom_delete_msg', None, 200, lang, name=name)
        except Exception as exc:
            log_error(vn, 'DELETE', exc)
            return err('delete_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  SUBJECT
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def subject_list_create(request):
    vn = "SubjectListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = Subject.objects.all()
            if st := request.query_params.get('status'):
                qs = qs.filter(status=st)
            data = SubjectSerializer(qs, many=True, context={'request': request}).data
            return ok('subjects_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    # Process and validate code before serializer
    if 'code' in request.data:
        request.data['code'] = request.data['code'].upper().strip()
        if not re.match(r'^[A-Z0-9]+$', request.data['code']):
            return err('subject_code_invalid', status_code=400, lang=lang)

    serializer = SubjectSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        errors = serializer.errors
        if 'code' in errors:
            for error_msg in errors['code']:
                if 'already exists' in str(error_msg).lower() or 'unique' in str(error_msg).lower():
                    return err('code_already_exists', errors=errors, status_code=400, lang=lang)
        if 'name' in errors:
            for error_msg in errors['name']:
                if 'already exists' in str(error_msg).lower():
                    return err('duplicate_name', errors=errors, status_code=400, lang=lang)
        msg_key = _first_error(serializer.errors)
        return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        
        _notify(request.user, 'subject_created',
                'subject_created_title',
                'subject_create_msg', lang,
                {'subject_id': obj.id, 'name': obj.name},
                f'/app/academics/subjects/{obj.id}')
        
        return ok('subject_create_msg', serializer.data, 201, lang, name=obj.name, code=obj.code)
    except IntegrityError as exc:
        error_key = handle_integrity_error(exc, lang)
        return err(error_key, status_code=400, lang=lang)
    except Exception as exc:
        log_error(vn, 'POST', exc)
        return err('create_error', status_code=500, lang=lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def subject_detail(request, pk):
    vn = "SubjectDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    try:
        obj = get_object_or_404(Subject, id=pk)
    except Exception as exc:
        log_error(vn, 'lookup', exc)
        return err('not_found', status_code=404, lang=lang)

    if request.method == 'GET':
        return ok('subject_fetched', SubjectSerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        if 'code' in request.data:
            request.data['code'] = request.data['code'].upper().strip()
            if not re.match(r'^[A-Z0-9]+$', request.data['code']):
                return err('subject_code_invalid', status_code=400, lang=lang)
        
        serializer = SubjectSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            errors = serializer.errors
            if 'code' in errors:
                for error_msg in errors['code']:
                    if 'already exists' in str(error_msg).lower() or 'unique' in str(error_msg).lower():
                        return err('code_already_exists', errors=errors, status_code=400, lang=lang)
            if 'name' in errors:
                for error_msg in errors['name']:
                    if 'already exists' in str(error_msg).lower():
                        return err('duplicate_name', errors=errors, status_code=400, lang=lang)
            msg_key = _first_error(serializer.errors)
            return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            
            _notify(request.user, 'subject_updated',
                    'subject_updated_title',
                    'subject_update_msg', lang,
                    {'subject_id': obj.id},
                    f'/app/academics/subjects/{obj.id}', priority='low')
            
            return ok('subject_update_msg', serializer.data, 200, lang, name=old_name)
        except IntegrityError as exc:
            error_key = handle_integrity_error(exc, lang)
            return err(error_key, status_code=400, lang=lang)
        except Exception as exc:
            log_error(vn, 'PUT', exc)
            return err('update_error', status_code=500, lang=lang)

    if request.method == 'DELETE':
        if obj.class_levels.exists():
            return err('cannot_delete_has_children', status_code=400, lang=lang)
        try:
            name, code = obj.name, obj.code
            with transaction.atomic():
                obj.delete()
            
            _notify(request.user, 'subject_deleted',
                    'subject_deleted_title',
                    'subject_delete_msg', lang,
                    {'name': name},
                    '/app/academics/subjects')
            
            return ok('subject_delete_msg', None, 200, lang, name=name, code=code)
        except Exception as exc:
            log_error(vn, 'DELETE', exc)
            return err('delete_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  ASSIGNMENTS  (ClassLevelSubject)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def class_level_subject_list_create(request):
    vn = "ClassLevelSubjectListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = ClassLevelSubject.objects.select_related('class_level', 'subject').all()
            if cl := request.query_params.get('class_level'):
                qs = qs.filter(class_level_id=cl)
            if ic := request.query_params.get('is_compulsory'):
                qs = qs.filter(is_compulsory=(ic.lower() == 'true'))
            data = ClassLevelSubjectSerializer(qs, many=True, context={'request': request}).data
            return ok('assignments_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    serializer = ClassLevelSubjectSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        errors = serializer.errors
        # Check for unique constraint violation (already assigned)
        if 'non_field_errors' in errors:
            for error_msg in errors['non_field_errors']:
                if 'already assigned' in str(error_msg).lower():
                    return err('already_assigned', errors=errors, status_code=400, lang=lang)
        msg_key = _first_error(serializer.errors)
        return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        
        _notify(request.user, 'subject_assigned',
                'subject_assigned_title',
                'assign_msg', lang,
                {'assignment_id': obj.id,
                 'class_level': obj.class_level.name,
                 'subject': obj.subject.name},
                f'/app/academics/class-levels/{obj.class_level.id}')
        
        return ok('assign_msg', serializer.data, 201, lang, 
                 subject=obj.subject.name, class_level=obj.class_level.name)
    except IntegrityError as exc:
        error_key = handle_integrity_error(exc, lang)
        if error_key == 'already_exists':
            return err('already_assigned', status_code=400, lang=lang)
        return err(error_key, status_code=400, lang=lang)
    except Exception as exc:
        log_error(vn, 'POST', exc)
        return err('create_error', status_code=500, lang=lang)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def class_level_subject_delete(request, pk):
    vn = "ClassLevelSubjectDelete"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    try:
        obj = get_object_or_404(ClassLevelSubject, id=pk)
        cl_name, sub_name = obj.class_level.name, obj.subject.name
        with transaction.atomic():
            obj.delete()
        
        _notify(request.user, 'subject_unassigned',
                'subject_unassigned_title',
                'unassign_msg', lang,
                {'class_level': cl_name, 'subject': sub_name},
                '/app/academics/assignments')
        
        return ok('unassign_msg', None, 200, lang, subject=sub_name, class_level=cl_name)
    except Exception as exc:
        log_error(vn, 'DELETE', exc)
        return err('delete_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  FEE STRUCTURES  (ClassLevelCost)
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def class_level_cost_list_create(request):
    vn = "ClassLevelCostListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = ClassLevelCost.objects.select_related('academic_year', 'class_level').all()
            if cl := request.query_params.get('class_level'):
                qs = qs.filter(class_level_id=cl)
            if ay := request.query_params.get('academic_year'):
                qs = qs.filter(academic_year_id=ay)
            if fr := request.query_params.get('frequency'):
                qs = qs.filter(frequency=fr)
            if im := request.query_params.get('is_mandatory'):
                qs = qs.filter(is_mandatory=(im.lower() == 'true'))
            data = ClassLevelCostSerializer(qs, many=True, context={'request': request}).data
            return ok('costs_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    serializer = ClassLevelCostSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        errors = serializer.errors
        # Check for unique constraint violation
        if 'non_field_errors' in errors:
            for error_msg in errors['non_field_errors']:
                if 'already exists' in str(error_msg).lower():
                    return err('fee_structure_already_exists', errors=errors, status_code=400, lang=lang)
        msg_key = _first_error(serializer.errors)
        return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        
        _notify(request.user, 'fee_structure_created',
                'fee_structure_created_title',
                'fee_structure_create_msg', lang,
                {'cost_id': obj.id, 'name': obj.name, 'amount': str(obj.amount)},
                f'/app/academics/class-levels/{obj.class_level.id}')
        
        return ok('fee_structure_create_msg', serializer.data, 201, lang, 
                 name=obj.name, class_level=obj.class_level.name)
    except IntegrityError as exc:
        error_key = handle_integrity_error(exc, lang)
        if error_key == 'already_exists':
            return err('fee_structure_already_exists', status_code=400, lang=lang)
        return err(error_key, status_code=400, lang=lang)
    except Exception as exc:
        log_error(vn, 'POST', exc)
        return err('create_error', status_code=500, lang=lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_level_cost_detail(request, pk):
    vn = "ClassLevelCostDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    try:
        obj = get_object_or_404(ClassLevelCost, id=pk)
    except Exception as exc:
        log_error(vn, 'lookup', exc)
        return err('not_found', status_code=404, lang=lang)

    if request.method == 'GET':
        return ok('cost_fetched', ClassLevelCostSerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        serializer = ClassLevelCostSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            errors = serializer.errors
            if 'non_field_errors' in errors:
                for error_msg in errors['non_field_errors']:
                    if 'already exists' in str(error_msg).lower():
                        return err('fee_structure_already_exists', errors=errors, status_code=400, lang=lang)
            msg_key = _first_error(serializer.errors)
            return err(msg_key, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            
            _notify(request.user, 'fee_structure_updated',
                    'fee_structure_updated_title',
                    'fee_structure_update_msg', lang,
                    {'cost_id': obj.id},
                    f'/app/academics/class-levels/{obj.class_level.id}', priority='low')
            
            return ok('fee_structure_update_msg', serializer.data, 200, lang, name=old_name)
        except IntegrityError as exc:
            error_key = handle_integrity_error(exc, lang)
            if error_key == 'already_exists':
                return err('fee_structure_already_exists', status_code=400, lang=lang)
            return err(error_key, status_code=400, lang=lang)
        except Exception as exc:
            log_error(vn, 'PUT', exc)
            return err('update_error', status_code=500, lang=lang)

    if request.method == 'DELETE':
        try:
            name, cl_name = obj.name, obj.class_level.name
            with transaction.atomic():
                obj.delete()
            
            _notify(request.user, 'fee_structure_deleted',
                    'fee_structure_deleted_title',
                    'fee_structure_delete_msg', lang,
                    {'name': name, 'class_level': cl_name},
                    '/app/academics/costs')
            
            return ok('fee_structure_delete_msg', None, 200, lang, name=name, class_level=cl_name)
        except Exception as exc:
            log_error(vn, 'DELETE', exc)
            return err('delete_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  DASHBOARD STATS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    vn = "DashboardStats"
    lang = get_lang(request)
    log_request(vn, request)

    try:
        current_year = AcademicYear.objects.filter(is_current=True).first()
        stats = {
            'total_school_levels':  SchoolLevel.objects.filter(is_active=True).count(),
            'total_class_levels':   ClassLevel.objects.filter(is_active=True).count(),
            'total_classrooms':     ClassRoom.objects.count(),
            'total_subjects':       Subject.objects.count(),
            'total_assignments':    ClassLevelSubject.objects.count(),
            'total_fee_structures': ClassLevelCost.objects.count(),
            'current_academic_year': (
                {'id': current_year.id, 'name': current_year.name, 'year': current_year.name}
                if current_year else None
            ),
        }
        return ok('dashboard_fetched', stats, 200, lang)
    except Exception as exc:
        log_error(vn, 'GET', exc)
        return err('fetch_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  HELPER VIEWS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_class_levels_by_school(request, school_level_id):
    vn = "GetClassLevelsBySchool"
    lang = get_lang(request)
    log_request(vn, request, {'school_level_id': school_level_id})
    
    try:
        qs = ClassLevel.objects.filter(school_level_id=school_level_id, is_active=True)
        data = ClassLevelSerializer(qs, many=True, context={'request': request}).data
        return ok('class_levels_fetched', data, 200, lang, count=len(data))
    except Exception as exc:
        log_error(vn, "GET", exc)
        return err('fetch_error', status_code=500, lang=lang)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subjects_by_class_level(request, class_level_id):
    vn = "GetSubjectsByClassLevel"
    lang = get_lang(request)
    log_request(vn, request, {'class_level_id': class_level_id})
    
    try:
        assignments = (ClassLevelSubject.objects
                       .filter(class_level_id=class_level_id)
                       .select_related('subject'))
        data = [{
            'id':                 a.subject.id,
            'name':               a.subject.name,
            'code':               a.subject.code,
            'teaching_frequency': a.teaching_frequency,
            'hours_per_week':     a.hours_per_week,
            'is_compulsory':      a.is_compulsory,
        } for a in assignments]
        return ok('subjects_fetched', data, 200, lang, count=len(data))
    except Exception as exc:
        log_error(vn, "GET", exc)
        return err('fetch_error', status_code=500, lang=lang)
    
    
    
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_class_levels_by_school_level(request, school_level_id):
    vn = "GetClassLevelsBySchoolLevel"
    lang = get_lang(request)
    log_request(vn, request, {'school_level_id': school_level_id})
    
    try:
        qs = ClassLevel.objects.filter(school_level_id=school_level_id, is_active=True)
        data = ClassLevelSerializer(qs, many=True, context={'request': request}).data
        return ok('class_levels_fetched', data, 200, lang, count=len(data))
    except Exception as exc:
        log_error(vn, "GET", exc)
        return err('fetch_error', status_code=500, lang=lang)
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
    AcademicYear, SchoolBreak, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, ClassLevelCost, Term, PaymentType, SchoolDaySetting,
    Holiday
)
from .serializers import (
    AcademicYearSerializer, SchoolBreakSerializer, SchoolLevelSerializer, ClassLevelSerializer,
    ClassRoomSerializer, SubjectSerializer, ClassLevelSubjectSerializer,
    ClassLevelCostSerializer, TermSerializer, PaymentTypeSerializer, SchoolDaySettingSerializer,
    HolidaySerializer
)
from .translations import get_translation, get_notification_title, get_notification_message
from notifications.services import NotificationService


# ══════════════════════════════════════════════════════════════════════════════
#  RESPONSE HELPERS
# ══════════════════════════════════════════════════════════════════════════════

def ok(message_key, data=None, status_code=200, lang='en', **kwargs):
    """Build a successful JSON response with a translated message."""
    message = get_translation(message_key, lang, **kwargs)
    body = {"success": True, "message": message}
    if data is not None:
        body["data"] = data

    print(f"\n  ✔  RESPONSE | HTTP {status_code}")
    print(f"  Message : {message}")
    print("=" * 80 + "\n")

    return Response(body, status=status_code)


def err(message_key_or_text, errors=None, status_code=400, lang='en', **kwargs):
    """
    Build an error JSON response.

    ``message_key_or_text`` is first looked up in the translation table.
    If not found it is used verbatim, so callers may also pass a
    ready-made human-readable string directly.
    """
    # Try to translate; fall back to the raw value when it is not a key.
    message = get_translation(message_key_or_text, lang, **kwargs)
    if message == message_key_or_text:
        # get_translation returned the key unchanged → it was already a sentence
        message = message_key_or_text

    body = {"success": False, "message": message}
    if errors is not None:
        body["errors"] = errors

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
    lang = request.headers.get('X-Language') or request.query_params.get('lang') or 'en'
    request.lang = lang if lang in ('en', 'fr', 'rw') else 'en'
    return request.lang


def _first_error(serializer_errors):
    """Pull the first human-readable error string from a DRF error dict."""
    for field_errors in serializer_errors.values():
        if isinstance(field_errors, list) and field_errors:
            return str(field_errors[0])
        if isinstance(field_errors, str):
            return field_errors
    return "Validation failed."


def log_request(view_name, request, extra_data=None):
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
    print(f"\n  ✘  ERROR | {view_name} | {step}")
    print(f"     {type(exc).__name__}: {exc}")
    if exc.__traceback__:
        print(f"     line {exc.__traceback__.tb_lineno}")
        print(traceback.format_exc())
    print("-" * 80)


def _notify(user, notification_type, title_key, message_key, lang='en',
            extra_data=None, action_url='/', priority='medium'):
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


def _extract_integrity_message(exc, lang):
    """
    Convert a database IntegrityError into a user-friendly translated message.
    Returns the translated string (not a key).
    """
    error_msg = str(exc).lower()
    print(f"  [IntegrityError detail] {exc}")

    if 'unique' in error_msg or 'duplicate' in error_msg or '1062' in error_msg:
        raw = str(exc)
        # Try to identify which field caused the violation
        if 'assigned_class_level_id' in raw:
            return get_translation('classroom_already_assigned_to_class_level', lang)
        if 'code' in raw:
            return get_translation('code_already_exists', lang)
        if 'name' in raw:
            return get_translation('duplicate_name', lang)
        return get_translation('already_exists', lang)

    if 'foreign key' in error_msg or '1452' in error_msg:
        return get_translation('invalid_reference', lang)

    if 'not null' in error_msg or '1048' in error_msg:
        return get_translation('required_field_missing', lang)

    return get_translation('create_error', lang)


def _extract_django_validation_message(exc, lang):
    """
    Convert a Django ValidationError into a single user-friendly string.
    The translated string is returned (not a key).
    """
    print(f"  [ValidationError detail] {exc.message_dict if hasattr(exc, 'message_dict') else exc.messages}")

    if hasattr(exc, 'message_dict'):
        messages = []
        for field, msgs in exc.message_dict.items():
            for msg in msgs:
                if field == '__all__':
                    messages.append(str(msg))
                else:
                    messages.append(f"{field}: {msg}")
        return " | ".join(messages) if messages else get_translation('validation_failed', lang)

    if hasattr(exc, 'messages'):
        return " | ".join(str(m) for m in exc.messages)

    return str(exc)


def _handle_save_errors(exc, view_name, step, lang):
    """
    Central handler for errors raised during model.save() / serializer.save().
    Logs the error and returns a ready-to-send Response.
    """
    log_error(view_name, step, exc)

    if isinstance(exc, DjangoValidationError):
        msg = _extract_django_validation_message(exc, lang)
        return err(msg, status_code=400, lang=lang)

    if isinstance(exc, IntegrityError):
        msg = _extract_integrity_message(exc, lang)
        return err(msg, status_code=400, lang=lang)

    # Generic unexpected error — show translated generic message but keep
    # the raw exception visible on the terminal (already logged above).
    return err('create_error', status_code=500, lang=lang)


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
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'academic_year_created',
                'academic_year_created_title', 'academic_year_create_msg', lang,
                {'academic_year_id': obj.id, 'name': obj.name},
                '/app/academics/academic-years')
        return ok('academic_year_create_msg', serializer.data, 201, lang, name=obj.name)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def academic_year_detail(request, pk):
    vn = "AcademicYearDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(AcademicYear, id=pk)

    if request.method == 'GET':
        data = AcademicYearSerializer(obj, context={'request': request}).data
        return ok('academic_year_fetched', data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        serializer = AcademicYearSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            _notify(request.user, 'academic_year_updated',
                    'academic_year_updated_title', 'academic_year_update_msg', lang,
                    {'academic_year_id': obj.id}, '/app/academics/academic-years', priority='low')
            return ok('academic_year_update_msg', serializer.data, 200, lang, name=old_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        try:
            name = obj.name
            with transaction.atomic():
                obj.delete()
            _notify(request.user, 'academic_year_deleted',
                    'academic_year_deleted_title', 'academic_year_delete_msg', lang,
                    {'name': name}, '/app/academics/academic-years')
            return ok('academic_year_delete_msg', None, 200, lang, name=name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


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

    if 'name' in request.data:
        request.data['name'] = request.data['name'].strip().title()

    serializer = SchoolLevelSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'school_level_created',
                'school_level_created_title', 'school_level_create_msg', lang,
                {'school_level_id': obj.id, 'name': obj.name}, '/app/academics/school-levels')
        return ok('school_level_create_msg', serializer.data, 201, lang, name=obj.name)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def school_level_detail(request, pk):
    vn = "SchoolLevelDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(SchoolLevel, id=pk)

    if request.method == 'GET':
        return ok('school_level_fetched', SchoolLevelSerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        if 'name' in request.data:
            request.data['name'] = request.data['name'].strip().title()

        serializer = SchoolLevelSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            _notify(request.user, 'school_level_updated',
                    'school_level_updated_title', 'school_level_update_msg', lang,
                    {'school_level_id': obj.id}, '/app/academics/school-levels', priority='low')
            return ok('school_level_update_msg', serializer.data, 200, lang, name=old_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        if obj.class_levels.filter(is_active=True).exists():
            return err('cannot_delete_has_children', status_code=400, lang=lang)
        try:
            name = obj.name
            with transaction.atomic():
                obj.delete()
            _notify(request.user, 'school_level_deleted',
                    'school_level_deleted_title', 'school_level_delete_msg', lang,
                    {'name': name}, '/app/academics/school-levels')
            return ok('school_level_delete_msg', None, 200, lang, name=name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


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

    if 'code' in request.data:
        request.data['code'] = request.data['code'].upper().strip()
        if not re.match(r'^[A-Z0-9]+$', request.data['code']):
            return err('class_code_invalid', status_code=400, lang=lang)

    serializer = ClassLevelSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'class_level_created',
                'class_level_created_title', 'class_level_create_msg', lang,
                {'class_level_id': obj.id, 'name': obj.name, 'code': obj.code},
                f'/app/academics/class-levels/{obj.id}')
        return ok('class_level_create_msg', serializer.data, 201, lang, name=obj.name, code=obj.code)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_level_detail(request, pk):
    vn = "ClassLevelDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(ClassLevel, id=pk)

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
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name, old_code = obj.name, obj.code
            with transaction.atomic():
                serializer.save()
            _notify(request.user, 'class_level_updated',
                    'class_level_updated_title', 'class_level_update_msg', lang,
                    {'class_level_id': obj.id}, f'/app/academics/class-levels/{obj.id}', priority='low')
            return ok('class_level_update_msg', serializer.data, 200, lang, name=old_name, code=old_code)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        if obj.subjects.exists():
            return err('cannot_delete_has_children', status_code=400, lang=lang)
        if obj.costs.exists():
            return err('cannot_delete_has_children', status_code=400, lang=lang)
        try:
            name, code = obj.name, obj.code
            with transaction.atomic():
                obj.delete()
            _notify(request.user, 'class_level_deleted',
                    'class_level_deleted_title', 'class_level_delete_msg', lang,
                    {'name': name, 'code': code}, '/app/academics/class-levels')
            return ok('class_level_delete_msg', None, 200, lang, name=name, code=code)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


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

    if 'code' in request.data:
        request.data['code'] = request.data['code'].upper().strip()
        if not re.match(r'^[A-Z0-9]+$', request.data['code']):
            return err('room_code_invalid', status_code=400, lang=lang)

    serializer = ClassRoomSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'classroom_created',
                'classroom_created_title', 'classroom_create_msg', lang,
                {'classroom_id': obj.id, 'name': obj.name}, f'/app/academics/class-rooms/{obj.id}')
        return ok('classroom_create_msg', serializer.data, 201, lang, name=obj.name, code=obj.code)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def classroom_detail(request, pk):
    vn = "ClassroomDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(ClassRoom, id=pk)

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
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            _notify(request.user, 'classroom_updated',
                    'classroom_updated_title', 'classroom_update_msg', lang,
                    {'classroom_id': obj.id}, f'/app/academics/class-rooms/{obj.id}', priority='low')
            return ok('classroom_update_msg', serializer.data, 200, lang, name=old_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        try:
            name = obj.name
            with transaction.atomic():
                obj.delete()
            _notify(request.user, 'classroom_deleted',
                    'classroom_deleted_title', 'classroom_delete_msg', lang,
                    {'name': name}, '/app/academics/class-rooms')
            return ok('classroom_delete_msg', None, 200, lang, name=name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


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

    if 'code' in request.data:
        request.data['code'] = request.data['code'].upper().strip()
        if not re.match(r'^[A-Z0-9]+$', request.data['code']):
            return err('subject_code_invalid', status_code=400, lang=lang)

    serializer = SubjectSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'subject_created',
                'subject_created_title', 'subject_create_msg', lang,
                {'subject_id': obj.id, 'name': obj.name}, f'/app/academics/subjects/{obj.id}')
        return ok('subject_create_msg', serializer.data, 201, lang, name=obj.name, code=obj.code)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def subject_detail(request, pk):
    vn = "SubjectDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(Subject, id=pk)

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
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            _notify(request.user, 'subject_updated',
                    'subject_updated_title', 'subject_update_msg', lang,
                    {'subject_id': obj.id}, f'/app/academics/subjects/{obj.id}', priority='low')
            return ok('subject_update_msg', serializer.data, 200, lang, name=old_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        if obj.class_levels.exists():
            return err('cannot_delete_has_children', status_code=400, lang=lang)
        try:
            name, code = obj.name, obj.code
            with transaction.atomic():
                obj.delete()
            _notify(request.user, 'subject_deleted',
                    'subject_deleted_title', 'subject_delete_msg', lang,
                    {'name': name}, '/app/academics/subjects')
            return ok('subject_delete_msg', None, 200, lang, name=name, code=code)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


# ══════════════════════════════════════════════════════════════════════════════
#  CLASS LEVEL SUBJECT (ASSIGNMENTS)
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
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'subject_assigned',
                'subject_assigned_title', 'assign_msg', lang,
                {'assignment_id': obj.id, 'class_level': obj.class_level.name, 'subject': obj.subject.name},
                f'/app/academics/class-levels/{obj.class_level.id}')
        return ok('assign_msg', serializer.data, 201, lang,
                  subject=obj.subject.name, class_level=obj.class_level.name)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


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
                'subject_unassigned_title', 'unassign_msg', lang,
                {'class_level': cl_name, 'subject': sub_name}, '/app/academics/assignments')
        return ok('unassign_msg', None, 200, lang, subject=sub_name, class_level=cl_name)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'DELETE', lang)


# ══════════════════════════════════════════════════════════════════════════════
#  FEE STRUCTURES (ClassLevelCost)
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
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'fee_structure_created',
                'fee_structure_created_title', 'fee_structure_create_msg', lang,
                {'cost_id': obj.id, 'name': obj.name, 'amount': str(obj.amount)},
                f'/app/academics/class-levels/{obj.class_level.id}')
        return ok('fee_structure_create_msg', serializer.data, 201, lang,
                  name=obj.name, class_level=obj.class_level.name)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_level_cost_detail(request, pk):
    vn = "ClassLevelCostDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(ClassLevelCost, id=pk)

    if request.method == 'GET':
        return ok('cost_fetched', ClassLevelCostSerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        serializer = ClassLevelCostSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            _notify(request.user, 'fee_structure_updated',
                    'fee_structure_updated_title', 'fee_structure_update_msg', lang,
                    {'cost_id': obj.id}, f'/app/academics/class-levels/{obj.class_level.id}', priority='low')
            return ok('fee_structure_update_msg', serializer.data, 200, lang, name=old_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        try:
            name, cl_name = obj.name, obj.class_level.name
            with transaction.atomic():
                obj.delete()
            _notify(request.user, 'fee_structure_deleted',
                    'fee_structure_deleted_title', 'fee_structure_delete_msg', lang,
                    {'name': name, 'class_level': cl_name}, '/app/academics/costs')
            return ok('fee_structure_delete_msg', None, 200, lang, name=name, class_level=cl_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


# ══════════════════════════════════════════════════════════════════════════════
#  TERMS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def term_list_create(request):
    vn = "TermListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = Term.objects.select_related('academic_year').all()
            if ay := request.query_params.get('academic_year'):
                qs = qs.filter(academic_year_id=ay)
            if curr := request.query_params.get('is_current'):
                qs = qs.filter(is_current=(curr.lower() == 'true'))
            data = TermSerializer(qs, many=True, context={'request': request}).data
            return ok('terms_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    serializer = TermSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'term_created',
                'term_created_title', 'term_create_msg', lang,
                {'term_id': obj.id, 'name': obj.name}, f'/app/academics/terms/{obj.id}')
        return ok('term_create_msg', serializer.data, 201, lang, name=obj.name)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def term_detail(request, pk):
    vn = "TermDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(Term, id=pk)

    if request.method == 'GET':
        return ok('term_fetched', TermSerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        serializer = TermSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            _notify(request.user, 'term_updated',
                    'term_updated_title', 'term_update_msg', lang,
                    {'term_id': obj.id}, f'/app/academics/terms/{obj.id}', priority='low')
            return ok('term_update_msg', serializer.data, 200, lang, name=old_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        try:
            name = obj.name
            with transaction.atomic():
                obj.delete()
            _notify(request.user, 'term_deleted',
                    'term_deleted_title', 'term_delete_msg', lang,
                    {'name': name}, '/app/academics/terms')
            return ok('term_delete_msg', None, 200, lang, name=name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


# ══════════════════════════════════════════════════════════════════════════════
#  PAYMENT TYPES
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def payment_type_list_create(request):
    vn = "PaymentTypeListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = PaymentType.objects.filter(is_active=True)
            data = PaymentTypeSerializer(qs, many=True, context={'request': request}).data
            return ok('payment_types_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    serializer = PaymentTypeSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        return ok('payment_type_create_msg', serializer.data, 201, lang, name=obj.name)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


# ══════════════════════════════════════════════════════════════════════════════
#  SCHOOL DAY SETTINGS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def school_day_setting_list_create(request):
    vn = "SchoolDaySettingListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = SchoolDaySetting.objects.select_related('academic_year').all()
            if ay := request.query_params.get('academic_year'):
                qs = qs.filter(academic_year_id=ay)
            if dt := request.query_params.get('day_type'):
                qs = qs.filter(day_type=dt)
            if active := request.query_params.get('is_active'):
                qs = qs.filter(is_active=(active.lower() == 'true'))
            data = SchoolDaySettingSerializer(qs, many=True, context={'request': request}).data
            return ok('day_settings_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    serializer = SchoolDaySettingSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'day_setting_created',
                'day_setting_created_title', 'day_setting_create_msg', lang,
                {'setting_id': obj.id}, f'/app/academics/day-settings/{obj.id}')
        return ok('day_setting_create_msg', serializer.data, 201, lang)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def school_day_setting_detail(request, pk):
    vn = "SchoolDaySettingDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(SchoolDaySetting, id=pk)

    if request.method == 'GET':
        return ok('day_setting_fetched', SchoolDaySettingSerializer(obj, context={'request': request}).data, 200, lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        serializer = SchoolDaySettingSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            with transaction.atomic():
                serializer.save()
            return ok('day_setting_update_msg', serializer.data, 200, lang)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        try:
            with transaction.atomic():
                obj.delete()
            return ok('day_setting_delete_msg', None, 200, lang)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


# ══════════════════════════════════════════════════════════════════════════════
#  SCHOOL BREAKS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def school_break_list_create(request):
    vn = "SchoolBreakListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = SchoolBreak.objects.select_related('school_level').all()
            if sl := request.query_params.get('school_level'):
                qs = qs.filter(school_level_id=sl)
            if bt := request.query_params.get('break_type'):
                qs = qs.filter(break_type=bt)
            if active := request.query_params.get('is_active'):
                qs = qs.filter(is_active=(active.lower() == 'true'))
            data = SchoolBreakSerializer(qs, many=True, context={'request': request}).data
            return ok('breaks_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    serializer = SchoolBreakSerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'break_created',
                'break_created_title', 'break_create_msg', lang,
                {'break_id': obj.id, 'name': obj.name, 'school_level': obj.school_level.name},
                f'/app/academics/school-breaks/{obj.id}')
        return ok('break_create_msg', serializer.data, 201, lang,
                  name=obj.name, school_level=obj.school_level.name)
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def school_break_detail(request, pk):
    vn = "SchoolBreakDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(SchoolBreak, id=pk)

    if request.method == 'GET':
        return ok('break_fetched', SchoolBreakSerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        serializer = SchoolBreakSerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            _notify(request.user, 'break_updated',
                    'break_updated_title', 'break_update_msg', lang,
                    {'break_id': obj.id}, f'/app/academics/school-breaks/{obj.id}', priority='low')
            return ok('break_update_msg', serializer.data, 200, lang, name=old_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        try:
            name, sl_name = obj.name, obj.school_level.name
            with transaction.atomic():
                obj.delete()
            _notify(request.user, 'break_deleted',
                    'break_deleted_title', 'break_delete_msg', lang,
                    {'name': name, 'school_level': sl_name}, '/app/academics/school-breaks')
            return ok('break_delete_msg', None, 200, lang, name=name, school_level=sl_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_breaks_by_school_level(request, school_level_id):
    vn = "GetBreaksBySchoolLevel"
    lang = get_lang(request)
    log_request(vn, request, {'school_level_id': school_level_id})
    try:
        qs = SchoolBreak.objects.filter(school_level_id=school_level_id, is_active=True).order_by('start_time')
        data = SchoolBreakSerializer(qs, many=True, context={'request': request}).data
        return ok('breaks_fetched', data, 200, lang, count=len(data))
    except Exception as exc:
        log_error(vn, "GET", exc)
        return err('fetch_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  HOLIDAYS
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def holiday_list_create(request):
    vn = "HolidayListCreate"
    lang = get_lang(request)
    log_request(vn, request)

    if request.method == 'GET':
        try:
            qs = Holiday.objects.select_related('school_level', 'academic_year').all()
            if ay := request.query_params.get('academic_year'):
                qs = qs.filter(academic_year_id=ay)
            if sl := request.query_params.get('school_level'):
                qs = qs.filter(school_level_id=sl)
            if recurring := request.query_params.get('is_recurring'):
                qs = qs.filter(is_recurring=(recurring.lower() == 'true'))
            if start_date := request.query_params.get('start_date'):
                qs = qs.filter(date__gte=start_date)
            if end_date := request.query_params.get('end_date'):
                qs = qs.filter(date__lte=end_date)
            data = HolidaySerializer(qs, many=True, context={'request': request}).data
            return ok('holidays_fetched', data, 200, lang, count=len(data))
        except Exception as exc:
            log_error(vn, 'GET', exc)
            return err('fetch_error', status_code=500, lang=lang)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    serializer = HolidaySerializer(data=request.data, context={'request': request})
    if not serializer.is_valid():
        first = _first_error(serializer.errors)
        return err(first, errors=serializer.errors, status_code=400, lang=lang)

    try:
        with transaction.atomic():
            obj = serializer.save()
        _notify(request.user, 'holiday_created',
                'holiday_created_title', 'holiday_create_msg', lang,
                {'holiday_id': obj.id, 'name': obj.name, 'date': str(obj.date)},
                f'/app/academics/holidays/{obj.id}')
        return ok('holiday_create_msg', serializer.data, 201, lang,
                  name=obj.name, date=obj.date.isoformat())
    except Exception as exc:
        return _handle_save_errors(exc, vn, 'POST', lang)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def holiday_detail(request, pk):
    vn = "HolidayDetail"
    lang = get_lang(request)
    log_request(vn, request, {'pk': pk})

    obj = get_object_or_404(Holiday, id=pk)

    if request.method == 'GET':
        return ok('holiday_fetched', HolidaySerializer(obj, context={'request': request}).data, 200, lang, name=obj.name)

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    if request.method == 'PUT':
        serializer = HolidaySerializer(obj, data=request.data, partial=True, context={'request': request})
        if not serializer.is_valid():
            first = _first_error(serializer.errors)
            return err(first, errors=serializer.errors, status_code=400, lang=lang)
        try:
            old_name = obj.name
            with transaction.atomic():
                serializer.save()
            _notify(request.user, 'holiday_updated',
                    'holiday_updated_title', 'holiday_update_msg', lang,
                    {'holiday_id': obj.id}, f'/app/academics/holidays/{obj.id}', priority='low')
            return ok('holiday_update_msg', serializer.data, 200, lang, name=old_name)
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'PUT', lang)

    if request.method == 'DELETE':
        try:
            name, holiday_date = obj.name, obj.date
            with transaction.atomic():
                obj.delete()
            _notify(request.user, 'holiday_deleted',
                    'holiday_deleted_title', 'holiday_delete_msg', lang,
                    {'name': name, 'date': str(holiday_date)}, '/app/academics/holidays')
            return ok('holiday_delete_msg', None, 200, lang, name=name, date=holiday_date.isoformat())
        except Exception as exc:
            return _handle_save_errors(exc, vn, 'DELETE', lang)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_holidays_by_academic_year(request, academic_year_id):
    vn = "GetHolidaysByAcademicYear"
    lang = get_lang(request)
    log_request(vn, request, {'academic_year_id': academic_year_id})
    try:
        qs = Holiday.objects.filter(academic_year_id=academic_year_id).select_related('school_level').order_by('date')
        data = HolidaySerializer(qs, many=True, context={'request': request}).data
        return ok('holidays_fetched', data, 200, lang, count=len(data))
    except Exception as exc:
        log_error(vn, "GET", exc)
        return err('fetch_error', status_code=500, lang=lang)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_holidays_by_date_range(request):
    vn = "GetHolidaysByDateRange"
    lang = get_lang(request)
    log_request(vn, request)
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        academic_year_id = request.query_params.get('academic_year')
        if not start_date or not end_date:
            return err('missing_dates', status_code=400, lang=lang)
        from datetime import datetime
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()
        qs = Holiday.objects.filter(date__gte=start, date__lte=end).select_related('school_level', 'academic_year')
        if academic_year_id:
            qs = qs.filter(academic_year_id=academic_year_id)
        data = HolidaySerializer(qs, many=True, context={'request': request}).data
        return ok('holidays_fetched', data, 200, lang, count=len(data))
    except Exception as exc:
        log_error(vn, "GET", exc)
        return err('fetch_error', status_code=500, lang=lang)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_upcoming_holidays(request):
    vn = "GetUpcomingHolidays"
    lang = get_lang(request)
    log_request(vn, request)
    try:
        from datetime import date
        today = date.today()
        qs = Holiday.objects.filter(date__gte=today, is_recurring=False).select_related('school_level', 'academic_year').order_by('date')
        if ay := request.query_params.get('academic_year'):
            qs = qs.filter(academic_year_id=ay)
        if sl := request.query_params.get('school_level'):
            qs = qs.filter(school_level_id=sl)
        data = HolidaySerializer(qs, many=True, context={'request': request}).data
        return ok('holidays_fetched', data, 200, lang, count=len(data))
    except Exception as exc:
        log_error(vn, "GET", exc)
        return err('fetch_error', status_code=500, lang=lang)


# ══════════════════════════════════════════════════════════════════════════════
#  CLASSROOM ASSIGNMENT
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def assign_classroom_to_class_level(request, classroom_id):
    """
    Assign a classroom to a class level.

    Business rules enforced here (not relying solely on the DB constraint):
      • classroom must exist
      • class_level_id must be provided and valid
      • class level must be active
      • the classroom must not already be assigned to a DIFFERENT class level
      • no other classroom should already be assigned to the same class level
        if a unique DB constraint exists (prevents the IntegrityError crash)
    """
    vn = "AssignClassroomToClassLevel"
    lang = get_lang(request)
    log_request(vn, request, {'classroom_id': classroom_id})

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    # ── 1. Resolve classroom ────────────────────────────────────────────────
    classroom = get_object_or_404(ClassRoom, id=classroom_id)

    # ── 2. Validate payload ─────────────────────────────────────────────────
    class_level_id = request.data.get('class_level_id')
    if not class_level_id:
        return err('missing_class_level', status_code=400, lang=lang)

    class_level = get_object_or_404(ClassLevel, id=class_level_id)

    if not class_level.is_active:
        return err('class_level_inactive', status_code=400, lang=lang)

    # ── 3. Guard: classroom already assigned to a DIFFERENT class level ──────
    if classroom.assigned_class_level and classroom.assigned_class_level.id != class_level.id:
        print(
            f"  [ASSIGN] Classroom '{classroom.name}' is already assigned to "
            f"'{classroom.assigned_class_level.name}'. Cannot reassign to '{class_level.name}'."
        )
        return err(
            'classroom_already_assigned',
            status_code=400,
            lang=lang,
            classroom=classroom.name,
            class_level=classroom.assigned_class_level.name,
        )

    # ── 5. Perform the assignment ────────────────────────────────────────────
    try:
        old_assignment = classroom.assigned_class_level
        classroom.assigned_class_level = class_level
        classroom.full_clean()          # run model-level validation before saving
        classroom.save(update_fields=['assigned_class_level', 'updated_at'])

        _notify(
            request.user, 'classroom_assigned',
            'classroom_assigned_title', 'classroom_assign_msg', lang,
            {'classroom': classroom.name, 'class_level': class_level.name},
            f'/app/academics/classrooms/{classroom.id}',
        )

        if old_assignment:
            message = get_translation(
                'classroom_reassigned_msg', lang,
                classroom=classroom.name,
                class_level=class_level.name,
                old_class_level=old_assignment.name,
            )
        else:
            message = get_translation(
                'classroom_assigned_msg', lang,
                classroom=classroom.name,
                class_level=class_level.name,
            )

        print(f"  ✔  ASSIGN | {message}")
        return Response(
            {'success': True, 'message': message,
             'data': ClassRoomSerializer(classroom, context={'request': request}).data},
            status=200,
        )

    except DjangoValidationError as exc:
        msg = _extract_django_validation_message(exc, lang)
        log_error(vn, 'assign (ValidationError)', exc)
        return err(msg, status_code=400, lang=lang)

    except IntegrityError as exc:
        # Last-resort safety net in case of a race condition
        msg = _extract_integrity_message(exc, lang)
        log_error(vn, 'assign (IntegrityError)', exc)
        return err(msg, status_code=400, lang=lang)

    except Exception as exc:
        log_error(vn, 'assign', exc)
        return err('assign_error', status_code=500, lang=lang)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def unassign_classroom(request, classroom_id):
    """Remove the assignment of a classroom from its class level."""
    vn = "UnassignClassroom"
    lang = get_lang(request)
    log_request(vn, request, {'classroom_id': classroom_id})

    if not is_admin(request.user):
        return err('admin_access_required', status_code=403, lang=lang)

    classroom = get_object_or_404(ClassRoom, id=classroom_id)

    if not classroom.assigned_class_level:
        return err('classroom_not_assigned', status_code=400, lang=lang)

    try:
        old_class_level = classroom.assigned_class_level
        classroom.assigned_class_level = None
        classroom.save(update_fields=['assigned_class_level', 'updated_at'])

        _notify(
            request.user, 'classroom_unassigned',
            'classroom_unassigned_title', 'classroom_unassign_msg', lang,
            {'classroom': classroom.name, 'class_level': old_class_level.name},
            f'/app/academics/classrooms/{classroom.id}',
        )

        return ok(
            'classroom_unassigned_msg',
            ClassRoomSerializer(classroom, context={'request': request}).data,
            200, lang,
            classroom=classroom.name,
            class_level=old_class_level.name,
        )

    except Exception as exc:
        log_error(vn, 'unassign', exc)
        return err('unassign_error', status_code=500, lang=lang)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_classrooms_by_class_level(request, class_level_id):
    vn = "GetClassroomsByClassLevel"
    lang = get_lang(request)
    log_request(vn, request, {'class_level_id': class_level_id})
    try:
        class_level = get_object_or_404(ClassLevel, id=class_level_id)
        classrooms = ClassRoom.objects.filter(assigned_class_level=class_level, status='active')
        data = ClassRoomSerializer(classrooms, many=True, context={'request': request}).data
        return ok('classrooms_fetched', data, 200, lang, count=len(data))
    except Exception as exc:
        log_error(vn, "GET", exc)
        return err('fetch_error', status_code=500, lang=lang)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unassigned_classrooms(request):
    vn = "GetUnassignedClassrooms"
    lang = get_lang(request)
    log_request(vn, request)
    try:
        classrooms = ClassRoom.objects.filter(assigned_class_level__isnull=True, status='active')
        data = ClassRoomSerializer(classrooms, many=True, context={'request': request}).data
        return ok('unassigned_classrooms_fetched', data, 200, lang, count=len(data))
    except Exception as exc:
        log_error(vn, "GET", exc)
        return err('fetch_error', status_code=500, lang=lang)


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
                {'id': current_year.id, 'name': current_year.name}
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


# ══════════════════════════════════════════════════════════════════════════════
#  LEARNING DAYS UTILITY
# ══════════════════════════════════════════════════════════════════════════════

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_learning_days(request):
    vn = "GetLearningDays"
    lang = get_lang(request)
    log_request(vn, request)
    try:
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        academic_year_id = request.query_params.get('academic_year')

        if not start_date or not end_date:
            return err('missing_dates', status_code=400, lang=lang)

        from datetime import datetime, timedelta
        start = datetime.strptime(start_date, '%Y-%m-%d').date()
        end = datetime.strptime(end_date, '%Y-%m-%d').date()

        settings_qs = SchoolDaySetting.objects.filter(academic_year_id=academic_year_id, is_active=True)

        learning_weekdays = set(settings_qs.filter(day_type='learning', weekday__isnull=False).values_list('weekday', flat=True))
        day_off_dates = set(settings_qs.filter(day_type='day_off', specific_date__isnull=False).values_list('specific_date', flat=True))
        special_dates = set(settings_qs.filter(day_type='special', specific_date__isnull=False).values_list('specific_date', flat=True))
        day_off_weekdays = set(settings_qs.filter(day_type='day_off', weekday__isnull=False).values_list('weekday', flat=True))

        learning_days = []
        current = start
        while current <= end:
            description = None
            if current in special_dates:
                setting = settings_qs.filter(specific_date=current, day_type='special').first()
                description = setting.description if setting else None
                is_learning = True
            elif current in day_off_dates or current.weekday() in day_off_weekdays:
                is_learning = False
            elif current.weekday() in learning_weekdays:
                is_learning = True
            else:
                is_learning = False

            if is_learning:
                learning_days.append({
                    'date': current.isoformat(),
                    'weekday': current.strftime('%A'),
                    'description': description,
                })
            current += timedelta(days=1)

        return ok('learning_days_fetched', {
            'start_date': start_date,
            'end_date': end_date,
            'learning_days': learning_days,
            'total_learning_days': len(learning_days),
        }, 200, lang)

    except Exception as exc:
        log_error(vn, 'GET', exc)
        return err('fetch_error', status_code=500, lang=lang)
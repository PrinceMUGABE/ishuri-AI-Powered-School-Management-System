import logging
import traceback
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError as DjangoValidationError

from .models import (
    AcademicYear, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, ClassLevelCost, ClassRoomSubject
)
from .serializers import (
    AcademicYearListSerializer, AcademicYearDetailSerializer, AcademicYearCreateUpdateSerializer,
    SchoolLevelListSerializer, SchoolLevelDetailSerializer,
    ClassLevelListSerializer, ClassLevelDetailSerializer, ClassLevelCreateUpdateSerializer,
    ClassRoomListSerializer, ClassRoomDetailSerializer, ClassRoomCreateUpdateSerializer,
    SubjectListSerializer, SubjectDetailSerializer, SubjectCreateUpdateSerializer,
    ClassLevelSubjectListSerializer, ClassLevelSubjectDetailSerializer, ClassLevelSubjectCreateUpdateSerializer,
    ClassLevelCostListSerializer, ClassLevelCostDetailSerializer, ClassLevelCostCreateUpdateSerializer,
    ClassRoomSubjectListSerializer, ClassRoomSubjectDetailSerializer
)
from notifications.services import NotificationService

logger = logging.getLogger(__name__)

# ==================== HELPER FUNCTIONS ====================

def get_request_language(request):
    """Detect language from request headers."""
    try:
        if request.headers.get('X-Language'):
            lang = request.headers.get('X-Language')
            if lang in ['en', 'fr', 'rw']:
                return lang
        
        if request.headers.get('Accept-Language'):
            accept_lang = request.headers.get('Accept-Language')
            lang = accept_lang.split(',')[0].split('-')[0]
            if lang in ['en', 'fr', 'rw']:
                return lang
        
        if request.user.is_authenticated and hasattr(request.user, 'language'):
            if request.user.language in ['en', 'fr', 'rw']:
                return request.user.language
    except Exception:
        pass
    
    return 'en'


def is_admin(user):
    """Check if user is admin."""
    return user.is_authenticated and user.role == 'admin'


def is_teacher(user):
    """Check if user is teacher."""
    return user.is_authenticated and user.role == 'teacher'


def is_admin_or_teacher(user):
    """Check if user is admin or teacher."""
    return user.is_authenticated and user.role in ['admin', 'teacher']


def get_academics_message(key, lang, **kwargs):
    """Simple translation function for academics messages."""
    messages = {
        'en': {
            'create_success': f"{kwargs.get('name', 'Item')} created successfully",
            'update_success': f"{kwargs.get('name', 'Item')} updated successfully",
            'delete_success': f"{kwargs.get('name', 'Item')} deleted successfully",
            'assign_success': "Subject assigned successfully",
            'unassign_success': "Subject unassigned successfully",
            'academic_year_created': "Academic Year Created",
            'academic_year_updated': "Academic Year Updated",
            'academic_year_deleted': "Academic Year Deleted",
            'school_level_created': "School Level Created",
            'class_level_created': "Class Level Created",
            'classroom_created': "Classroom Created",
            'classroom_updated': "Classroom Updated",
            'subject_created': "Subject Created",
            'subject_updated': "Subject Updated",
            'subject_deleted': "Subject Deleted",
            'subject_assigned': "Subject Assigned",
            'subject_unassigned': "Subject Unassigned",
            'cost_added': "Fee Structure Added",
            'cost_updated': "Fee Structure Updated",
        },
        'fr': {
            'create_success': f"{kwargs.get('name', 'Élément')} créé avec succès",
            'update_success': f"{kwargs.get('name', 'Élément')} mis à jour avec succès",
            'delete_success': f"{kwargs.get('name', 'Élément')} supprimé avec succès",
            'assign_success': "Matière assignée avec succès",
            'unassign_success': "Matière désassignée avec succès",
            'academic_year_created': "Année académique créée",
            'school_level_created': "Niveau scolaire créé",
            'class_level_created': "Niveau de classe créé",
            'classroom_created': "Salle de classe créée",
            'subject_created': "Matière créée",
            'cost_added': "Structure de frais ajoutée",
        },
        'rw': {
            'create_success': f"{kwargs.get('name', 'Ikintu')} cyakozwe neza",
            'update_success': f"{kwargs.get('name', 'Ikintu')} cyahinduwe neza",
            'delete_success': f"{kwargs.get('name', 'Ikintu')} cyakuwe neza",
            'assign_success': "Icyigisho cyashyizweho neza",
            'unassign_success': "Icyigisho cyakuwe neza",
            'academic_year_created': "Umwaka w'amashuri wakozwe",
            'school_level_created': "Urwego rw'amashuri rwakozwe",
            'class_level_created': "Urwego rw'ishuri rwakozwe",
            'classroom_created': "Icyumba cy'amashuri cyakozwe",
            'subject_created': "Icyigisho cyakozwe",
            'cost_added': "Ibiciro byongewe",
        }
    }
    
    default_messages = {
        'create_success': "Item created successfully",
        'update_success': "Item updated successfully",
        'delete_success': "Item deleted successfully",
        'assign_success': "Subject assigned successfully",
        'unassign_success': "Subject unassigned successfully",
    }
    
    if lang not in messages:
        lang = 'en'
    
    return messages[lang].get(key, default_messages.get(key, key))


def print_request(view_name, method, request, extra=None):
    """Pretty print request details."""
    print("\n" + "="*80)
    print(f"  ▶  REQUEST  |  {view_name}  |  {method}")
    print("="*80)
    print(f"  User       : {request.user} (id={getattr(request.user, 'id', '-')}, role={getattr(request.user, 'role', '-')})")
    print(f"  Path       : {request.path}")
    print(f"  Method     : {method}")
    if request.query_params:
        print(f"  Params     : {dict(request.query_params)}")
    if request.data:
        safe_data = {k: ('***' if 'password' in k.lower() else v) for k, v in request.data.items()}
        print(f"  Body       : {safe_data}")
    if extra:
        for key, val in extra.items():
            print(f"  {key:<10} : {val}")
    print("-"*80)


def print_response(view_name, method, message, status_code, data=None):
    """Pretty print response details."""
    symbol = "✔" if status_code < 400 else "✘"
    print(f"  {symbol}  RESPONSE |  {view_name}  |  {method}  |  HTTP {status_code}")
    print(f"  Message    : {message}")
    if data:
        print(f"  Data       : {data}")
    print("="*80 + "\n")


def print_error(view_name, step, error, error_type="ERROR"):
    """Print error details to terminal."""
    print(f"\n  ✘  {error_type}  |  {view_name}  |  {step}")
    print(f"     Message   : {str(error)}")
    print(f"     Type      : {type(error).__name__}")
    if hasattr(error, '__traceback__') and error.__traceback__:
        print(f"     Line      : {error.__traceback__.tb_lineno}")
    print("-"*80)


# ==================== API ENDPOINTS ====================

# -------------------- ACADEMIC YEAR VIEWS --------------------

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def academic_year_list_create(request):
    """List and create academic years."""
    view_name = "academic_year_list_create"
    
    if request.method == 'GET':
        print_request(view_name, "GET", request)
        
        try:
            lang = get_request_language(request)
            
            try:
                queryset = AcademicYear.objects.all()
            except Exception as e:
                print_error(view_name, "database_query", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Database error occurred while fetching academic years',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            try:
                serializer = AcademicYearListSerializer(queryset, many=True, context={'request': request})
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'data': {
                        'count': queryset.count(),
                        'results': serializer.data
                    }
                }
                print_response(view_name, "GET", "Academic years retrieved successfully", status.HTTP_200_OK)
                return Response(response_data)
            except Exception as e:
                print_error(view_name, "serialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error serializing academic years',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'POST':
        # Check admin permission
        if not is_admin(request.user):
            return Response({
                'success': False,
                'status_code': status.HTTP_403_FORBIDDEN,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print_request(view_name, "POST", request)
        
        try:
            lang = get_request_language(request)
            
            try:
                serializer = AcademicYearCreateUpdateSerializer(data=request.data, context={'request': request})
            except Exception as e:
                print_error(view_name, "serializer_initialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error initializing serializer',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            try:
                if not serializer.is_valid():
                    print_error(view_name, "validation", serializer.errors)
                    return Response({
                        'success': False,
                        'status_code': status.HTTP_400_BAD_REQUEST,
                        'language': lang,
                        'errors': serializer.errors,
                        'message': 'Validation failed'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "validation_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Validation error occurred',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                with transaction.atomic():
                    academic_year = serializer.save()
            except IntegrityError as e:
                print_error(view_name, "integrity_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Academic year with this name already exists',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "save_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error saving academic year',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create notification
            try:
                NotificationService.create_user_notification(
                    user=request.user,
                    notification_type='academic_year_created',
                    title=get_academics_message('academic_year_created', lang),
                    message=get_academics_message('create_success', lang, name=academic_year.name),
                    created_by=request.user,
                    extra_data={'academic_year': academic_year.name},
                    action_url='/app/academics/academic-years',
                    priority='medium'
                )
            except Exception as e:
                print_error(view_name, "notification_error", e, "WARNING")
            
            try:
                serializer = AcademicYearDetailSerializer(academic_year)
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_201_CREATED,
                    'language': lang,
                    'message': get_academics_message('create_success', lang, name='Academic year'),
                    'data': serializer.data
                }
                print_response(view_name, "POST", "Academic year created successfully", status.HTTP_201_CREATED)
                return Response(response_data, status=status.HTTP_201_CREATED)
            except Exception as e:
                print_error(view_name, "response_serialization", e)
                return Response({
                    'success': True,
                    'status_code': status.HTTP_201_CREATED,
                    'language': lang,
                    'message': get_academics_message('create_success', lang, name='Academic year'),
                    'data': None
                }, status=status.HTTP_201_CREATED)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def academic_year_detail(request, pk):
    """Get, update, or delete an academic year."""
    view_name = "academic_year_detail"
    
    # Helper to get academic year
    def get_academic_year():
        try:
            return get_object_or_404(AcademicYear, id=pk)
        except Exception as e:
            print_error(view_name, "get_academic_year", e)
            return None
    
    if request.method == 'GET':
        print_request(view_name, "GET", request, extra={"academic_year_id": pk})
        
        try:
            lang = get_request_language(request)
            
            academic_year = get_academic_year()
            if not academic_year:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Academic year not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            try:
                serializer = AcademicYearDetailSerializer(academic_year)
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'data': serializer.data
                }
                print_response(view_name, "GET", "Academic year retrieved successfully", status.HTTP_200_OK)
                return Response(response_data)
            except Exception as e:
                print_error(view_name, "serialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error serializing academic year',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'PUT':
        # Check admin permission
        if not is_admin(request.user):
            return Response({
                'success': False,
                'status_code': status.HTTP_403_FORBIDDEN,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print_request(view_name, "PUT", request, extra={"academic_year_id": pk})
        
        try:
            lang = get_request_language(request)
            
            academic_year = get_academic_year()
            if not academic_year:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Academic year not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            try:
                serializer = AcademicYearCreateUpdateSerializer(academic_year, data=request.data, partial=True)
            except Exception as e:
                print_error(view_name, "serializer_initialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error initializing serializer',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            try:
                if not serializer.is_valid():
                    print_error(view_name, "validation", serializer.errors)
                    return Response({
                        'success': False,
                        'status_code': status.HTTP_400_BAD_REQUEST,
                        'language': lang,
                        'errors': serializer.errors,
                        'message': 'Validation failed'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "validation_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Validation error occurred',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                with transaction.atomic():
                    serializer.save()
            except IntegrityError as e:
                print_error(view_name, "integrity_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Academic year with this name already exists',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "save_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error updating academic year',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create notification
            try:
                NotificationService.create_user_notification(
                    user=request.user,
                    notification_type='academic_year_updated',
                    title=get_academics_message('academic_year_updated', lang),
                    message=get_academics_message('update_success', lang, name=academic_year.name),
                    created_by=request.user,
                    extra_data={'academic_year': academic_year.name},
                    action_url='/app/academics/academic-years',
                    priority='low'
                )
            except Exception as e:
                print_error(view_name, "notification_error", e, "WARNING")
            
            try:
                serializer = AcademicYearDetailSerializer(academic_year)
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'message': get_academics_message('update_success', lang, name='Academic year'),
                    'data': serializer.data
                }
                print_response(view_name, "PUT", "Academic year updated successfully", status.HTTP_200_OK)
                return Response(response_data)
            except Exception as e:
                print_error(view_name, "response_serialization", e)
                return Response({
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'message': get_academics_message('update_success', lang, name='Academic year'),
                    'data': None
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        # Check admin permission
        if not is_admin(request.user):
            return Response({
                'success': False,
                'status_code': status.HTTP_403_FORBIDDEN,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print_request(view_name, "DELETE", request, extra={"academic_year_id": pk})
        
        try:
            lang = get_request_language(request)
            
            academic_year = get_academic_year()
            if not academic_year:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Academic year not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            name = academic_year.name
            
            try:
                with transaction.atomic():
                    academic_year.delete()
            except Exception as e:
                print_error(view_name, "delete_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error deleting academic year',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create notification
            try:
                NotificationService.create_user_notification(
                    user=request.user,
                    notification_type='academic_year_deleted',
                    title=get_academics_message('academic_year_deleted', lang),
                    message=get_academics_message('delete_success', lang, name=name),
                    created_by=request.user,
                    extra_data={'academic_year': name},
                    priority='medium'
                )
            except Exception as e:
                print_error(view_name, "notification_error", e, "WARNING")
            
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'message': get_academics_message('delete_success', lang, name='Academic year')
            }
            print_response(view_name, "DELETE", "Academic year deleted successfully", status.HTTP_200_OK)
            return Response(response_data)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def current_academic_year(request):
    """Get the current academic year."""
    view_name = "current_academic_year"
    print_request(view_name, "GET", request)
    
    try:
        lang = get_request_language(request)
        
        try:
            current_year = AcademicYear.objects.get(is_current=True)
        except AcademicYear.DoesNotExist:
            return Response({
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': None,
                'message': 'No current academic year set'
            })
        except Exception as e:
            print_error(view_name, "database_query", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Database error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            serializer = AcademicYearDetailSerializer(current_year)
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': serializer.data
            }
            print_response(view_name, "GET", "Current academic year retrieved", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing academic year',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- SCHOOL LEVEL VIEWS --------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def school_level_list(request):
    """List school levels."""
    view_name = "school_level_list"
    print_request(view_name, "GET", request)
    
    try:
        lang = get_request_language(request)
        
        try:
            queryset = SchoolLevel.objects.filter(is_active=True)
        except Exception as e:
            print_error(view_name, "database_query", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Database error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            serializer = SchoolLevelListSerializer(queryset, many=True, context={'request': request})
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': serializer.data
            }
            print_response(view_name, "GET", "School levels retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing school levels',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def school_level_create(request):
    """Create a school level."""
    view_name = "school_level_create"
    
    # Check admin permission
    if not is_admin(request.user):
        return Response({
            'success': False,
            'status_code': status.HTTP_403_FORBIDDEN,
            'message': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    print_request(view_name, "POST", request)
    
    try:
        lang = get_request_language(request)
        data = request.data
        
        # Validate required fields
        if not data.get('name'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('level_type'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Level type is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                school_level = SchoolLevel.objects.create(
                    name=data.get('name'),
                    level_type=data.get('level_type'),
                    description=data.get('description', ''),
                    order=data.get('order', 0)
                )
        except IntegrityError as e:
            print_error(view_name, "integrity_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'School level with this name already exists',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print_error(view_name, "creation_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error creating school level',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create notification
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='school_level_created',
                title=get_academics_message('school_level_created', lang),
                message=get_academics_message('create_success', lang, name=school_level.name),
                created_by=request.user,
                extra_data={'school_level': school_level.name},
                action_url='/app/academics/school-levels',
                priority='medium'
            )
        except Exception as e:
            print_error(view_name, "notification_error", e, "WARNING")
        
        try:
            serializer = SchoolLevelDetailSerializer(school_level)
            response_data = {
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='School level'),
                'data': serializer.data
            }
            print_response(view_name, "POST", "School level created successfully", status.HTTP_201_CREATED)
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print_error(view_name, "response_serialization", e)
            return Response({
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='School level'),
                'data': None
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def school_level_detail(request, pk):
    """Get school level details with its class levels."""
    view_name = "school_level_detail"
    print_request(view_name, "GET", request, extra={"school_level_id": pk})
    
    try:
        lang = get_request_language(request)
        
        try:
            school_level = get_object_or_404(SchoolLevel, id=pk)
        except Exception as e:
            print_error(view_name, "get_object", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_404_NOT_FOUND,
                'language': lang,
                'message': 'School level not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            serializer = SchoolLevelDetailSerializer(school_level)
            
            # Get class levels
            try:
                class_levels = ClassLevel.objects.filter(school_level=school_level, is_active=True)
                class_levels_serializer = ClassLevelListSerializer(class_levels, many=True, context={'request': request})
            except Exception as e:
                print_error(view_name, "class_levels_query", e, "WARNING")
                class_levels_serializer = {"data": [], "count": 0}
            
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': {
                    'school_level': serializer.data,
                    'class_levels': class_levels_serializer.data
                }
            }
            print_response(view_name, "GET", "School level retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing school level',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- CLASS LEVEL VIEWS --------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_level_list(request):
    """List class levels with optional filters."""
    view_name = "class_level_list"
    print_request(view_name, "GET", request)
    
    try:
        lang = get_request_language(request)
        
        try:
            queryset = ClassLevel.objects.filter(is_active=True)
            
            # Apply filters
            school_level = request.query_params.get('school_level')
            if school_level:
                queryset = queryset.filter(school_level_id=school_level)
            
            category = request.query_params.get('category')
            if category:
                queryset = queryset.filter(category=category)
        except Exception as e:
            print_error(view_name, "database_query", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Database error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            serializer = ClassLevelListSerializer(queryset, many=True, context={'request': request})
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': serializer.data
            }
            print_response(view_name, "GET", "Class levels retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing class levels',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def class_level_create(request):
    """Create a class level."""
    view_name = "class_level_create"
    
    # Check admin permission
    if not is_admin(request.user):
        return Response({
            'success': False,
            'status_code': status.HTTP_403_FORBIDDEN,
            'message': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    print_request(view_name, "POST", request)
    
    try:
        lang = get_request_language(request)
        data = request.data
        
        # Validate required fields
        if not data.get('name'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('code'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('category'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Category is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('school_level'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'School level is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify school level exists
        try:
            school_level_obj = SchoolLevel.objects.get(id=data.get('school_level'))
        except SchoolLevel.DoesNotExist:
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Invalid school level ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                class_level = ClassLevel.objects.create(
                    name=data.get('name'),
                    code=data.get('code'),
                    category=data.get('category'),
                    school_level_id=data.get('school_level'),
                    description=data.get('description', ''),
                    order=data.get('order', 0),
                    default_teaching_frequency=data.get('default_teaching_frequency', 'daily')
                )
        except IntegrityError as e:
            print_error(view_name, "integrity_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Class level with this code already exists',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print_error(view_name, "creation_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error creating class level',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create notification
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='class_level_created',
                title=get_academics_message('class_level_created', lang),
                message=get_academics_message('create_success', lang, name=class_level.name),
                created_by=request.user,
                extra_data={'class_level': class_level.name},
                action_url=f'/app/academics/class-levels/{class_level.id}',
                priority='medium'
            )
        except Exception as e:
            print_error(view_name, "notification_error", e, "WARNING")
        
        try:
            serializer = ClassLevelDetailSerializer(class_level)
            response_data = {
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='Class level'),
                'data': serializer.data
            }
            print_response(view_name, "POST", "Class level created successfully", status.HTTP_201_CREATED)
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print_error(view_name, "response_serialization", e)
            return Response({
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='Class level'),
                'data': None
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_level_detail(request, pk):
    """Get class level with its classrooms, subjects, and costs."""
    view_name = "class_level_detail"
    print_request(view_name, "GET", request, extra={"class_level_id": pk})
    
    try:
        lang = get_request_language(request)
        
        try:
            class_level = get_object_or_404(ClassLevel, id=pk)
        except Exception as e:
            print_error(view_name, "get_object", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_404_NOT_FOUND,
                'language': lang,
                'message': 'Class level not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            serializer = ClassLevelDetailSerializer(class_level)
            
            # Get classrooms
            try:
                classrooms = ClassRoom.objects.filter(class_level=class_level, is_active=True)
                classrooms_serializer = ClassRoomListSerializer(classrooms, many=True, context={'request': request})
            except Exception as e:
                print_error(view_name, "classrooms_query", e, "WARNING")
                classrooms_serializer = {"data": [], "count": 0}
            
            # Get subjects
            try:
                subjects = ClassLevelSubject.objects.filter(class_level=class_level, status='active')
                subjects_serializer = ClassLevelSubjectListSerializer(subjects, many=True, context={'request': request})
            except Exception as e:
                print_error(view_name, "subjects_query", e, "WARNING")
                subjects_serializer = {"data": [], "count": 0}
            
            # Get costs
            try:
                costs = ClassLevelCost.objects.filter(class_level=class_level, is_active=True)
                costs_serializer = ClassLevelCostListSerializer(costs, many=True, context={'request': request})
            except Exception as e:
                print_error(view_name, "costs_query", e, "WARNING")
                costs_serializer = {"data": [], "count": 0}
            
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': {
                    'class_level': serializer.data,
                    'classrooms': classrooms_serializer.data,
                    'subjects': subjects_serializer.data,
                    'costs': costs_serializer.data
                }
            }
            print_response(view_name, "GET", "Class level details retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing class level data',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- CLASS ROOM VIEWS --------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def classroom_list(request):
    """List classrooms with optional filters."""
    view_name = "classroom_list"
    print_request(view_name, "GET", request)
    
    try:
        lang = get_request_language(request)
        
        try:
            queryset = ClassRoom.objects.filter(is_active=True)
            
            class_level = request.query_params.get('class_level')
            if class_level:
                queryset = queryset.filter(class_level_id=class_level)
            
            shift = request.query_params.get('shift')
            if shift:
                queryset = queryset.filter(shift=shift)
        except Exception as e:
            print_error(view_name, "database_query", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Database error occurred while fetching classrooms',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            serializer = ClassRoomListSerializer(queryset, many=True, context={'request': request})
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': serializer.data
            }
            print_response(view_name, "GET", "Classrooms retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing classrooms',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def classroom_create(request):
    """Create a classroom."""
    view_name = "classroom_create"
    
    # Check admin permission
    if not is_admin(request.user):
        return Response({
            'success': False,
            'status_code': status.HTTP_403_FORBIDDEN,
            'message': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    print_request(view_name, "POST", request)
    
    try:
        lang = get_request_language(request)
        data = request.data
        
        # Validate required fields
        if not data.get('class_level'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Class level is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('name'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Classroom name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify class level exists
        try:
            class_level_obj = ClassLevel.objects.get(id=data.get('class_level'))
        except ClassLevel.DoesNotExist:
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Invalid class level ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        name = data.get('name')
        code = data.get('code', f"{class_level_obj.code}{name}")
        full_name = data.get('full_name', f"{class_level_obj.name} {name}")
        
        # Check for duplicate code
        if ClassRoom.objects.filter(code=code).exists():
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': f'Classroom with code {code} already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                classroom = ClassRoom.objects.create(
                    class_level_id=data.get('class_level'),
                    name=name,
                    full_name=full_name,
                    code=code,
                    room_type=data.get('room_type', 'standard'),
                    shift=data.get('shift', 'morning'),
                    capacity=data.get('capacity', 30),
                    description=data.get('description', ''),
                    homeroom_teacher_id=data.get('homeroom_teacher')
                )
        except IntegrityError as e:
            print_error(view_name, "integrity_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Classroom with this code or name already exists',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print_error(view_name, "creation_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error creating classroom',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create notification
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='classroom_created',
                title=get_academics_message('classroom_created', lang),
                message=get_academics_message('create_success', lang, name=classroom.full_name),
                created_by=request.user,
                extra_data={'classroom': classroom.full_name},
                action_url=f'/app/academics/class-rooms/{classroom.id}',
                priority='medium'
            )
        except Exception as e:
            print_error(view_name, "notification_error", e, "WARNING")
        
        try:
            serializer = ClassRoomDetailSerializer(classroom)
            response_data = {
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='Classroom'),
                'data': serializer.data
            }
            print_response(view_name, "POST", "Classroom created successfully", status.HTTP_201_CREATED)
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print_error(view_name, "response_serialization", e)
            return Response({
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='Classroom'),
                'data': None
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def classroom_detail(request, pk):
    """Get, update, or delete a classroom."""
    view_name = "classroom_detail"
    
    def get_classroom():
        try:
            return get_object_or_404(ClassRoom, id=pk)
        except Exception as e:
            print_error(view_name, "get_classroom", e)
            return None
    
    if request.method == 'GET':
        print_request(view_name, "GET", request, extra={"classroom_id": pk})
        
        try:
            lang = get_request_language(request)
            
            classroom = get_classroom()
            if not classroom:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Classroom not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            try:
                serializer = ClassRoomDetailSerializer(classroom)
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'data': serializer.data
                }
                print_response(view_name, "GET", "Classroom retrieved successfully", status.HTTP_200_OK)
                return Response(response_data)
            except Exception as e:
                print_error(view_name, "serialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error serializing classroom',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'PUT':
        # Check admin permission
        if not is_admin(request.user):
            return Response({
                'success': False,
                'status_code': status.HTTP_403_FORBIDDEN,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print_request(view_name, "PUT", request, extra={"classroom_id": pk})
        
        try:
            lang = get_request_language(request)
            
            classroom = get_classroom()
            if not classroom:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Classroom not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            try:
                serializer = ClassRoomCreateUpdateSerializer(classroom, data=request.data, partial=True)
            except Exception as e:
                print_error(view_name, "serializer_initialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error initializing serializer',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            try:
                if not serializer.is_valid():
                    print_error(view_name, "validation", serializer.errors)
                    return Response({
                        'success': False,
                        'status_code': status.HTTP_400_BAD_REQUEST,
                        'language': lang,
                        'errors': serializer.errors,
                        'message': 'Validation failed'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "validation_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Validation error occurred',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                with transaction.atomic():
                    serializer.save()
            except IntegrityError as e:
                print_error(view_name, "integrity_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Classroom with this code already exists',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "save_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error updating classroom',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create notification
            try:
                NotificationService.create_user_notification(
                    user=request.user,
                    notification_type='classroom_updated',
                    title=get_academics_message('classroom_updated', lang),
                    message=get_academics_message('update_success', lang, name=classroom.full_name),
                    created_by=request.user,
                    extra_data={'classroom': classroom.full_name},
                    priority='low'
                )
            except Exception as e:
                print_error(view_name, "notification_error", e, "WARNING")
            
            try:
                serializer = ClassRoomDetailSerializer(classroom)
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'message': get_academics_message('update_success', lang, name='Classroom'),
                    'data': serializer.data
                }
                print_response(view_name, "PUT", "Classroom updated successfully", status.HTTP_200_OK)
                return Response(response_data)
            except Exception as e:
                print_error(view_name, "response_serialization", e)
                return Response({
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'message': get_academics_message('update_success', lang, name='Classroom'),
                    'data': None
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        # Check admin permission
        if not is_admin(request.user):
            return Response({
                'success': False,
                'status_code': status.HTTP_403_FORBIDDEN,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print_request(view_name, "DELETE", request, extra={"classroom_id": pk})
        
        try:
            lang = get_request_language(request)
            
            classroom = get_classroom()
            if not classroom:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Classroom not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            name = classroom.full_name
            
            try:
                with transaction.atomic():
                    classroom.delete()
            except Exception as e:
                print_error(view_name, "delete_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error deleting classroom',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'message': get_academics_message('delete_success', lang, name=name)
            }
            print_response(view_name, "DELETE", "Classroom deleted successfully", status.HTTP_200_OK)
            return Response(response_data)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- SUBJECT VIEWS --------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def subject_list(request):
    """List subjects with optional filters."""
    view_name = "subject_list"
    print_request(view_name, "GET", request)
    
    try:
        lang = get_request_language(request)
        
        try:
            queryset = Subject.objects.filter(is_active=True)
            
            category = request.query_params.get('category')
            if category:
                queryset = queryset.filter(category=category)
        except Exception as e:
            print_error(view_name, "database_query", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Database error occurred while fetching subjects',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            serializer = SubjectListSerializer(queryset, many=True, context={'request': request})
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': serializer.data
            }
            print_response(view_name, "GET", "Subjects retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing subjects',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def subject_create(request):
    """Create a subject."""
    view_name = "subject_create"
    
    # Check admin permission
    if not is_admin(request.user):
        return Response({
            'success': False,
            'status_code': status.HTTP_403_FORBIDDEN,
            'message': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    print_request(view_name, "POST", request)
    
    try:
        lang = get_request_language(request)
        data = request.data
        
        # Validate required fields
        if not data.get('name'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Subject name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('code'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Subject code is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check for duplicate code
        if Subject.objects.filter(code=data.get('code')).exists():
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': f'Subject with code {data.get("code")} already exists'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                subject = Subject.objects.create(
                    name=data.get('name'),
                    code=data.get('code'),
                    category=data.get('category', 'core'),
                    description=data.get('description', ''),
                    grading_system=data.get('grading_system', 'numeric'),
                    pass_mark=data.get('pass_mark', 50),
                    icon=data.get('icon', ''),
                    color=data.get('color', '')
                )
        except IntegrityError as e:
            print_error(view_name, "integrity_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Subject with this name or code already exists',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print_error(view_name, "creation_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error creating subject',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create notification
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='subject_created',
                title=get_academics_message('subject_created', lang),
                message=get_academics_message('create_success', lang, name=subject.name),
                created_by=request.user,
                extra_data={'subject': subject.name},
                action_url=f'/app/academics/subjects/{subject.id}',
                priority='medium'
            )
        except Exception as e:
            print_error(view_name, "notification_error", e, "WARNING")
        
        try:
            serializer = SubjectDetailSerializer(subject)
            response_data = {
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='Subject'),
                'data': serializer.data
            }
            print_response(view_name, "POST", "Subject created successfully", status.HTTP_201_CREATED)
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print_error(view_name, "response_serialization", e)
            return Response({
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='Subject'),
                'data': None
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def subject_detail(request, pk):
    """Get, update, or delete a subject."""
    view_name = "subject_detail"
    
    def get_subject():
        try:
            return get_object_or_404(Subject, id=pk)
        except Exception as e:
            print_error(view_name, "get_subject", e)
            return None
    
    if request.method == 'GET':
        print_request(view_name, "GET", request, extra={"subject_id": pk})
        
        try:
            lang = get_request_language(request)
            
            subject = get_subject()
            if not subject:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Subject not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            try:
                serializer = SubjectDetailSerializer(subject)
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'data': serializer.data
                }
                print_response(view_name, "GET", "Subject retrieved successfully", status.HTTP_200_OK)
                return Response(response_data)
            except Exception as e:
                print_error(view_name, "serialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error serializing subject',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'PUT':
        # Check admin permission
        if not is_admin(request.user):
            return Response({
                'success': False,
                'status_code': status.HTTP_403_FORBIDDEN,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print_request(view_name, "PUT", request, extra={"subject_id": pk})
        
        try:
            lang = get_request_language(request)
            
            subject = get_subject()
            if not subject:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Subject not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            try:
                serializer = SubjectCreateUpdateSerializer(subject, data=request.data, partial=True)
            except Exception as e:
                print_error(view_name, "serializer_initialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error initializing serializer',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            try:
                if not serializer.is_valid():
                    print_error(view_name, "validation", serializer.errors)
                    return Response({
                        'success': False,
                        'status_code': status.HTTP_400_BAD_REQUEST,
                        'language': lang,
                        'errors': serializer.errors,
                        'message': 'Validation failed'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "validation_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Validation error occurred',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                with transaction.atomic():
                    serializer.save()
            except IntegrityError as e:
                print_error(view_name, "integrity_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Subject with this code already exists',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "save_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error updating subject',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create notification
            try:
                NotificationService.create_user_notification(
                    user=request.user,
                    notification_type='subject_updated',
                    title=get_academics_message('subject_updated', lang),
                    message=get_academics_message('update_success', lang, name=subject.name),
                    created_by=request.user,
                    extra_data={'subject': subject.name},
                    priority='low'
                )
            except Exception as e:
                print_error(view_name, "notification_error", e, "WARNING")
            
            try:
                serializer = SubjectDetailSerializer(subject)
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'message': get_academics_message('update_success', lang, name='Subject'),
                    'data': serializer.data
                }
                print_response(view_name, "PUT", "Subject updated successfully", status.HTTP_200_OK)
                return Response(response_data)
            except Exception as e:
                print_error(view_name, "response_serialization", e)
                return Response({
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'message': get_academics_message('update_success', lang, name='Subject'),
                    'data': None
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        # Check admin permission
        if not is_admin(request.user):
            return Response({
                'success': False,
                'status_code': status.HTTP_403_FORBIDDEN,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print_request(view_name, "DELETE", request, extra={"subject_id": pk})
        
        try:
            lang = get_request_language(request)
            
            subject = get_subject()
            if not subject:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Subject not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            name = subject.name
            
            try:
                with transaction.atomic():
                    subject.delete()
            except Exception as e:
                print_error(view_name, "delete_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error deleting subject',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create notification
            try:
                NotificationService.create_user_notification(
                    user=request.user,
                    notification_type='subject_deleted',
                    title=get_academics_message('subject_deleted', lang),
                    message=get_academics_message('delete_success', lang, name=name),
                    created_by=request.user,
                    extra_data={'subject': name},
                    priority='medium'
                )
            except Exception as e:
                print_error(view_name, "notification_error", e, "WARNING")
            
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'message': get_academics_message('delete_success', lang, name='Subject')
            }
            print_response(view_name, "DELETE", "Subject deleted successfully", status.HTTP_200_OK)
            return Response(response_data)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- CLASS LEVEL SUBJECT VIEWS --------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_level_subject_list(request):
    """List class level subject assignments."""
    view_name = "class_level_subject_list"
    print_request(view_name, "GET", request)
    
    try:
        lang = get_request_language(request)
        
        try:
            queryset = ClassLevelSubject.objects.filter(status='active')
            
            class_level = request.query_params.get('class_level')
            if class_level:
                queryset = queryset.filter(class_level_id=class_level)
            
            subject = request.query_params.get('subject')
            if subject:
                queryset = queryset.filter(subject_id=subject)
        except Exception as e:
            print_error(view_name, "database_query", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Database error occurred while fetching assignments',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            serializer = ClassLevelSubjectListSerializer(queryset, many=True, context={'request': request})
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': serializer.data
            }
            print_response(view_name, "GET", "Subject assignments retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing assignments',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def class_level_subject_create(request):
    """Assign a subject to a class level."""
    view_name = "class_level_subject_create"
    
    # Check admin permission
    if not is_admin(request.user):
        return Response({
            'success': False,
            'status_code': status.HTTP_403_FORBIDDEN,
            'message': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    print_request(view_name, "POST", request)
    
    try:
        lang = get_request_language(request)
        data = request.data
        
        # Validate required fields
        if not data.get('class_level'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Class level is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('subject'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Subject is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify class level and subject exist
        try:
            class_level = ClassLevel.objects.get(id=data.get('class_level'))
        except ClassLevel.DoesNotExist:
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Invalid class level ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            subject_obj = Subject.objects.get(id=data.get('subject'))
        except Subject.DoesNotExist:
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Invalid subject ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if assignment already exists
        existing = ClassLevelSubject.objects.filter(
            class_level_id=data.get('class_level'),
            subject_id=data.get('subject')
        ).first()
        
        if existing:
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Subject is already assigned to this class level'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                assignment = ClassLevelSubject.objects.create(
                    class_level_id=data.get('class_level'),
                    subject_id=data.get('subject'),
                    teaching_frequency=data.get('teaching_frequency', 'daily'),
                    hours_per_week=data.get('hours_per_week', 4),
                    hours_per_day=data.get('hours_per_day', 1),
                    term_offered=data.get('term_offered', 'full_year'),
                    is_compulsory=data.get('is_compulsory', True),
                    order=data.get('order', 0)
                )
        except IntegrityError as e:
            print_error(view_name, "integrity_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Assignment already exists',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print_error(view_name, "creation_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error creating assignment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create notification
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='subject_assigned',
                title=get_academics_message('subject_assigned', lang),
                message=get_academics_message('assign_success', lang),
                created_by=request.user,
                extra_data={
                    'class_level': class_level.name,
                                        'subject': subject_obj.name
                },
                action_url=f'/app/academics/class-levels/{class_level.id}',
                priority='medium'
            )
        except Exception as e:
            print_error(view_name, "notification_error", e, "WARNING")
        
        try:
            serializer = ClassLevelSubjectDetailSerializer(assignment)
            response_data = {
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('assign_success', lang),
                'data': serializer.data
            }
            print_response(view_name, "POST", "Subject assigned successfully", status.HTTP_201_CREATED)
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print_error(view_name, "response_serialization", e)
            return Response({
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('assign_success', lang),
                'data': None
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def class_level_subject_delete(request, pk):
    """Remove a subject assignment from a class level."""
    view_name = "class_level_subject_delete"
    
    # Check admin permission
    if not is_admin(request.user):
        return Response({
            'success': False,
            'status_code': status.HTTP_403_FORBIDDEN,
            'message': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    print_request(view_name, "DELETE", request, extra={"assignment_id": pk})
    
    try:
        lang = get_request_language(request)
        
        try:
            assignment = get_object_or_404(ClassLevelSubject, id=pk)
        except Exception as e:
            print_error(view_name, "get_assignment", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_404_NOT_FOUND,
                'language': lang,
                'message': 'Assignment not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        class_level_name = assignment.class_level.name
        subject_name = assignment.subject.name
        
        try:
            with transaction.atomic():
                assignment.delete()
        except Exception as e:
            print_error(view_name, "delete_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error deleting assignment',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create notification
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='subject_unassigned',
                title=get_academics_message('subject_unassigned', lang),
                message=get_academics_message('unassign_success', lang),
                created_by=request.user,
                extra_data={
                    'class_level': class_level_name,
                    'subject': subject_name
                },
                priority='medium'
            )
        except Exception as e:
            print_error(view_name, "notification_error", e, "WARNING")
        
        response_data = {
            'success': True,
            'status_code': status.HTTP_200_OK,
            'language': lang,
            'message': get_academics_message('unassign_success', lang)
        }
        print_response(view_name, "DELETE", "Subject unassigned successfully", status.HTTP_200_OK)
        return Response(response_data)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- CLASS LEVEL COST VIEWS --------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def class_level_cost_list(request):
    """List class level costs."""
    view_name = "class_level_cost_list"
    print_request(view_name, "GET", request)
    
    try:
        lang = get_request_language(request)
        
        try:
            queryset = ClassLevelCost.objects.filter(is_active=True)
            
            class_level = request.query_params.get('class_level')
            if class_level:
                queryset = queryset.filter(class_level_id=class_level)
        except Exception as e:
            print_error(view_name, "database_query", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Database error occurred while fetching costs',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        try:
            serializer = ClassLevelCostListSerializer(queryset, many=True, context={'request': request})
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': serializer.data
            }
            print_response(view_name, "GET", "Costs retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing costs',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['POST'])
@permission_classes([IsAuthenticated])
def class_level_cost_create(request):
    """Create a class level cost."""
    view_name = "class_level_cost_create"
    
    # Check admin permission
    if not is_admin(request.user):
        return Response({
            'success': False,
            'status_code': status.HTTP_403_FORBIDDEN,
            'message': 'Admin access required'
        }, status=status.HTTP_403_FORBIDDEN)
    
    print_request(view_name, "POST", request)
    
    try:
        lang = get_request_language(request)
        data = request.data
        
        # Validate required fields
        if not data.get('class_level'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Class level is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('name'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Cost name is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('payment_type'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Payment type is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if not data.get('amount'):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Amount is required'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Verify class level exists
        try:
            class_level = ClassLevel.objects.get(id=data.get('class_level'))
        except ClassLevel.DoesNotExist:
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Invalid class level ID'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Validate amount is positive
        try:
            amount = float(data.get('amount'))
            if amount <= 0:
                raise ValueError("Amount must be greater than 0")
        except (ValueError, TypeError):
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Amount must be a valid positive number'
            }, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            with transaction.atomic():
                cost = ClassLevelCost.objects.create(
                    class_level_id=data.get('class_level'),
                    academic_year_id=data.get('academic_year'),
                    name=data.get('name'),
                    payment_type=data.get('payment_type'),
                    frequency=data.get('frequency', 'termly'),
                    amount=amount,
                    description=data.get('description', ''),
                    is_mandatory=data.get('is_mandatory', True)
                )
        except IntegrityError as e:
            print_error(view_name, "integrity_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_400_BAD_REQUEST,
                'language': lang,
                'message': 'Cost with this name already exists for this class level',
                'error': str(e)
            }, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            print_error(view_name, "creation_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error creating cost',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
        
        # Create notification
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='cost_added',
                title=get_academics_message('cost_added', lang),
                message=get_academics_message('create_success', lang, name=cost.name),
                created_by=request.user,
                extra_data={
                    'class_level': class_level.name,
                    'amount': str(cost.amount)
                },
                action_url=f'/app/academics/class-levels/{class_level.id}',
                priority='medium'
            )
        except Exception as e:
            print_error(view_name, "notification_error", e, "WARNING")
        
        try:
            serializer = ClassLevelCostDetailSerializer(cost)
            response_data = {
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='Fee structure'),
                'data': serializer.data
            }
            print_response(view_name, "POST", "Cost created successfully", status.HTTP_201_CREATED)
            return Response(response_data, status=status.HTTP_201_CREATED)
        except Exception as e:
            print_error(view_name, "response_serialization", e)
            return Response({
                'success': True,
                'status_code': status.HTTP_201_CREATED,
                'language': lang,
                'message': get_academics_message('create_success', lang, name='Fee structure'),
                'data': None
            }, status=status.HTTP_201_CREATED)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_level_cost_detail(request, pk):
    """Get, update, or delete a class level cost."""
    view_name = "class_level_cost_detail"
    
    def get_cost():
        try:
            return get_object_or_404(ClassLevelCost, id=pk)
        except Exception as e:
            print_error(view_name, "get_cost", e)
            return None
    
    if request.method == 'GET':
        print_request(view_name, "GET", request, extra={"cost_id": pk})
        
        try:
            lang = get_request_language(request)
            
            cost = get_cost()
            if not cost:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Cost not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            try:
                serializer = ClassLevelCostDetailSerializer(cost)
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'data': serializer.data
                }
                print_response(view_name, "GET", "Cost retrieved successfully", status.HTTP_200_OK)
                return Response(response_data)
            except Exception as e:
                print_error(view_name, "serialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error serializing cost',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'PUT':
        # Check admin permission
        if not is_admin(request.user):
            return Response({
                'success': False,
                'status_code': status.HTTP_403_FORBIDDEN,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print_request(view_name, "PUT", request, extra={"cost_id": pk})
        
        try:
            lang = get_request_language(request)
            
            cost = get_cost()
            if not cost:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Cost not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            # Validate amount if provided
            if 'amount' in request.data:
                try:
                    amount = float(request.data.get('amount'))
                    if amount <= 0:
                        raise ValueError("Amount must be greater than 0")
                except (ValueError, TypeError):
                    return Response({
                        'success': False,
                        'status_code': status.HTTP_400_BAD_REQUEST,
                        'language': lang,
                        'message': 'Amount must be a valid positive number'
                    }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                serializer = ClassLevelCostCreateUpdateSerializer(cost, data=request.data, partial=True)
            except Exception as e:
                print_error(view_name, "serializer_initialization", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error initializing serializer',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            try:
                if not serializer.is_valid():
                    print_error(view_name, "validation", serializer.errors)
                    return Response({
                        'success': False,
                        'status_code': status.HTTP_400_BAD_REQUEST,
                        'language': lang,
                        'errors': serializer.errors,
                        'message': 'Validation failed'
                    }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "validation_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Validation error occurred',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            
            try:
                with transaction.atomic():
                    serializer.save()
            except IntegrityError as e:
                print_error(view_name, "integrity_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_400_BAD_REQUEST,
                    'language': lang,
                    'message': 'Cost with this name already exists for this class level',
                    'error': str(e)
                }, status=status.HTTP_400_BAD_REQUEST)
            except Exception as e:
                print_error(view_name, "save_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error updating cost',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create notification
            try:
                class_level = cost.class_level
                NotificationService.create_user_notification(
                    user=request.user,
                    notification_type='cost_updated',
                    title=get_academics_message('cost_updated', lang),
                    message=get_academics_message('update_success', lang, name=cost.name),
                    created_by=request.user,
                    extra_data={
                        'class_level': class_level.name,
                        'cost_name': cost.name
                    },
                    priority='low'
                )
            except Exception as e:
                print_error(view_name, "notification_error", e, "WARNING")
            
            try:
                serializer = ClassLevelCostDetailSerializer(cost)
                response_data = {
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'message': get_academics_message('update_success', lang, name='Fee structure'),
                    'data': serializer.data
                }
                print_response(view_name, "PUT", "Cost updated successfully", status.HTTP_200_OK)
                return Response(response_data)
            except Exception as e:
                print_error(view_name, "response_serialization", e)
                return Response({
                    'success': True,
                    'status_code': status.HTTP_200_OK,
                    'language': lang,
                    'message': get_academics_message('update_success', lang, name='Fee structure'),
                    'data': None
                }, status=status.HTTP_200_OK)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
    
    elif request.method == 'DELETE':
        # Check admin permission
        if not is_admin(request.user):
            return Response({
                'success': False,
                'status_code': status.HTTP_403_FORBIDDEN,
                'message': 'Admin access required'
            }, status=status.HTTP_403_FORBIDDEN)
        
        print_request(view_name, "DELETE", request, extra={"cost_id": pk})
        
        try:
            lang = get_request_language(request)
            
            cost = get_cost()
            if not cost:
                return Response({
                    'success': False,
                    'status_code': status.HTTP_404_NOT_FOUND,
                    'language': lang,
                    'message': 'Cost not found'
                }, status=status.HTTP_404_NOT_FOUND)
            
            name = cost.name
            class_level = cost.class_level.name
            
            try:
                with transaction.atomic():
                    cost.delete()
            except Exception as e:
                print_error(view_name, "delete_error", e)
                return Response({
                    'success': False,
                    'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                    'language': lang,
                    'message': 'Error deleting cost',
                    'error': str(e)
                }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
            # Create notification
            try:
                NotificationService.create_user_notification(
                    user=request.user,
                    notification_type='cost_updated',
                    title=get_academics_message('cost_updated', lang),
                    message=get_academics_message('delete_success', lang, name=name),
                    created_by=request.user,
                    extra_data={
                        'class_level': class_level,
                        'cost_name': name
                    },
                    priority='medium'
                )
            except Exception as e:
                print_error(view_name, "notification_error", e, "WARNING")
            
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'message': get_academics_message('delete_success', lang, name='Fee structure')
            }
            print_response(view_name, "DELETE", "Cost deleted successfully", status.HTTP_200_OK)
            return Response(response_data)
                
        except Exception as e:
            print_error(view_name, "unexpected_error", e)
            traceback.print_exc()
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'message': 'An unexpected error occurred',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# -------------------- HELPER/UTILITY VIEWS --------------------

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_class_levels_by_school(request, school_level_id):
    """Get class levels by school level."""
    view_name = "get_class_levels_by_school"
    print_request(view_name, "GET", request, extra={"school_level_id": school_level_id})
    
    try:
        lang = get_request_language(request)
        
        try:
            school_level = get_object_or_404(SchoolLevel, id=school_level_id)
        except Exception as e:
            print_error(view_name, "get_school_level", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_404_NOT_FOUND,
                'language': lang,
                'message': 'School level not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            class_levels = ClassLevel.objects.filter(school_level=school_level, is_active=True)
            serializer = ClassLevelListSerializer(class_levels, many=True, context={'request': request})
            
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': serializer.data
            }
            print_response(view_name, "GET", "Class levels retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "serialization", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error serializing class levels',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subjects_by_class_level(request, class_level_id):
    """Get subjects assigned to a class level."""
    view_name = "get_subjects_by_class_level"
    print_request(view_name, "GET", request, extra={"class_level_id": class_level_id})
    
    try:
        lang = get_request_language(request)
        
        try:
            class_level = get_object_or_404(ClassLevel, id=class_level_id)
        except Exception as e:
            print_error(view_name, "get_class_level", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_404_NOT_FOUND,
                'language': lang,
                'message': 'Class level not found'
            }, status=status.HTTP_404_NOT_FOUND)
        
        try:
            assignments = ClassLevelSubject.objects.filter(
                class_level=class_level, 
                status='active'
            ).select_related('subject')
            
            subjects_data = []
            for assignment in assignments:
                subjects_data.append({
                    'id': assignment.subject.id,
                    'name': assignment.subject.name,
                    'code': assignment.subject.code,
                    'category': assignment.subject.category,
                    'teaching_frequency': assignment.teaching_frequency,
                    'hours_per_week': assignment.hours_per_week,
                    'is_compulsory': assignment.is_compulsory
                })
            
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': subjects_data
            }
            print_response(view_name, "GET", "Subjects retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "query_error", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error retrieving subjects',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics for academics."""
    view_name = "dashboard_stats"
    print_request(view_name, "GET", request)
    
    try:
        lang = get_request_language(request)
        
        try:
            stats = {
                'total_school_levels': SchoolLevel.objects.filter(is_active=True).count(),
                'total_class_levels': ClassLevel.objects.filter(is_active=True).count(),
                'total_classrooms': ClassRoom.objects.filter(is_active=True).count(),
                'total_subjects': Subject.objects.filter(is_active=True).count(),
                'total_subject_assignments': ClassLevelSubject.objects.filter(status='active').count(),
                'total_fee_structures': ClassLevelCost.objects.filter(is_active=True).count(),
                'current_academic_year': None
            }
            
            # Get current academic year
            try:
                current_year = AcademicYear.objects.filter(is_current=True).first()
                if current_year:
                    stats['current_academic_year'] = {
                        'id': current_year.id,
                        'name': current_year.name,
                        'start_date': current_year.start_date,
                        'end_date': current_year.end_date
                    }
            except Exception as e:
                print_error(view_name, "current_year_error", e, "WARNING")
            
            response_data = {
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang,
                'data': stats
            }
            print_response(view_name, "GET", "Dashboard stats retrieved successfully", status.HTTP_200_OK)
            return Response(response_data)
        except Exception as e:
            print_error(view_name, "stats_calculation", e)
            return Response({
                'success': False,
                'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
                'language': lang,
                'message': 'Error calculating statistics',
                'error': str(e)
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
            
    except Exception as e:
        print_error(view_name, "unexpected_error", e)
        traceback.print_exc()
        return Response({
            'success': False,
            'status_code': status.HTTP_500_INTERNAL_SERVER_ERROR,
            'message': 'An unexpected error occurred',
            'error': str(e)
        }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)
import logging
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
from django.db import IntegrityError, transaction
from django.core.exceptions import ValidationError
from .models import (
    AcademicYear, SchoolLevel, ClassLevel, ClassRoom, Subject,
    ClassLevelSubject, ClassLevelCost
)
from .serializers import (
    AcademicYearSerializer, SchoolLevelSerializer, ClassLevelSerializer,
    ClassRoomSerializer, SubjectSerializer, ClassLevelSubjectSerializer,
    ClassLevelCostSerializer
)

logger = logging.getLogger(__name__)


def is_admin(user):
    return user.is_authenticated and user.role == 'admin'


# ==================== ACADEMIC YEAR CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def academic_year_list_create(request):
    """List all academic years or create a new one."""
    
    if request.method == 'GET':
        queryset = AcademicYear.objects.all()
        serializer = AcademicYearSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            serializer = AcademicYearSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Academic year created successfully'
                }, status=201)
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Validation failed'
            }, status=400)
        except Exception as e:
            return Response({
                'success': False,
                'message': str(e)
            }, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def academic_year_detail(request, pk):
    """Retrieve, update or delete an academic year."""
    
    academic_year = get_object_or_404(AcademicYear, id=pk)
    
    if request.method == 'GET':
        serializer = AcademicYearSerializer(academic_year)
        return Response({'success': True, 'data': serializer.data})
    
    elif request.method == 'PUT':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            serializer = AcademicYearSerializer(academic_year, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Academic year updated successfully'
                })
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Validation failed'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            academic_year.delete()
            return Response({
                'success': True,
                'message': 'Academic year deleted successfully'
            })
        except ValidationError as e:
            return Response({'success': False, 'message': e.message}, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


# ==================== SCHOOL LEVEL CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def school_level_list_create(request):
    """List all school levels or create a new one."""
    
    if request.method == 'GET':
        queryset = SchoolLevel.objects.filter(is_active=True)
        serializer = SchoolLevelSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            serializer = SchoolLevelSerializer(data=request.data)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'School level created successfully'
                }, status=201)
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Validation failed'
            }, status=400)
        except IntegrityError:
            return Response({
                'success': False,
                'message': 'A school level with this name already exists'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def school_level_detail(request, pk):
    """Retrieve or delete a school level."""
    
    school_level = get_object_or_404(SchoolLevel, id=pk)
    
    if request.method == 'GET':
        serializer = SchoolLevelSerializer(school_level)
        return Response({'success': True, 'data': serializer.data})
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            school_level.delete()
            return Response({
                'success': True,
                'message': 'School level deleted successfully'
            })
        except ValidationError as e:
            return Response({'success': False, 'message': e.message}, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


# ==================== CLASS LEVEL CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def class_level_list_create(request):
    """List all class levels or create a new one."""
    
    if request.method == 'GET':
        queryset = ClassLevel.objects.filter(is_active=True)
        
        school_level = request.query_params.get('school_level')
        if school_level:
            queryset = queryset.filter(school_level_id=school_level)
        
        serializer = ClassLevelSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            with transaction.atomic():
                serializer = ClassLevelSerializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Class level created successfully'
                    }, status=201)
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': 'Validation failed'
                }, status=400)
        except IntegrityError:
            return Response({
                'success': False,
                'message': 'A class level with this code already exists'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['GET', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_level_detail(request, pk):
    """Retrieve or delete a class level."""
    
    class_level = get_object_or_404(ClassLevel, id=pk)
    
    if request.method == 'GET':
        serializer = ClassLevelSerializer(class_level)
        return Response({'success': True, 'data': serializer.data})
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            class_level.delete()
            return Response({
                'success': True,
                'message': 'Class level deleted successfully'
            })
        except ValidationError as e:
            return Response({'success': False, 'message': e.message}, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


# ==================== CLASSROOM CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def classroom_list_create(request):
    """List all classrooms or create a new one."""
    
    if request.method == 'GET':
        queryset = ClassRoom.objects.all()
        
        class_level = request.query_params.get('class_level')
        if class_level:
            queryset = queryset.filter(class_level_id=class_level)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        serializer = ClassRoomSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            with transaction.atomic():
                serializer = ClassRoomSerializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Classroom created successfully'
                    }, status=201)
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': 'Validation failed'
                }, status=400)
        except IntegrityError:
            return Response({
                'success': False,
                'message': 'A classroom with this code already exists'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def classroom_detail(request, pk):
    """Retrieve, update or delete a classroom."""
    
    classroom = get_object_or_404(ClassRoom, id=pk)
    
    if request.method == 'GET':
        serializer = ClassRoomSerializer(classroom)
        return Response({'success': True, 'data': serializer.data})
    
    elif request.method == 'PUT':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            serializer = ClassRoomSerializer(classroom, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Classroom updated successfully'
                })
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Validation failed'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            classroom.delete()
            return Response({
                'success': True,
                'message': 'Classroom deleted successfully'
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


# ==================== SUBJECT CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def subject_list_create(request):
    """List all subjects or create a new one."""
    
    if request.method == 'GET':
        queryset = Subject.objects.all()
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        
        serializer = SubjectSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            with transaction.atomic():
                serializer = SubjectSerializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Subject created successfully'
                    }, status=201)
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': 'Validation failed'
                }, status=400)
        except IntegrityError:
            return Response({
                'success': False,
                'message': 'A subject with this code already exists'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def subject_detail(request, pk):
    """Retrieve, update or delete a subject."""
    
    subject = get_object_or_404(Subject, id=pk)
    
    if request.method == 'GET':
        serializer = SubjectSerializer(subject)
        return Response({'success': True, 'data': serializer.data})
    
    elif request.method == 'PUT':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            serializer = SubjectSerializer(subject, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Subject updated successfully'
                })
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Validation failed'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            subject.delete()
            return Response({
                'success': True,
                'message': 'Subject deleted successfully'
            })
        except ValidationError as e:
            return Response({'success': False, 'message': e.message}, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


# ==================== CLASS LEVEL SUBJECT (ASSIGNMENTS) CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def class_level_subject_list_create(request):
    """List all assignments or create a new one."""
    
    if request.method == 'GET':
        queryset = ClassLevelSubject.objects.all()
        
        class_level = request.query_params.get('class_level')
        if class_level:
            queryset = queryset.filter(class_level_id=class_level)
        
        serializer = ClassLevelSubjectSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            with transaction.atomic():
                serializer = ClassLevelSubjectSerializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Subject assigned successfully'
                    }, status=201)
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': 'Validation failed'
                }, status=400)
        except IntegrityError:
            return Response({
                'success': False,
                'message': 'This subject is already assigned to this class level'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def class_level_subject_delete(request, pk):
    """Delete an assignment."""
    
    if not is_admin(request.user):
        return Response({'success': False, 'message': 'Admin access required'}, status=403)
    
    try:
        assignment = get_object_or_404(ClassLevelSubject, id=pk)
        assignment.delete()
        return Response({
            'success': True,
            'message': 'Subject unassigned successfully'
        })
    except Exception as e:
        return Response({'success': False, 'message': str(e)}, status=500)


# ==================== CLASS LEVEL COST (FEE STRUCTURES) CRUD ====================

@api_view(['GET', 'POST'])
@permission_classes([IsAuthenticated])
def class_level_cost_list_create(request):
    """List all fee structures or create a new one."""
    
    if request.method == 'GET':
        queryset = ClassLevelCost.objects.all()
        
        class_level = request.query_params.get('class_level')
        if class_level:
            queryset = queryset.filter(class_level_id=class_level)
        
        academic_year = request.query_params.get('academic_year')
        if academic_year:
            queryset = queryset.filter(academic_year_id=academic_year)
        
        serializer = ClassLevelCostSerializer(queryset, many=True)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    elif request.method == 'POST':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            with transaction.atomic():
                serializer = ClassLevelCostSerializer(data=request.data)
                if serializer.is_valid():
                    serializer.save()
                    return Response({
                        'success': True,
                        'data': serializer.data,
                        'message': 'Fee structure created successfully'
                    }, status=201)
                return Response({
                    'success': False,
                    'errors': serializer.errors,
                    'message': 'Validation failed'
                }, status=400)
        except IntegrityError:
            return Response({
                'success': False,
                'message': 'A fee structure with this name already exists for this class level and academic year'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


@api_view(['GET', 'PUT', 'DELETE'])
@permission_classes([IsAuthenticated])
def class_level_cost_detail(request, pk):
    """Retrieve, update or delete a fee structure."""
    
    cost = get_object_or_404(ClassLevelCost, id=pk)
    
    if request.method == 'GET':
        serializer = ClassLevelCostSerializer(cost)
        return Response({'success': True, 'data': serializer.data})
    
    elif request.method == 'PUT':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            serializer = ClassLevelCostSerializer(cost, data=request.data, partial=True)
            if serializer.is_valid():
                serializer.save()
                return Response({
                    'success': True,
                    'data': serializer.data,
                    'message': 'Fee structure updated successfully'
                })
            return Response({
                'success': False,
                'errors': serializer.errors,
                'message': 'Validation failed'
            }, status=400)
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)
    
    elif request.method == 'DELETE':
        if not is_admin(request.user):
            return Response({'success': False, 'message': 'Admin access required'}, status=403)
        
        try:
            cost.delete()
            return Response({
                'success': True,
                'message': 'Fee structure deleted successfully'
            })
        except Exception as e:
            return Response({'success': False, 'message': str(e)}, status=500)


# ==================== HELPER VIEWS ====================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_class_levels_by_school(request, school_level_id):
    """Get class levels by school level."""
    class_levels = ClassLevel.objects.filter(school_level_id=school_level_id, is_active=True)
    serializer = ClassLevelSerializer(class_levels, many=True)
    return Response({'success': True, 'data': serializer.data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_subjects_by_class_level(request, class_level_id):
    """Get subjects assigned to a class level."""
    assignments = ClassLevelSubject.objects.filter(class_level_id=class_level_id).select_related('subject')
    data = [{
        'id': a.subject.id,
        'name': a.subject.name,
        'code': a.subject.code,
        'teaching_frequency': a.teaching_frequency,
        'hours_per_week': a.hours_per_week,
        'is_compulsory': a.is_compulsory
    } for a in assignments]
    return Response({'success': True, 'data': data})


@api_view(['GET'])
@permission_classes([IsAuthenticated])
def dashboard_stats(request):
    """Get dashboard statistics."""
    stats = {
        'total_school_levels': SchoolLevel.objects.filter(is_active=True).count(),
        'total_class_levels': ClassLevel.objects.filter(is_active=True).count(),
        'total_classrooms': ClassRoom.objects.count(),
        'total_subjects': Subject.objects.count(),
        'total_assignments': ClassLevelSubject.objects.count(),
        'total_fee_structures': ClassLevelCost.objects.count(),
        'current_academic_year': None
    }
    
    current_year = AcademicYear.objects.filter(is_current=True).first()
    if current_year:
        stats['current_academic_year'] = {
            'id': current_year.id,
            'name': current_year.name
        }
    
    return Response({'success': True, 'data': stats})
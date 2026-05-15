# students/classroom_assignment.py

import random
from decimal import Decimal
from django.db.models import Count
from django.core.exceptions import ValidationError
from django.utils.translation import gettext_lazy as _

from academics.models import ClassRoom, Term
from .models import Student, StudentClassroomAssignment


class ClassroomAssignmentService:
    """Service for automatic classroom assignment logic"""
    
    @staticmethod
    def get_classroom_student_count(classroom, academic_year, term=None):
        """Get current active student count in a classroom"""
        qs = StudentClassroomAssignment.objects.filter(
            classroom=classroom,
            academic_year=academic_year,
            status=StudentClassroomAssignment.Status.ACTIVE
        )
        if term:
            qs = qs.filter(term=term)
        return qs.count()
    
    @staticmethod
    def get_classrooms_for_class_level(class_level, status='active'):
        """Get all active classrooms assigned to a class level"""
        return ClassRoom.objects.filter(
            assigned_class_level=class_level,
            status=status
        )
    
    @staticmethod
    def find_best_classroom(class_level, academic_year, term=None):
        """
        Find the best classroom for a new student:
        - Classroom with lowest number of students
        - If multiple have same count, pick randomly
        """
        classrooms = ClassroomAssignmentService.get_classrooms_for_class_level(class_level)
        
        if not classrooms.exists():
            raise ValidationError(
                _('No active classroom assigned to class level "{cl}". Please assign a classroom first.').format(
                    cl=class_level.name
                )
            )
        
        # Get student counts for each classroom
        classroom_counts = []
        for classroom in classrooms:
            count = ClassroomAssignmentService.get_classroom_student_count(
                classroom, academic_year, term
            )
            classroom_counts.append({
                'classroom': classroom,
                'count': count,
                'capacity': classroom.capacity
            })
        
        # Check if any classroom is at capacity
        available_classrooms = [
            c for c in classroom_counts 
            if c['count'] < c['capacity']
        ]
        
        if not available_classrooms:
            # All classrooms are full
            raise ValidationError(
                _('All classrooms for class level "{cl}" are at full capacity ({capacity} students).').format(
                    cl=class_level.name,
                    capacity=classrooms.first().capacity
                )
            )
        
        # Find minimum count
        min_count = min(c['count'] for c in available_classrooms)
        
        # Get classrooms with minimum count
        best_classrooms = [c['classroom'] for c in available_classrooms if c['count'] == min_count]
        
        # Pick randomly from best options (round-robin)
        selected = random.choice(best_classrooms)
        
        return selected
    
    @staticmethod
    def assign_student_to_classroom(
        student, 
        academic_year, 
        class_level, 
        school_level, 
        assigned_by=None, 
        term=None,
        specific_classroom=None
    ):
        """
        Assign a student to a classroom.
        If specific_classroom is provided, assign to that one.
        Otherwise, automatically find the best classroom.
        """
        from .models import StudentClassroomAssignment
        
        # Check if student already has an active assignment for this period
        existing = StudentClassroomAssignment.objects.filter(
            student=student,
            academic_year=academic_year,
            term=term,
            status=StudentClassroomAssignment.Status.ACTIVE
        ).first()
        
        if existing:
            raise ValidationError(
                _('Student already has an active classroom assignment for {year}{term}').format(
                    year=academic_year.name,
                    term=f" - {term.name}" if term else ""
                )
            )
        
        # Determine classroom
        if specific_classroom:
            classroom = specific_classroom
            # Verify classroom belongs to class level
            if classroom.assigned_class_level != class_level:
                raise ValidationError(
                    _('Classroom "{classroom}" is not assigned to class level "{class_level}"').format(
                        classroom=classroom.name,
                        class_level=class_level.name
                    )
                )
        else:
            classroom = ClassroomAssignmentService.find_best_classroom(
                class_level, academic_year, term
            )
        
        # Create assignment
        assignment = StudentClassroomAssignment.objects.create(
            student=student,
            classroom=classroom,
            academic_year=academic_year,
            term=term,
            school_level=school_level,
            class_level=class_level,
            status=StudentClassroomAssignment.Status.ACTIVE,
            assigned_by=assigned_by
        )
        
        return assignment
    
    @staticmethod
    def rebalance_classrooms(class_level, academic_year, term=None):
        """
        Rebalance students across classrooms when a student is removed or added.
        Returns the number of students moved.
        """
        from .models import StudentClassroomAssignment
        
        classrooms = ClassroomAssignmentService.get_classrooms_for_class_level(class_level)
        
        if not classrooms.exists():
            return 0
        
        # Get all active assignments
        assignments = StudentClassroomAssignment.objects.filter(
            class_level=class_level,
            academic_year=academic_year,
            term=term,
            status=StudentClassroomAssignment.Status.ACTIVE
        ).select_related('student')
        
        if not assignments.exists():
            return 0
        
        # Calculate target per classroom
        total_students = assignments.count()
        num_classrooms = classrooms.count()
        target_per_classroom = total_students // num_classrooms
        remainder = total_students % num_classrooms
        
        # Sort classrooms by current count
        classroom_counts = {}
        for classroom in classrooms:
            count = ClassroomAssignmentService.get_classroom_student_count(
                classroom, academic_year, term
            )
            classroom_counts[classroom.id] = {
                'classroom': classroom,
                'count': count,
                'target': target_per_classroom + (1 if remainder > 0 else 0),
                'students': []
            }
            if remainder > 0:
                remainder -= 1
        
        # Group students by current classroom
        for assignment in assignments:
            if assignment.classroom_id in classroom_counts:
                classroom_counts[assignment.classroom_id]['students'].append(assignment)
        
        # Identify overloaded and underloaded classrooms
        overloaded = []
        underloaded = []
        
        for data in classroom_counts.values():
            diff = data['count'] - data['target']
            if diff > 0:
                overloaded.append({'data': data, 'diff': diff})
            elif diff < 0:
                underloaded.append({'data': data, 'diff': -diff})
        
        # Move students from overloaded to underloaded
        moved = 0
        for overload in overloaded:
            students_to_move = overload['data']['students'][:overload['diff']]
            for underload in underloaded:
                if underload['diff'] <= 0:
                    continue
                
                for student_assignment in students_to_move:
                    if underload['diff'] <= 0:
                        break
                    
                    # Move student
                    student_assignment.classroom = underload['data']['classroom']
                    student_assignment.save()
                    moved += 1
                    underload['diff'] -= 1
                
                if underload['diff'] <= 0:
                    underloaded.remove(underload)
        
        return moved
    
    
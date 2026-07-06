# academics_records/calculations.py

from decimal import Decimal
from typing import Dict, List, Optional, Any
from django.db.models import Q, Count, Sum, Avg
from django.utils import timezone
from datetime import date

from .models import StudentGrade, StudentAttendance, GradeType, GradeUploadStatus


class GradeCalculator:
    """Pure calculation utilities - all calculations done in real-time"""

    @staticmethod
    def calculate_percentage(score: Decimal, max_score: Decimal) -> Decimal:
        """Calculate percentage from score and max_score"""
        if not score or not max_score or max_score == 0:
            return Decimal('0')
        return (score / max_score) * Decimal('100')

    @staticmethod
    def get_effective_percentage(grade) -> Decimal:
        """Prefer the stored raw score over any stale custom letter override."""
        if getattr(grade, 'score', None) is None or getattr(grade, 'max_score', None) is None:
            return Decimal('0')
        return GradeCalculator.calculate_percentage(grade.score, grade.max_score)

    @staticmethod
    def get_effective_grade_letter(grade) -> str:
        """Derive the current grade letter from the effective percentage."""
        percentage = GradeCalculator.get_effective_percentage(grade)
        return GradeCalculator.get_grade_letter(percentage)
    
    @staticmethod
    def calculate_weighted_score(percentage: Decimal, weight: Decimal) -> Decimal:
        """Calculate weighted contribution to final grade"""
        if not percentage or not weight:
            return Decimal('0')
        return (percentage * weight) / Decimal('100')
    
    @staticmethod
    def get_grade_letter(percentage: Decimal) -> str:
        """Get grade letter from percentage"""
        if percentage is None:
            return 'N/A'
        if percentage >= 90:
            return 'A+'
        elif percentage >= 80:
            return 'A'
        elif percentage >= 75:
            return 'B+'
        elif percentage >= 70:
            return 'B'
        elif percentage >= 65:
            return 'C+'
        elif percentage >= 60:
            return 'C'
        elif percentage >= 50:
            return 'D'
        else:
            return 'F'
    
    @staticmethod
    def get_subject_result(student, subject, academic_year, term=None) -> Dict:
        """
        Calculate complete subject result on-the-fly.
        Returns dictionary with all calculated values - NO database save.
        """
        # Get all published grades for this student/subject
        grades = StudentGrade.objects.filter(
            student=student,
            grade_upload__subject=subject,
            grade_upload__academic_year=academic_year,
            grade_upload__status=GradeUploadStatus.APPROVED,
            is_published=True
        ).select_related('grade_upload')
        
        if term:
            grades = grades.filter(grade_upload__term=term)
        
        if not grades.exists():
            return {
                'has_grades': False,
                'total_weighted_score': Decimal('0'),
                'total_weight': Decimal('0'),
                'final_percentage': None,
                'grade_letter': None,
                'passed': None,
                'breakdown_by_type': {},
                'grades_count': 0
            }
        
        total_weighted_score = Decimal('0')
        total_weight = Decimal('0')
        breakdown = {}
        
        for grade in grades:
            grade_type = grade.grade_upload.grade_type
            weight = grade.grade_upload.weight_percentage or Decimal('10')

            percentage = GradeCalculator.get_effective_percentage(grade)
            
            weighted = GradeCalculator.calculate_weighted_score(percentage, weight)
            
            total_weighted_score += weighted
            total_weight += weight
            
            if grade_type not in breakdown:
                breakdown[grade_type] = {
                    'type': grade_type,
                    'type_display': grade.grade_upload.get_grade_type_display(),
                    'weight': float(weight),
                    'scores': [],
                    'average_percentage': Decimal('0'),
                    'weighted_contribution': Decimal('0'),
                    'best_score': None,
                    'lowest_score': None
                }
            
            score_data = {
                'score': float(grade.score),
                'max_score': float(grade.max_score),
                'percentage': float(percentage),
                'grade_letter': GradeCalculator.get_grade_letter(percentage),
                'assessment_date': str(grade.grade_upload.assessment_date) if grade.grade_upload.assessment_date else None,
                'uploaded_at': grade.created_at.isoformat() if grade.created_at else None
            }
            
            breakdown[grade_type]['scores'].append(score_data)
            
            # Update best/worst
            current_pct = float(percentage)
            if breakdown[grade_type]['best_score'] is None or current_pct > breakdown[grade_type]['best_score']:
                breakdown[grade_type]['best_score'] = current_pct
            if breakdown[grade_type]['lowest_score'] is None or current_pct < breakdown[grade_type]['lowest_score']:
                breakdown[grade_type]['lowest_score'] = current_pct
        
        # Calculate averages for each grade type
        for grade_type, data in breakdown.items():
            if data['scores']:
                percentages = [s['percentage'] for s in data['scores']]
                data['average_percentage'] = Decimal(str(sum(percentages) / len(percentages)))
                data['weighted_contribution'] = float(GradeCalculator.calculate_weighted_score(
                    data['average_percentage'], 
                    Decimal(str(data['weight']))
                ))
        
        # Calculate final percentage
        final_percentage = None
        if total_weight > 0:
            final_percentage = float((total_weighted_score / total_weight) * Decimal('100'))
        
        return {
            'has_grades': True,
            'total_weighted_score': float(total_weighted_score),
            'total_weight': float(total_weight),
            'final_percentage': final_percentage,
            'grade_letter': GradeCalculator.get_grade_letter(Decimal(str(final_percentage))) if final_percentage is not None else None,
            'passed': final_percentage >= 50 if final_percentage is not None else None,
            'breakdown_by_type': {k: {
                'type': v['type'],
                'type_display': v['type_display'],
                'weight': v['weight'],
                'average_percentage': float(v['average_percentage']),
                'weighted_contribution': v['weighted_contribution'],
                'best_score': v['best_score'],
                'lowest_score': v['lowest_score'],
                'scores_count': len(v['scores'])
            } for k, v in breakdown.items()},
            'grades_count': grades.count()
        }
    
    @staticmethod
    def get_overall_performance(student, academic_year, term=None) -> Dict:
        """
        Calculate overall performance across all subjects.
        Returns dictionary - NO database save.
        """
        from academics.models import ClassLevelSubject
        
        # Get all subjects for this student's class level
        if student.current_class_level:
            subjects = ClassLevelSubject.objects.filter(
                class_level=student.current_class_level
            ).select_related('subject')
        else:
            subjects = []
        
        subject_results = []
        total_percentage = Decimal('0')
        subjects_with_grades = 0
        
        for cls in subjects:
            result = GradeCalculator.get_subject_result(
                student, cls.subject, academic_year, term
            )
            
            if result['has_grades'] and result['final_percentage'] is not None:
                subject_results.append({
                    'subject_id': cls.subject.id,
                    'subject_name': cls.subject.name,
                    'subject_code': cls.subject.code,
                    'final_percentage': result['final_percentage'],
                    'grade_letter': result['grade_letter'],
                    'passed': result['passed'],
                    'has_grades': True,
                    'breakdown': result['breakdown_by_type']
                })
                total_percentage += Decimal(str(result['final_percentage']))
                subjects_with_grades += 1
            else:
                subject_results.append({
                    'subject_id': cls.subject.id,
                    'subject_name': cls.subject.name,
                    'subject_code': cls.subject.code,
                    'final_percentage': None,
                    'grade_letter': None,
                    'passed': None,
                    'has_grades': False,
                    'breakdown': {}
                })
        
        overall_average = None
        if subjects.count() > 0:
            overall_average = float(total_percentage / subjects.count())
        
        subjects_passed = len([s for s in subject_results if s['has_grades'] and s['passed']])
        subjects_failed = len([s for s in subject_results if s['has_grades'] and s['passed'] is False])
        subjects_without_grades = len([s for s in subject_results if not s['has_grades']])
        
        return {
            'has_results': subjects_with_grades > 0,
            'total_subjects': subjects.count(),
            'subjects_with_grades': subjects_with_grades,
            'subjects_without_grades': subjects_without_grades,
            'subjects_passed': subjects_passed,
            'subjects_failed': subjects_failed,
            'overall_average': overall_average,
            'grade_letter': GradeCalculator.get_grade_letter(Decimal(str(overall_average))) if overall_average is not None else None,
            'subject_results': subject_results
        }


class DisciplineCalculator:
    """Pure calculation utilities for discipline/attendance"""
    
    @staticmethod
    def get_attendance_summary(student, academic_year=None, term=None, subject=None) -> Dict:
        """Calculate attendance summary on-the-fly"""
        attendance_qs = StudentAttendance.objects.filter(student=student)
        
        if academic_year:
            attendance_qs = attendance_qs.filter(session__academic_year=academic_year)
        if term:
            attendance_qs = attendance_qs.filter(session__term=term)
        if subject:
            attendance_qs = attendance_qs.filter(session__subject=subject)
        
        total = attendance_qs.count()
        if total == 0:
            return {
                'total_sessions': 0,
                'present': 0,
                'absent': 0,
                'late': 0,
                'excused': 0,
                'attendance_rate': 0,
                'discipline_score': 0,
                'discipline_zone': 'unknown'
            }
        
        present = attendance_qs.filter(status='present').count()
        absent = attendance_qs.filter(status='absent').count()
        late = attendance_qs.filter(status='late').count()
        excused = attendance_qs.filter(status='excused').count()
        
        # Consider 'late' and 'excused' as attended for attendance rate
        attendance_rate = ((present + late + excused) / total) * 100
        
        # Calculate discipline score (0-100)
        discipline_score = attendance_rate
        
        # Apply late penalty (each late reduces score by 2%)
        if late > 0:
            late_penalty = min(20, late * 2)
            discipline_score -= late_penalty
        
        # Apply absence penalty (each absence reduces by 5%)
        if absent > 0:
            absent_penalty = min(40, absent * 5)
            discipline_score -= absent_penalty
        
        discipline_score = max(0, min(100, discipline_score))
        
        if discipline_score <= 60:
            zone = 'low'
        elif discipline_score <= 80:
            zone = 'medium'
        else:
            zone = 'high'
        
        return {
            'total_sessions': total,
            'present': present,
            'late': late,
            'absent': absent,
            'excused': excused,
            'attendance_rate': round(attendance_rate, 2),
            'discipline_score': round(discipline_score, 2),
            'discipline_zone': zone
        }
    
    @staticmethod
    def get_subject_discipline(student, subject, academic_year=None, term=None) -> Dict:
        """Calculate discipline metrics for a specific subject"""
        return DisciplineCalculator.get_attendance_summary(student, academic_year, term, subject)


class PerformanceReportGenerator:
    """Generate complete performance reports on-the-fly"""
    
    @staticmethod
    def get_full_report(student, academic_year, term=None) -> Dict:
        """Generate complete student report with grades and discipline"""
        from students.models import StudentClassroomAssignment
        
        # Get academic performance
        academic = GradeCalculator.get_overall_performance(student, academic_year, term)
        
        # Get overall discipline
        discipline = DisciplineCalculator.get_attendance_summary(student, academic_year, term)
        
        # Get current classroom assignment
        classroom_assignment = StudentClassroomAssignment.objects.filter(
            student=student,
            academic_year=academic_year,
            status='active'
        ).select_related('classroom').first()
        
        return {
            'student': {
                'id': student.id,
                'full_name': student.full_name,
                'roll_number': student.roll_number,
                'current_class_level': student.current_class_level.name if student.current_class_level else None,
                'current_school_level': student.current_school_level.name if student.current_school_level else None,
                'current_classroom': classroom_assignment.classroom.name if classroom_assignment else None,
            },
            'academic_year': academic_year.name,
            'term': term.name if term else None,
            'academic_performance': academic,
            'discipline': discipline,
            'generated_at': timezone.now().isoformat()
        }
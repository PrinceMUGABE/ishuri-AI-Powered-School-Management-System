"""
dashboard/views.py

API views for dashboard analytics.
Each endpoint returns a report containing both detailed records and computed analytics.
"""

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from rest_framework import status

from . import utils
from . import serializers


class DashboardOverviewView(APIView):
    """
    GET /api/dashboard/overview/
    
    Returns high-level KPIs for the main dashboard.
    Used for counters, charts, and sparklines on the frontend.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        data = utils.get_dashboard_overview()
        serializer = serializers.DashboardOverviewSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# USER reports
# ===========================================================================

class UserReportView(APIView):
    """
    GET /api/dashboard/users/
    
    Returns:
    - List of all users with details (id, username, email, role, status, etc.)
    - User analytics (total users, by role, by status, active percentage, etc.)
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        users = utils.get_user_details()
        analytics = utils.get_user_analytics()
        
        data = {
            "users": users,
            "analytics": analytics
        }
        serializer = serializers.UserReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# ACADEMIC YEAR reports
# ===========================================================================

class AcademicYearReportView(APIView):
    """
    GET /api/dashboard/academic-years/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        academic_years = utils.get_academic_year_details()
        analytics = utils.get_academic_year_analytics()
        
        data = {
            "academic_years": academic_years,
            "analytics": analytics
        }
        serializer = serializers.AcademicYearReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# TERM reports
# ===========================================================================

class TermReportView(APIView):
    """
    GET /api/dashboard/terms/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        terms = utils.get_term_details()
        analytics = utils.get_term_analytics()
        
        data = {
            "terms": terms,
            "analytics": analytics
        }
        serializer = serializers.TermReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# SCHOOL LEVEL reports
# ===========================================================================

class SchoolLevelReportView(APIView):
    """
    GET /api/dashboard/school-levels/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        school_levels = utils.get_school_level_details()
        analytics = utils.get_school_level_analytics()
        
        data = {
            "school_levels": school_levels,
            "analytics": analytics
        }
        serializer = serializers.SchoolLevelReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# CLASS LEVEL reports
# ===========================================================================

class ClassLevelReportView(APIView):
    """
    GET /api/dashboard/class-levels/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        class_levels = utils.get_class_level_details()
        analytics = utils.get_class_level_analytics()
        
        data = {
            "class_levels": class_levels,
            "analytics": analytics
        }
        serializer = serializers.ClassLevelReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# CLASSROOM reports
# ===========================================================================

class ClassRoomReportView(APIView):
    """
    GET /api/dashboard/classrooms/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        classrooms = utils.get_classroom_details()
        analytics = utils.get_classroom_analytics()
        
        data = {
            "classrooms": classrooms,
            "analytics": analytics
        }
        serializer = serializers.ClassRoomReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# SUBJECT reports
# ===========================================================================

class SubjectReportView(APIView):
    """
    GET /api/dashboard/subjects/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        subjects = utils.get_subject_details()
        analytics = utils.get_subject_analytics()
        
        data = {
            "subjects": subjects,
            "analytics": analytics
        }
        serializer = serializers.SubjectReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# STUDENT reports
# ===========================================================================

class StudentReportView(APIView):
    """
    GET /api/dashboard/students/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        students = utils.get_student_details()
        analytics = utils.get_student_analytics()
        
        data = {
            "students": students,
            "analytics": analytics
        }
        serializer = serializers.StudentReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# PARENT reports
# ===========================================================================

class ParentReportView(APIView):
    """
    GET /api/dashboard/parents/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        parents = utils.get_parent_details()
        analytics = utils.get_parent_analytics()
        
        data = {
            "parents": parents,
            "analytics": analytics
        }
        serializer = serializers.ParentReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# TEACHER reports
# ===========================================================================

class TeacherReportView(APIView):
    """
    GET /api/dashboard/teachers/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        teachers = utils.get_teacher_details()
        analytics = utils.get_teacher_analytics()
        
        data = {
            "teachers": teachers,
            "analytics": analytics
        }
        serializer = serializers.TeacherReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# TEACHER ASSIGNMENT reports
# ===========================================================================

class TeacherAssignmentReportView(APIView):
    """
    GET /api/dashboard/teacher-assignments/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        assignments = utils.get_teacher_assignment_details()
        analytics = utils.get_teacher_assignment_analytics()
        
        data = {
            "assignments": assignments,
            "analytics": analytics
        }
        serializer = serializers.TeacherAssignmentReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# GRADE UPLOAD reports
# ===========================================================================

class GradeUploadReportView(APIView):
    """
    GET /api/dashboard/grade-uploads/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        grade_uploads = utils.get_grade_upload_details()
        analytics = utils.get_grade_upload_analytics()
        
        data = {
            "grade_uploads": grade_uploads,
            "analytics": analytics
        }
        serializer = serializers.GradeUploadReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# ATTENDANCE reports
# ===========================================================================

class AttendanceReportView(APIView):
    """
    GET /api/dashboard/attendance/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        sessions = utils.get_attendance_session_details()
        analytics = utils.get_attendance_analytics()
        
        data = {
            "sessions": sessions,
            "analytics": analytics
        }
        serializer = serializers.AttendanceReportSerializer(data)
        return Response(serializer.data)


# ===========================================================================
# PAYMENT reports
# ===========================================================================

class PaymentReportView(APIView):
    """
    GET /api/dashboard/payments/
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        payment_assignments = utils.get_payment_assignment_details()
        analytics = utils.get_payment_analytics()
        
        data = {
            "payment_assignments": payment_assignments,
            "analytics": analytics
        }
        serializer = serializers.PaymentReportSerializer(data)
        return Response(serializer.data)
    
    
    
    
    

class SubjectPerformanceView(APIView):
    """
    GET /api/dashboard/subject-performance/
    
    Returns real subject performance analytics from grade data.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        academic_year = request.query_params.get('academic_year')
        term = request.query_params.get('term')
        
        # Convert to int if provided, otherwise None
        academic_year_id = int(academic_year) if academic_year and academic_year.isdigit() else None
        term_id = int(term) if term and term.isdigit() else None
        
        data = utils.get_subject_performance_analytics(
            academic_year_id=academic_year_id,
            term_id=term_id
        )
        return Response(data)


class TeacherAttendanceSummaryView(APIView):
    """
    GET /api/dashboard/teacher-attendance/
    
    Returns real teacher attendance from attendance sessions.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        academic_year = request.query_params.get('academic_year')
        term = request.query_params.get('term')
        
        academic_year_id = int(academic_year) if academic_year and academic_year.isdigit() else None
        term_id = int(term) if term and term.isdigit() else None
        
        data = utils.get_teacher_attendance_summary(
            academic_year_id=academic_year_id,
            term_id=term_id
        )
        return Response(data)


class ClassAttendanceSummaryView(APIView):
    """
    GET /api/dashboard/class-attendance/
    
    Returns real class-level attendance from student records.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        academic_year = request.query_params.get('academic_year')
        term = request.query_params.get('term')
        
        academic_year_id = int(academic_year) if academic_year and academic_year.isdigit() else None
        term_id = int(term) if term and term.isdigit() else None
        
        data = utils.get_class_attendance_summary(
            academic_year_id=academic_year_id,
            term_id=term_id
        )
        return Response(data)


class GradeDistributionView(APIView):
    """
    GET /api/dashboard/grade-distribution/
    
    Returns real grade distribution from student grades.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        academic_year = request.query_params.get('academic_year')
        term = request.query_params.get('term')
        
        academic_year_id = int(academic_year) if academic_year and academic_year.isdigit() else None
        term_id = int(term) if term and term.isdigit() else None
        
        data = utils.get_grade_distribution_analytics(
            academic_year_id=academic_year_id,
            term_id=term_id
        )
        return Response(data)


class StudentRiskAnalysisView(APIView):
    """
    GET /api/dashboard/student-risk/
    
    Returns students at risk based on grades and attendance.
    """
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        academic_year = request.query_params.get('academic_year')
        term = request.query_params.get('term')
        
        academic_year_id = int(academic_year) if academic_year and academic_year.isdigit() else None
        term_id = int(term) if term and term.isdigit() else None
        
        data = utils.get_student_risk_analysis(
            academic_year_id=academic_year_id,
            term_id=term_id
        )
        return Response(data)
import logging
from django.db import transaction
from django.utils import timezone
from django.contrib.contenttypes.models import ContentType

from notifications.models import Notification, NotificationPreference, NotificationStatus

logger = logging.getLogger(__name__)


class NotificationService:
    """Service for creating and managing in-app notifications"""
    
    @classmethod
    def create_notification(
        cls,
        recipient,
        notification_type,
        title,
        message,
        priority='medium',
        created_by=None,
        content_object=None,
        data=None,
        action_url=''
    ):
        """Create a new in-app notification"""
        try:
            # Get user preferences
            preferences, _ = NotificationPreference.objects.get_or_create(user=recipient)
            
            # Check if user wants this type of notification
            if not cls._should_send_notification(notification_type, preferences):
                return None
            
            notification = Notification(
                recipient=recipient,
                notification_type=notification_type,
                priority=priority,
                title=title,
                message=message,
                created_by=created_by,
                data=data or {},
                action_url=action_url
            )
            
            if content_object:
                notification.content_type = ContentType.objects.get_for_model(content_object)
                notification.object_id = content_object.pk
                notification.content_object = content_object
            
            notification.save()
            return notification
            
        except Exception as e:
            logger.error(f"Failed to create notification: {str(e)}")
            return None
    
    @classmethod
    def _should_send_notification(cls, notification_type, preferences):
        """Check if user wants this type of notification"""
        mapping = {
            # User Management
            'user_created': 'user_management_alerts',
            'user_updated': 'user_management_alerts',
            'user_deleted': 'user_management_alerts',
            'user_status_changed': 'user_management_alerts',
            'user_role_changed': 'user_management_alerts',
            'login_success': 'user_management_alerts',
            'password_changed': 'user_management_alerts',
            'password_reset': 'user_management_alerts',
            
            # Academics - Academic Years
            'academic_year_created': 'user_management_alerts',
            'academic_year_updated': 'user_management_alerts',
            'academic_year_deleted': 'user_management_alerts',
            
            # Academics - School Levels
            'school_level_created': 'user_management_alerts',
            'school_level_deleted': 'user_management_alerts',
            
            # Academics - Class Levels
            'class_level_created': 'user_management_alerts',
            'class_level_deleted': 'user_management_alerts',
            
            # Academics - Classrooms
            'classroom_created': 'user_management_alerts',
            'classroom_updated': 'user_management_alerts',
            'classroom_deleted': 'user_management_alerts',
            
            # Academics - Subjects
            'subject_created': 'user_management_alerts',
            'subject_updated': 'user_management_alerts',
            'subject_deleted': 'user_management_alerts',
            
            # Academics - Assignments
            'subject_assigned': 'assignment_alerts',
            'subject_unassigned': 'assignment_alerts',
            
            # Academics - Fee Structures
            'fee_structure_created': 'fee_alerts',
            'fee_structure_updated': 'fee_alerts',
            'fee_structure_deleted': 'fee_alerts',
            
            # Teachers - Teacher Management
            'teacher_created': 'user_management_alerts',
            'teacher_updated': 'user_management_alerts',
            'teacher_deleted': 'user_management_alerts',
            'teacher_profile_updated': 'user_management_alerts',
            
            # Teachers - Assignments
            'teacher_assignment_created': 'assignment_alerts',
            'teacher_assignment_deleted': 'assignment_alerts',
            
            # Teachers - Timetable
            'timetable_generated': 'assignment_alerts',
            'timetable_entry_created': 'assignment_alerts',
            'timetable_entry_updated': 'assignment_alerts',
            'timetable_conflict_detected': 'assignment_alerts',
            
            # Teachers - Day Settings
            'day_setting_created': 'user_management_alerts',
            'day_setting_updated': 'user_management_alerts',
            'day_setting_deleted': 'user_management_alerts',
            
            # Teachers - Holidays
            'holiday_created': 'user_management_alerts',
            'holiday_deleted': 'user_management_alerts',
            
            # Grades
            'grade_uploaded': 'grade_alerts',
            'grade_approved': 'grade_alerts',
            
            # Assignments
            'assignment_created': 'assignment_alerts',
            'assignment_submitted': 'assignment_alerts',
            'assignment_graded': 'assignment_alerts',
            
            # Attendance
            'attendance_marked': 'attendance_alerts',
            'low_attendance_warning': 'attendance_alerts',
            
            # Communication
            'message_received': 'communication_alerts',
            'announcement_posted': 'communication_alerts',
            
            # Fees
            'fee_payment_received': 'fee_alerts',
            'fee_payment_overdue': 'fee_alerts',
            
            # Reminders
            'deadline_reminder': 'assignment_alerts',
        }
        
        category = mapping.get(notification_type, 'user_management_alerts')
        return getattr(preferences, category, True)
    
    @classmethod
    def create_user_notification(cls, user, notification_type, created_by=None, extra_data=None, **kwargs):
        """Create notification for user-related events"""
        
        # Default messages based on notification type
        message_templates = {
            'user_created': f"Your account has been created with role: {extra_data.get('role', 'user') if extra_data else 'user'}.",
            'user_updated': f"Your account information has been updated.",
            'user_deleted': f"Your account has been deleted from the system.",
            'user_status_changed': f"Your account has been {extra_data.get('action', 'updated')} by {created_by.username if created_by else 'administrator'}.",
            'user_role_changed': f"Your role has been changed to {extra_data.get('new_role', 'user')}.",
            'login_success': f"You logged in successfully.",
            'password_changed': f"Your password has been changed successfully.",
            'password_reset': f"Your password has been reset successfully.",
            
            # Teacher notifications
            'teacher_created': f"You have been registered as a teacher. Welcome to the team!",
            'teacher_updated': f"Your teacher profile has been updated.",
            'teacher_deleted': f"Your teacher account has been deactivated.",
            'teacher_profile_updated': f"Your profile information has been updated successfully.",
        }
        
        title_templates = {
            'user_created': 'Account Created',
            'user_updated': 'Account Updated',
            'user_deleted': 'Account Deleted',
            'user_status_changed': 'Account Status Changed',
            'user_role_changed': 'Role Changed',
            'login_success': 'Login Successful',
            'password_changed': 'Password Changed',
            'password_reset': 'Password Reset',
            
            # Teacher notifications
            'teacher_created': 'Welcome to the Team',
            'teacher_updated': 'Profile Updated',
            'teacher_deleted': 'Account Deactivated',
            'teacher_profile_updated': 'Profile Update Confirmed',
        }
        
        # Get title and message from kwargs, otherwise use defaults
        title = kwargs.get('title', title_templates.get(notification_type, notification_type.replace('_', ' ').title()))
        message = kwargs.get('message', message_templates.get(notification_type, f"{notification_type.replace('_', ' ').title()} notification"))
        
        # Remove title and message from kwargs to avoid duplication
        kwargs.pop('title', None)
        kwargs.pop('message', None)
        
        return cls.create_notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            created_by=created_by,
            data=extra_data or {},
            **kwargs
        )
    
    @classmethod
    def create_academic_notification(cls, user, notification_type, created_by=None, extra_data=None, **kwargs):
        """
        Create notification for academic-related events.
        This method accepts pre-translated title and message from the caller.
        """
        # The title and message should already be translated by the calling view
        title = kwargs.get('title', '')
        message = kwargs.get('message', '')
        
        # Determine priority based on notification type
        priority = kwargs.get('priority', 'medium')
        if 'deleted' in notification_type or 'overdue' in notification_type:
            priority = 'high'
        elif 'updated' in notification_type:
            priority = 'low'
        
        # Remove title, message, priority from kwargs to avoid duplication
        kwargs.pop('title', None)
        kwargs.pop('message', None)
        kwargs.pop('priority', None)
        
        return cls.create_notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            created_by=created_by,
            data=extra_data or {},
            **kwargs
        )
    
    @classmethod
    def create_teacher_notification(cls, user, notification_type, created_by=None, extra_data=None, **kwargs):
        """
        Create notification for teacher-related events.
        This method accepts pre-translated title and message from the caller.
        """
        # The title and message should already be translated by the calling view
        title = kwargs.get('title', '')
        message = kwargs.get('message', '')
        
        # Determine priority based on notification type
        priority = kwargs.get('priority', 'medium')
        if 'deleted' in notification_type or 'conflict' in notification_type:
            priority = 'high'
        elif 'updated' in notification_type:
            priority = 'low'
        
        # For timetable generation, set high priority
        if 'timetable' in notification_type:
            priority = 'high'
        
        # Remove title, message, priority from kwargs to avoid duplication
        kwargs.pop('title', None)
        kwargs.pop('message', None)
        kwargs.pop('priority', None)
        
        return cls.create_notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message,
            priority=priority,
            created_by=created_by,
            data=extra_data or {},
            **kwargs
        )
    
    @classmethod
    def mark_as_read(cls, notification_ids, user):
        """Mark multiple notifications as read"""
        return Notification.objects.filter(
            id__in=notification_ids,
            recipient=user,
            status=NotificationStatus.UNREAD
        ).update(
            status=NotificationStatus.READ,
            read_at=timezone.now()
        )
    
    @classmethod
    def mark_all_as_read(cls, user):
        """Mark all notifications as read for a user"""
        return Notification.objects.filter(
            recipient=user,
            status=NotificationStatus.UNREAD
        ).update(
            status=NotificationStatus.READ,
            read_at=timezone.now()
        )
    
    @classmethod
    def get_unread_count(cls, user):
        """Get unread notification count for a user"""
        return Notification.objects.filter(
            recipient=user,
            status=NotificationStatus.UNREAD
        ).count()
    
    @classmethod
    def get_recent_notifications(cls, user, limit=10):
        """Get recent notifications for a user"""
        return Notification.objects.filter(recipient=user)[:limit]
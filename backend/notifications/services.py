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
            'user_created': 'user_management_alerts',
            'user_updated': 'user_management_alerts',
            'user_deleted': 'user_management_alerts',
            'user_status_changed': 'user_management_alerts',
            'login_success': 'user_management_alerts',
            'password_changed': 'user_management_alerts',
            'password_reset': 'user_management_alerts',
            'grade_uploaded': 'grade_alerts',
            'grade_approved': 'grade_alerts',
            'assignment_created': 'assignment_alerts',
            'assignment_submitted': 'assignment_alerts',
            'assignment_graded': 'assignment_alerts',
            'attendance_marked': 'attendance_alerts',
            'low_attendance_warning': 'attendance_alerts',
            'message_received': 'communication_alerts',
            'announcement_posted': 'communication_alerts',
            'fee_payment_received': 'fee_alerts',
            'fee_payment_overdue': 'fee_alerts',
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
            'login_success': f"You logged in successfully.",
            'password_changed': f"Your password has been changed successfully.",
            'password_reset': f"Your password has been reset successfully.",
        }
        
        title_templates = {
            'user_created': 'Account Created',
            'user_updated': 'Account Updated',
            'user_deleted': 'Account Deleted',
            'user_status_changed': 'Account Status Changed',
            'login_success': 'Login Successful',
            'password_changed': 'Password Changed',
            'password_reset': 'Password Reset',
        }
        
        # Get title and message from kwargs, otherwise use defaults
        title = title_templates.get(notification_type, notification_type.replace('_', ' ').title())
        message = message_templates.get(notification_type, f"{notification_type.replace('_', ' ').title()} notification")
        
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
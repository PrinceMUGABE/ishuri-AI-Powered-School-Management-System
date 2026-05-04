from typing import Dict, Any, Optional
from django.utils import timezone
from accounts.models import User
from accounts.translations.translator import translator
from .models import Notification


class NotificationService:
    """Service class for creating and managing notifications."""
    
    @classmethod
    def create_notification(cls, user: User, notification_type: str, 
                           title: str, message: str, 
                           created_by: Optional[User] = None,
                           priority: str = 'medium',
                           extra_data: Dict[str, Any] = None) -> Notification:
        """
        Create a notification for a user.
        
        Args:
            user: User to notify
            notification_type: Type of notification
            title: Notification title
            message: Notification message
            created_by: User who created the notification (optional)
            priority: Notification priority (low, medium, high, urgent)
            extra_data: Additional data to store with notification
        
        Returns:
            Created Notification instance
        """
        notification = Notification.objects.create(
            user=user,
            created_by=created_by,
            notification_type=notification_type,
            priority=priority,
            title=title,
            message=message,
            extra_data=extra_data or {}
        )
        
        return notification
    
    @classmethod
    def create_user_notification(cls, user: User, notification_type: str,
                                 created_by: Optional[User] = None,
                                 extra_data: Dict[str, Any] = None,
                                 request=None) -> Notification:
        """
        Create a user-related notification with translated content.
        
        Args:
            user: User to notify
            notification_type: Type of notification
            created_by: User who performed the action
            extra_data: Additional data for the notification
            request: HTTP request object for language detection
        
        Returns:
            Created Notification instance
        """
        # Get translated notification content
        notification_info = translator.get_notification(
            notification_type, 
            request=request, 
            **(extra_data or {})
        )
        
        # Determine priority based on notification type
        priority = cls._get_priority_for_type(notification_type)
        
        # Create notification
        return cls.create_notification(
            user=user,
            notification_type=notification_type,
            title=notification_info['title'],
            message=notification_info['body'],
            created_by=created_by,
            priority=priority,
            extra_data=extra_data
        )
    
    @classmethod
    def _get_priority_for_type(cls, notification_type: str) -> str:
        """Get priority based on notification type."""
        high_priority_types = ['user_status_changed', 'grade_rejected', 'fee_status_updated']
        urgent_priority_types = ['user_deleted']
        
        if notification_type in urgent_priority_types:
            return 'urgent'
        elif notification_type in high_priority_types:
            return 'high'
        else:
            return 'medium'
    
    @classmethod
    def mark_as_read(cls, notification_id: int, user: User) -> bool:
        """Mark a notification as read."""
        try:
            notification = Notification.objects.get(id=notification_id, user=user)
            notification.mark_as_read()
            return True
        except Notification.DoesNotExist:
            return False
    
    @classmethod
    def mark_all_as_read(cls, user: User) -> int:
        """Mark all unread notifications as read for a user."""
        count = Notification.objects.filter(user=user, is_read=False).update(
            is_read=True,
            read_at=timezone.now()
        )
        return count
    
    @classmethod
    def get_user_notifications(cls, user: User, limit: int = 50, 
                              unread_only: bool = False) -> list:
        """Get notifications for a user."""
        queryset = Notification.objects.filter(user=user)
        
        if unread_only:
            queryset = queryset.filter(is_read=False)
        
        return queryset[:limit]
    
    
    
    
    
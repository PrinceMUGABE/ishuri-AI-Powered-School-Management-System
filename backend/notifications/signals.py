from django.db.models.signals import post_save
from django.dispatch import receiver
from django.contrib.auth.signals import user_logged_in
from accounts.models import User
from .services import NotificationService


@receiver(user_logged_in)
def user_logged_in_handler(sender, request, user, **kwargs):
    """Create notification when user logs in."""
    # Get IP address from request
    ip_address = request.META.get('HTTP_X_FORWARDED_FOR', request.META.get('REMOTE_ADDR', 'Unknown'))
    
    NotificationService.create_user_notification(
        user=user,
        notification_type='user_login',
        extra_data={
            'ip_address': ip_address,
            'time': str(user.last_logged_in) if user.last_logged_in else 'now'
        }
    )
    
    
    
    
    
    
    
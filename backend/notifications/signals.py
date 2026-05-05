from django.db.models.signals import post_save, pre_delete
from django.dispatch import receiver
from django.contrib.auth import get_user_model

from notifications.models import NotificationPreference
from notifications.services import NotificationService

User = get_user_model()


@receiver(post_save, sender=User)
def create_notification_preferences(sender, instance, created, **kwargs):
    """Create notification preferences when a new user is created"""
    if created:
        NotificationPreference.objects.get_or_create(user=instance)


@receiver(post_save, sender=User)
def send_welcome_notification(sender, instance, created, **kwargs):
    """Send welcome notification to new users"""
    if created:
        NotificationService.create_user_notification(
            user=instance,
            notification_type='user_created',
            extra_data={'role': instance.role},
            title='Welcome to Ishuri System',
            message=f'Welcome {instance.username}! Your account has been created successfully.'
        )
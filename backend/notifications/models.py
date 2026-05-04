from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from accounts.models import User


class Notification(models.Model):
    """Notification model for system-wide notifications."""
    
    class NotificationType(models.TextChoices):
        USER_CREATED = 'user_created', _('User Created')
        USER_UPDATED = 'user_updated', _('User Updated')
        USER_DELETED = 'user_deleted', _('User Deleted')
        USER_STATUS_CHANGED = 'user_status_changed', _('User Status Changed')
        PASSWORD_CHANGED = 'password_changed', _('Password Changed')
        USER_LOGIN = 'user_login', _('User Login')
        GRADE_UPLOADED = 'grade_uploaded', _('Grade Uploaded')
        GRADE_APPROVED = 'grade_approved', _('Grade Approved')
        GRADE_REJECTED = 'grade_rejected', _('Grade Rejected')
        ATTENDANCE_RECORDED = 'attendance_recorded', _('Attendance Recorded')
        ASSIGNMENT_UPLOADED = 'assignment_uploaded', _('Assignment Uploaded')
        FEE_STATUS_UPDATED = 'fee_status_updated', _('Fee Status Updated')
        NEW_MESSAGE = 'new_message', _('New Message')
    
    class Priority(models.TextChoices):
        LOW = 'low', _('Low')
        MEDIUM = 'medium', _('Medium')
        HIGH = 'high', _('High')
        URGENT = 'urgent', _('Urgent')
    
    # Relationships
    user = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('user')
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_notifications',
        verbose_name=_('created by')
    )
    
    # Notification data
    notification_type = models.CharField(
        _('notification type'),
        max_length=50,
        choices=NotificationType.choices
    )
    priority = models.CharField(
        _('priority'),
        max_length=20,
        choices=Priority.choices,
        default=Priority.MEDIUM
    )
    title = models.CharField(_('title'), max_length=255)
    message = models.TextField(_('message'))
    
    # Metadata
    extra_data = models.JSONField(_('extra data'), default=dict, blank=True)
    is_read = models.BooleanField(_('is read'), default=False)
    read_at = models.DateTimeField(_('read at'), null=True, blank=True)
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    
    class Meta:
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['user', '-created_at']),
            models.Index(fields=['user', 'is_read']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"Notification for {self.user.username}: {self.title}"
    
    def mark_as_read(self):
        """Mark notification as read."""
        if not self.is_read:
            self.is_read = True
            self.read_at = timezone.now()
            self.save(update_fields=['is_read', 'read_at'])
    
    @classmethod
    def get_unread_count(cls, user):
        """Get unread notification count for a user."""
        return cls.objects.filter(user=user, is_read=False).count()
    
    
    
    
    
from django.db import models
from django.conf import settings
from django.utils import timezone
from django.utils.translation import gettext_lazy as _
from django.contrib.contenttypes.models import ContentType
from django.contrib.contenttypes.fields import GenericForeignKey


class NotificationType(models.TextChoices):
    """Types of notifications"""
    # User Management
    USER_CREATED = 'user_created', _('User Created')
    USER_UPDATED = 'user_updated', _('User Updated')
    USER_DELETED = 'user_deleted', _('User Deleted')
    USER_STATUS_CHANGED = 'user_status_changed', _('User Status Changed')
    USER_ROLE_CHANGED = 'user_role_changed', _('User Role Changed')
    
    # Authentication
    LOGIN_SUCCESS = 'login_success', _('Login Successful')
    PASSWORD_CHANGED = 'password_changed', _('Password Changed')
    PASSWORD_RESET = 'password_reset', _('Password Reset')
    
    # Grades
    GRADE_UPLOADED = 'grade_uploaded', _('Grade Uploaded')
    GRADE_APPROVED = 'grade_approved', _('Grade Approved')
    
    # Assignments
    ASSIGNMENT_CREATED = 'assignment_created', _('Assignment Created')
    ASSIGNMENT_SUBMITTED = 'assignment_submitted', _('Assignment Submitted')
    ASSIGNMENT_GRADED = 'assignment_graded', _('Assignment Graded')
    
    # Attendance
    ATTENDANCE_MARKED = 'attendance_marked', _('Attendance Marked')
    LOW_ATTENDANCE_WARNING = 'low_attendance_warning', _('Low Attendance Warning')
    
    # Communication
    MESSAGE_RECEIVED = 'message_received', _('Message Received')
    ANNOUNCEMENT_POSTED = 'announcement_posted', _('Announcement Posted')
    
    # Fees
    FEE_PAYMENT_RECEIVED = 'fee_payment_received', _('Payment Received')
    FEE_PAYMENT_OVERDUE = 'fee_payment_overdue', _('Payment Overdue')
    
    # Reminders
    DEADLINE_REMINDER = 'deadline_reminder', _('Deadline Reminder')


class NotificationPriority(models.TextChoices):
    """Priority levels for notifications"""
    LOW = 'low', _('Low')
    MEDIUM = 'medium', _('Medium')
    HIGH = 'high', _('High')


class NotificationStatus(models.TextChoices):
    """Status of notification"""
    UNREAD = 'unread', _('Unread')
    READ = 'read', _('Read')
    ARCHIVED = 'archived', _('Archived')


class Notification(models.Model):
    """
    Notification model for in-app notifications
    """
    recipient = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notifications',
        verbose_name=_('recipient'),
        default=None
    )
    
    notification_type = models.CharField(
        max_length=50,
        choices=NotificationType.choices,
        db_index=True,
        verbose_name=_('notification type')
    )
    
    priority = models.CharField(
        max_length=20,
        choices=NotificationPriority.choices,
        default=NotificationPriority.MEDIUM,
        db_index=True,
        verbose_name=_('priority')
    )
    
    title = models.CharField(max_length=255, verbose_name=_('title'))
    message = models.TextField(verbose_name=_('message'))
    
    status = models.CharField(
        max_length=20,
        choices=NotificationStatus.choices,
        default=NotificationStatus.UNREAD,
        db_index=True,
        verbose_name=_('status')
    )
    
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True)
    
    # Generic relation to any object
    content_type = models.ForeignKey(
        ContentType,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name=_('content type')
    )
    object_id = models.PositiveIntegerField(null=True, blank=True)
    content_object = GenericForeignKey('content_type', 'object_id')
    
    # Additional data as JSON
    data = models.JSONField(default=dict, blank=True, verbose_name=_('additional data'))
    
    # Action URL (frontend route)
    action_url = models.CharField(max_length=500, blank=True, verbose_name=_('action URL'))
    
    # Who initiated the notification
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_notifications',
        verbose_name=_('created by')
    )
    
    class Meta:
        verbose_name = _('notification')
        verbose_name_plural = _('notifications')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['recipient', '-created_at']),
            models.Index(fields=['recipient', 'status']),
            models.Index(fields=['notification_type']),
        ]
    
    def __str__(self):
        return f"{self.notification_type} for {self.recipient.username}"
    
    def mark_as_read(self):
        """Mark notification as read"""
        if self.status == NotificationStatus.UNREAD:
            self.status = NotificationStatus.READ
            self.read_at = timezone.now()
            self.save(update_fields=['status', 'read_at'])
            return True
        return False
    
    @property
    def is_read(self):
        return self.status == NotificationStatus.READ
    
    @property
    def time_ago(self):
        """Get human-readable time ago"""
        delta = timezone.now() - self.created_at
        if delta.days > 30:
            return f"{delta.days // 30} months ago"
        elif delta.days > 0:
            return f"{delta.days} days ago"
        elif delta.seconds > 3600:
            return f"{delta.seconds // 3600} hours ago"
        elif delta.seconds > 60:
            return f"{delta.seconds // 60} minutes ago"
        else:
            return "just now"


class NotificationPreference(models.Model):
    """User preferences for notifications"""
    user = models.OneToOneField(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='notification_preferences',
        verbose_name=_('user')
    )
    
    # Category preferences
    user_management_alerts = models.BooleanField(default=True)
    grade_alerts = models.BooleanField(default=True)
    assignment_alerts = models.BooleanField(default=True)
    attendance_alerts = models.BooleanField(default=True)
    communication_alerts = models.BooleanField(default=True)
    fee_alerts = models.BooleanField(default=True)
    
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    
    def __str__(self):
        return f"Preferences for {self.user.username}"
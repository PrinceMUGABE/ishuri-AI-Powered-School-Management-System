from django.db import models
from django.utils.translation import gettext_lazy as _
from django.conf import settings
from django.core.exceptions import ValidationError
import os


def message_file_upload_path(instance, filename):
    ext = filename.split('.')[-1]
    return f"chat/messages/{instance.chatroom.id}/{filename}"


class ChatRoom(models.Model):
    """
    Represents a chat room. Can be a group chat or one-on-one.
    """

    class RoomType(models.TextChoices):
        PARENT_TEACHER = 'parent_teacher', _('Parent-Teacher')
        ALL_PARENTS = 'all_parents', _('All Parents')
        ALL_TEACHERS = 'all_teachers', _('All Teachers')
        ALL_STUDENTS = 'all_students', _('All Students')
        STUDENTS_TEACHERS = 'students_teachers', _('Students and Teachers')
        STUDENTS_PARENTS = 'students_parents', _('Students and Parents')
        ADMIN_PARENT = 'admin_parent', _('Admin and Parent')
        ADMIN_TEACHER = 'admin_teacher', _('Admin and Teacher')
        PARENT_TEACHER_DIRECT = 'parent_teacher_direct', _('Parent and Teacher Direct')

    name = models.CharField(_('name'), max_length=255)
    room_type = models.CharField(
        _('room type'),
        max_length=30,
        choices=RoomType.choices
    )

    # For parent-teacher rooms linked to a student
    student = models.ForeignKey(
        'students.Student',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='chatrooms',
        verbose_name=_('student')
    )

    is_active = models.BooleanField(_('is active'), default=True)
    created_by = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_chatrooms',
        verbose_name=_('created by')
    )

    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('chat room')
        verbose_name_plural = _('chat rooms')
        ordering = ['-updated_at']

    def __str__(self):
        return self.name


class ChatRoomMember(models.Model):
    """
    Tracks members of a chatroom and their permissions.
    """
    chatroom = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='members',
        verbose_name=_('chatroom')
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='chatroom_memberships',
        verbose_name=_('user')
    )
    is_admin = models.BooleanField(_('is admin'), default=False)
    # Admin-only: hidden from other members
    is_hidden = models.BooleanField(_('is hidden'), default=False)
    # Admin can disable a member from sending messages
    can_send_message = models.BooleanField(_('can send message'), default=True)

    joined_at = models.DateTimeField(_('joined at'), auto_now_add=True)
    last_read_at = models.DateTimeField(_('last read at'), null=True, blank=True)

    class Meta:
        verbose_name = _('chatroom member')
        verbose_name_plural = _('chatroom members')
        unique_together = [['chatroom', 'user']]

    def __str__(self):
        return f"{self.user.username} in {self.chatroom.name}"


class Message(models.Model):
    """
    A message sent inside a chatroom.
    """

    class MessageType(models.TextChoices):
        TEXT = 'text', _('Text')
        VOICE = 'voice', _('Voice')
        AUDIO = 'audio', _('Audio')
        VIDEO = 'video', _('Video')
        PDF = 'pdf', _('PDF')
        EXCEL = 'excel', _('Excel')
        PPT = 'ppt', _('PowerPoint')
        WORD = 'word', _('Word')
        IMAGE = 'image', _('Image')

    chatroom = models.ForeignKey(
        ChatRoom,
        on_delete=models.CASCADE,
        related_name='messages',
        verbose_name=_('chatroom')
    )
    sender = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='sent_messages',
        verbose_name=_('sender')
    )

    message_type = models.CharField(
        _('message type'),
        max_length=10,
        choices=MessageType.choices,
        default=MessageType.TEXT
    )

    content = models.TextField(_('content'), blank=True)
    file = models.FileField(
        _('file'),
        upload_to=message_file_upload_path,
        null=True,
        blank=True
    )
    file_name = models.CharField(_('file name'), max_length=255, blank=True)
    file_size = models.PositiveIntegerField(_('file size'), null=True, blank=True)

    # Reply to another message
    reply_to = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='replies',
        verbose_name=_('reply to')
    )

    # Soft-delete tracking: admin always sees all
    is_deleted_by_admin = models.BooleanField(_('deleted by admin'), default=False)

    sent_at = models.DateTimeField(_('sent at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)

    class Meta:
        verbose_name = _('message')
        verbose_name_plural = _('messages')
        ordering = ['sent_at']

    def __str__(self):
        return f"Message from {self.sender.username} in {self.chatroom.name}"


class MessageDeletion(models.Model):
    """
    Tracks per-user soft deletion of messages.
    """
    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='deletions',
        verbose_name=_('message')
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='deleted_messages',
        verbose_name=_('user')
    )
    deleted_at = models.DateTimeField(_('deleted at'), auto_now_add=True)

    class Meta:
        verbose_name = _('message deletion')
        verbose_name_plural = _('message deletions')
        unique_together = [['message', 'user']]

    def __str__(self):
        return f"{self.user.username} deleted message {self.message.id}"


class MessageReceipt(models.Model):
    """
    Tracks delivery and read receipts per user per message.
    Status mimics WhatsApp: sent → delivered → read.
    """

    class ReceiptStatus(models.TextChoices):
        SENT = 'sent', _('Sent')           # one grey tick
        DELIVERED = 'delivered', _('Delivered')  # two grey ticks
        READ = 'read', _('Read')           # two blue ticks

    message = models.ForeignKey(
        Message,
        on_delete=models.CASCADE,
        related_name='receipts',
        verbose_name=_('message')
    )
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='message_receipts',
        verbose_name=_('user')
    )
    status = models.CharField(
        _('status'),
        max_length=10,
        choices=ReceiptStatus.choices,
        default=ReceiptStatus.SENT
    )
    delivered_at = models.DateTimeField(_('delivered at'), null=True, blank=True)
    read_at = models.DateTimeField(_('read at'), null=True, blank=True)

    class Meta:
        verbose_name = _('message receipt')
        verbose_name_plural = _('message receipts')
        unique_together = [['message', 'user']]

    def __str__(self):
        return f"Receipt: {self.user.username} - {self.status} for message {self.message.id}"
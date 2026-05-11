"""
Chat application views.
All functions use @api_view and are fully independent.
Responses are always returned in the user's language.
"""

import os
import mimetypes
from django.utils import timezone
from django.db import transaction
from django.db.models import Q
from rest_framework.decorators import api_view, permission_classes, parser_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status
from rest_framework.parsers import MultiPartParser, FormParser, JSONParser
from channels.layers import get_channel_layer
from asgiref.sync import async_to_sync

from .models import ChatRoom, ChatRoomMember, Message, MessageDeletion, MessageReceipt
from .serializers import (
    ChatRoomSerializer, ChatRoomCreateSerializer,
    ChatRoomMemberSerializer,
    MessageSerializer, MessageCreateSerializer, MessageInfoSerializer
)
from .translations import get_translation as t, get_user_language
from notifications.models import NotificationType
from notifications.services import NotificationService

# Allowed file extensions per message type
ALLOWED_EXTENSIONS = {
    'image': ['jpg', 'jpeg', 'png', 'gif', 'bmp', 'webp', 'svg'],
    'video': ['mp4', 'mov', 'avi', 'mkv', 'webm'],
    'audio': ['mp3', 'wav', 'ogg', 'aac', 'm4a'],
    'voice': ['ogg', 'webm', 'mp3', 'wav'],
    'pdf': ['pdf'],
    'excel': ['xls', 'xlsx', 'csv'],
    'ppt': ['ppt', 'pptx'],
    'word': ['doc', 'docx'],
}

MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


# =============================================================================
# Helper utilities
# =============================================================================

def _get_channel_layer():
    return get_channel_layer()


def _broadcast(chatroom_id, event: dict):
    """Send a message to all WebSocket connections in a chatroom group."""
    try:
        channel_layer = _get_channel_layer()
        async_to_sync(channel_layer.group_send)(
            f"chat_{chatroom_id}", event
        )
    except Exception as e:
        print(f"[Chat WS Broadcast Error] chatroom={chatroom_id}: {e}")


def _create_receipts_for_message(message: Message):
    """Create initial SENT receipts for all non-sender members."""
    try:
        members = ChatRoomMember.objects.filter(
            chatroom=message.chatroom
        ).exclude(user=message.sender)

        receipts = []
        for member in members:
            receipts.append(MessageReceipt(
                message=message,
                user=member.user,
                status=MessageReceipt.ReceiptStatus.SENT
            ))
        MessageReceipt.objects.bulk_create(receipts, ignore_conflicts=True)
    except Exception as e:
        print(f"[Chat] _create_receipts_for_message error: {e}")


def _notify_chat(request, user, title, message_text, notification_type='message_received',
                 content_object=None, extra_data=None):
    """Helper to create a notification for chat events."""
    try:
        NotificationService.create_notification(
            recipient=user,
            notification_type=notification_type,
            title=title,
            message=message_text,
            created_by=request.user,
            content_object=content_object,
            data=extra_data or {}
        )
    except Exception as e:
        print(f"[Chat Notification Error]: {e}")


def _is_admin(user):
    return getattr(user, 'role', '') == 'admin'


def _get_member(chatroom, user):
    """Return ChatRoomMember or None."""
    try:
        return ChatRoomMember.objects.get(chatroom=chatroom, user=user)
    except ChatRoomMember.DoesNotExist:
        return None


# =============================================================================
# 1. Create Chatroom
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def create_chatroom(request):
    """
    Create a new chatroom.
    For parent_teacher type: student_id and teacher_user_id required.
    For broadcast types (all_parents, all_teachers, etc.): admin only.
    For direct types (admin_parent, admin_teacher, parent_teacher_direct): user_id required.
    """
    lang = get_user_language(request)
    user = request.user

    try:
        room_type = request.data.get('room_type')
        student_id = request.data.get('student_id')
        target_user_id = request.data.get('user_id')  # for direct chats

        # ---- Broadcast rooms (admin only) ----
        broadcast_types = [
            ChatRoom.RoomType.ALL_PARENTS,
            ChatRoom.RoomType.ALL_TEACHERS,
            ChatRoom.RoomType.ALL_STUDENTS,
            ChatRoom.RoomType.STUDENTS_TEACHERS,
            ChatRoom.RoomType.STUDENTS_PARENTS,
        ]

        if room_type in broadcast_types:
            if not _is_admin(user):
                return Response(
                    {'message': t('not_authorized', lang)},
                    status=status.HTTP_403_FORBIDDEN
                )

            # Prevent duplicate broadcast rooms of same type
            existing = ChatRoom.objects.filter(room_type=room_type).first()
            if existing:
                return Response(
                    {'message': t('chatroom_already_exists', lang),
                     'chatroom': ChatRoomSerializer(existing, context={'request': request}).data},
                    status=status.HTTP_200_OK
                )

            name = _build_broadcast_name(room_type)
            with transaction.atomic():
                chatroom = ChatRoom.objects.create(
                    name=name,
                    room_type=room_type,
                    created_by=user
                )
                _add_broadcast_members(chatroom, room_type, admin_user=user)

            serializer = ChatRoomSerializer(chatroom, context={'request': request})
            return Response(
                {'message': t('chatroom_created', lang), 'chatroom': serializer.data},
                status=status.HTTP_201_CREATED
            )

        # ---- Parent-Teacher room tied to a student ----
        if room_type == ChatRoom.RoomType.PARENT_TEACHER:
            try:
                from students.models import Student, StudentParent
                from teachers.models import TeacherAssignment
                from accounts.models import User as UserModel

                student = Student.objects.get(id=student_id)
            except Exception:
                return Response(
                    {'message': t('student_not_found', lang)},
                    status=status.HTTP_404_NOT_FOUND
                )

            try:
                teacher_user = UserModel.objects.get(id=target_user_id, role='teacher')
                teacher = teacher_user.teacher_profile
            except Exception:
                return Response(
                    {'message': t('teacher_not_found', lang)},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Verify teacher actually teaches the student
            assignment_exists = TeacherAssignment.objects.filter(
                teacher=teacher,
                class_level=student.current_class_level,
                school_level=student.current_school_level,
                status='active'
            ).exists()

            if not assignment_exists and not _is_admin(user):
                return Response(
                    {'message': t('no_teacher_for_student', lang)},
                    status=status.HTTP_400_BAD_REQUEST
                )

            # Check for existing chatroom for same student + teacher
            existing = ChatRoom.objects.filter(
                room_type=room_type,
                student=student,
                members__user=teacher_user
            ).first()
            if existing:
                return Response(
                    {'message': t('chatroom_already_exists', lang),
                     'chatroom': ChatRoomSerializer(existing, context={'request': request}).data},
                    status=status.HTTP_200_OK
                )

            name = f"Parent-Teacher [{student.roll_number}]"
            with transaction.atomic():
                chatroom = ChatRoom.objects.create(
                    name=name,
                    room_type=room_type,
                    student=student,
                    created_by=user
                )
                # Add teacher
                ChatRoomMember.objects.create(
                    chatroom=chatroom, user=teacher_user, can_send_message=True
                )
                # Add all parents of the student
                from students.models import StudentParent
                for sp in StudentParent.objects.filter(student=student).select_related('parent__user'):
                    parent_user = sp.parent.user
                    if parent_user:
                        ChatRoomMember.objects.get_or_create(
                            chatroom=chatroom, user=parent_user,
                            defaults={'can_send_message': True}
                        )
                # Add admin as hidden member
                _add_hidden_admins(chatroom)

            _notify_chat(
                request, teacher_user,
                title="New Chat Room",
                message_text=f"A parent-teacher chat room for student {student.full_name} ({student.roll_number}) has been created.",
                notification_type='message_received',
                content_object=chatroom
            )

            serializer = ChatRoomSerializer(chatroom, context={'request': request})
            return Response(
                {'message': t('chatroom_created', lang), 'chatroom': serializer.data},
                status=status.HTTP_201_CREATED
            )

        # ---- Direct chats: admin_parent, admin_teacher, parent_teacher_direct ----
        direct_types = [
            ChatRoom.RoomType.ADMIN_PARENT,
            ChatRoom.RoomType.ADMIN_TEACHER,
            ChatRoom.RoomType.PARENT_TEACHER_DIRECT,
        ]

        if room_type in direct_types:
            from accounts.models import User as UserModel
            try:
                target_user = UserModel.objects.get(id=target_user_id)
            except Exception:
                return Response(
                    {'message': t('user_not_found', lang)},
                    status=status.HTTP_404_NOT_FOUND
                )

            # Check for existing
            existing = ChatRoom.objects.filter(
                room_type=room_type
            ).filter(
                members__user=user
            ).filter(
                members__user=target_user
            ).first()
            if existing:
                return Response(
                    {'message': t('chatroom_already_exists', lang),
                     'chatroom': ChatRoomSerializer(existing, context={'request': request}).data},
                    status=status.HTTP_200_OK
                )

            name = _build_direct_name(room_type, user, target_user)
            with transaction.atomic():
                chatroom = ChatRoom.objects.create(
                    name=name,
                    room_type=room_type,
                    created_by=user
                )
                ChatRoomMember.objects.create(chatroom=chatroom, user=user)
                ChatRoomMember.objects.create(chatroom=chatroom, user=target_user)

                # For parent_teacher_direct, add hidden admin
                if room_type == ChatRoom.RoomType.PARENT_TEACHER_DIRECT:
                    _add_hidden_admins(chatroom)

            serializer = ChatRoomSerializer(chatroom, context={'request': request})
            return Response(
                {'message': t('chatroom_created', lang), 'chatroom': serializer.data},
                status=status.HTTP_201_CREATED
            )

        return Response(
            {'message': t('invalid_data', lang)},
            status=status.HTTP_400_BAD_REQUEST
        )

    except Exception as e:
        print(f"[create_chatroom ERROR]: {e}")
        return Response(
            {'message': t('error', lang)},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )


def _build_broadcast_name(room_type):
    names = {
        ChatRoom.RoomType.ALL_PARENTS: "All Parents",
        ChatRoom.RoomType.ALL_TEACHERS: "All Teachers",
        ChatRoom.RoomType.ALL_STUDENTS: "All Students",
        ChatRoom.RoomType.STUDENTS_TEACHERS: "Students & Teachers",
        ChatRoom.RoomType.STUDENTS_PARENTS: "Students & Parents",
    }
    return names.get(room_type, room_type)


def _build_direct_name(room_type, user1, user2):
    return f"{user1.username} & {user2.username}"


def _add_broadcast_members(chatroom, room_type, admin_user):
    """Add all relevant users to a broadcast chatroom."""
    try:
        from accounts.models import User as UserModel

        role_map = {
            ChatRoom.RoomType.ALL_PARENTS: ['parent'],
            ChatRoom.RoomType.ALL_TEACHERS: ['teacher'],
            ChatRoom.RoomType.ALL_STUDENTS: ['student'],
            ChatRoom.RoomType.STUDENTS_TEACHERS: ['student', 'teacher'],
            ChatRoom.RoomType.STUDENTS_PARENTS: ['student', 'parent'],
        }
        roles = role_map.get(room_type, [])
        users = UserModel.objects.filter(role__in=roles, status='active')

        members = []
        for u in users:
            members.append(ChatRoomMember(chatroom=chatroom, user=u))

        # Admin as visible member
        members.append(ChatRoomMember(chatroom=chatroom, user=admin_user, is_admin=True))
        ChatRoomMember.objects.bulk_create(members, ignore_conflicts=True)
    except Exception as e:
        print(f"[_add_broadcast_members ERROR]: {e}")


def _add_hidden_admins(chatroom):
    """Add all admin users as hidden members of the chatroom."""
    try:
        from accounts.models import User as UserModel
        admins = UserModel.objects.filter(role='admin', status='active')
        for admin in admins:
            ChatRoomMember.objects.get_or_create(
                chatroom=chatroom,
                user=admin,
                defaults={'is_admin': True, 'is_hidden': True, 'can_send_message': True}
            )
    except Exception as e:
        print(f"[_add_hidden_admins ERROR]: {e}")


# =============================================================================
# 2. Get All Chatrooms (admin)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_all_chatrooms(request):
    """Admin: get all chatrooms."""
    lang = get_user_language(request)
    try:
        if not _is_admin(request.user):
            return Response(
                {'message': t('not_authorized', lang)},
                status=status.HTTP_403_FORBIDDEN
            )
        chatrooms = ChatRoom.objects.all()
        serializer = ChatRoomSerializer(chatrooms, many=True, context={'request': request})
        return Response(
            {'message': t('chatrooms_fetched', lang), 'chatrooms': serializer.data},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"[get_all_chatrooms ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 3. Get Chatrooms for Logged-in Student
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_student_chatrooms(request):
    """Get chatrooms for the logged-in student."""
    lang = get_user_language(request)
    try:
        user = request.user
        if user.role != 'student':
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        chatroom_ids = ChatRoomMember.objects.filter(
            user=user, is_hidden=False
        ).values_list('chatroom_id', flat=True)

        chatrooms = ChatRoom.objects.filter(id__in=chatroom_ids, is_active=True)
        serializer = ChatRoomSerializer(chatrooms, many=True, context={'request': request})
        return Response(
            {'message': t('chatrooms_fetched', lang), 'chatrooms': serializer.data},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"[get_student_chatrooms ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 4. Get Chatrooms for Logged-in Teacher
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_teacher_chatrooms(request):
    """Get chatrooms for the logged-in teacher."""
    lang = get_user_language(request)
    try:
        user = request.user
        if user.role != 'teacher':
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        chatroom_ids = ChatRoomMember.objects.filter(
            user=user, is_hidden=False
        ).values_list('chatroom_id', flat=True)

        chatrooms = ChatRoom.objects.filter(id__in=chatroom_ids, is_active=True)
        serializer = ChatRoomSerializer(chatrooms, many=True, context={'request': request})
        return Response(
            {'message': t('chatrooms_fetched', lang), 'chatrooms': serializer.data},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"[get_teacher_chatrooms ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 5. Get Chatrooms for Logged-in Parent
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_parent_chatrooms(request):
    """Get chatrooms for the logged-in parent."""
    lang = get_user_language(request)
    try:
        user = request.user
        if user.role != 'parent':
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        chatroom_ids = ChatRoomMember.objects.filter(
            user=user, is_hidden=False
        ).values_list('chatroom_id', flat=True)

        chatrooms = ChatRoom.objects.filter(id__in=chatroom_ids, is_active=True)
        serializer = ChatRoomSerializer(chatrooms, many=True, context={'request': request})
        return Response(
            {'message': t('chatrooms_fetched', lang), 'chatrooms': serializer.data},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"[get_parent_chatrooms ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 6. Delete Chatroom
# =============================================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_chatroom(request, chatroom_id):
    """Admin only: permanently delete a chatroom."""
    lang = get_user_language(request)
    try:
        if not _is_admin(request.user):
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        chatroom.delete()
        return Response({'message': t('chatroom_deleted', lang)}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[delete_chatroom ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 7. Get Chatroom Messages
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_chatroom_messages(request, chatroom_id):
    """Get paginated messages for a chatroom (excludes soft-deleted messages for user)."""
    lang = get_user_language(request)
    try:
        user = request.user

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        member = _get_member(chatroom, user)
        if not member:
            return Response({'message': t('not_a_member', lang)}, status=status.HTTP_403_FORBIDDEN)

        # Update last_read_at for this member
        try:
            member.last_read_at = timezone.now()
            member.save(update_fields=['last_read_at'])
        except Exception as e:
            print(f"[get_chatroom_messages] last_read_at update error: {e}")

        # Exclude soft-deleted messages for this user (unless admin sees all)
        deleted_ids = MessageDeletion.objects.filter(
            user=user
        ).values_list('message_id', flat=True)

        qs = chatroom.messages.exclude(id__in=deleted_ids)

        # Admin can see all; others only non-admin-deleted
        if not _is_admin(user):
            qs = qs.filter(is_deleted_by_admin=False)

        serializer = MessageSerializer(qs, many=True, context={'request': request})
        return Response(
            {'message': t('messages_fetched', lang), 'messages': serializer.data},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"[get_chatroom_messages ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 8. Send a Text Message
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_message(request):
    """Send a text message to a chatroom."""
    lang = get_user_language(request)
    try:
        user = request.user
        chatroom_id = request.data.get('chatroom_id')
        content = request.data.get('content', '').strip()
        reply_to_id = request.data.get('reply_to_id')

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        member = _get_member(chatroom, user)
        if not member:
            return Response({'message': t('not_a_member', lang)}, status=status.HTTP_403_FORBIDDEN)

        if not member.can_send_message:
            return Response({'message': t('send_message_disabled', lang)}, status=status.HTTP_403_FORBIDDEN)

        if not content:
            return Response({'message': t('invalid_data', lang)}, status=status.HTTP_400_BAD_REQUEST)

        reply_to = None
        if reply_to_id:
            try:
                reply_to = Message.objects.get(id=reply_to_id, chatroom=chatroom)
            except Message.DoesNotExist:
                pass

        with transaction.atomic():
            message = Message.objects.create(
                chatroom=chatroom,
                sender=user,
                message_type=Message.MessageType.TEXT,
                content=content,
                reply_to=reply_to
            )
            _create_receipts_for_message(message)
            chatroom.updated_at = timezone.now()
            chatroom.save(update_fields=['updated_at'])

        serializer = MessageSerializer(message, context={'request': request})

        # WebSocket broadcast
        _broadcast(chatroom_id, {
            'type': 'chat_message',
            'message': serializer.data,
        })

        # Notify non-sender visible members
        _notify_members_new_message(request, chatroom, message, user)

        return Response(
            {'message': t('message_sent', lang), 'data': serializer.data},
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        print(f"[send_message ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 9. Upload File Message (image, video, audio, voice, pdf, excel, ppt, word)
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser])
def upload_file_message(request):
    """Upload a file message of any allowed type."""
    lang = get_user_language(request)
    try:
        user = request.user
        chatroom_id = request.data.get('chatroom_id')
        message_type = request.data.get('message_type', '').lower()
        reply_to_id = request.data.get('reply_to_id')
        file = request.FILES.get('file')

        if not file:
            return Response({'message': t('no_file_provided', lang)}, status=status.HTTP_400_BAD_REQUEST)

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        member = _get_member(chatroom, user)
        if not member:
            return Response({'message': t('not_a_member', lang)}, status=status.HTTP_403_FORBIDDEN)
        if not member.can_send_message:
            return Response({'message': t('send_message_disabled', lang)}, status=status.HTTP_403_FORBIDDEN)

        # Validate file size
        if file.size > MAX_FILE_SIZE:
            return Response({'message': t('file_too_large', lang)}, status=status.HTTP_400_BAD_REQUEST)

        # Validate file extension against message_type
        ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
        allowed = ALLOWED_EXTENSIONS.get(message_type, [])
        if allowed and ext not in allowed:
            return Response({'message': t('file_type_not_allowed', lang)}, status=status.HTTP_400_BAD_REQUEST)

        reply_to = None
        if reply_to_id:
            try:
                reply_to = Message.objects.get(id=reply_to_id, chatroom=chatroom)
            except Message.DoesNotExist:
                pass

        with transaction.atomic():
            message = Message.objects.create(
                chatroom=chatroom,
                sender=user,
                message_type=message_type,
                file=file,
                file_name=file.name,
                file_size=file.size,
                reply_to=reply_to
            )
            _create_receipts_for_message(message)
            chatroom.updated_at = timezone.now()
            chatroom.save(update_fields=['updated_at'])

        serializer = MessageSerializer(message, context={'request': request})

        _broadcast(chatroom_id, {
            'type': 'chat_message',
            'message': serializer.data,
        })

        _notify_members_new_message(request, chatroom, message, user)

        return Response(
            {'message': t('file_uploaded', lang), 'data': serializer.data},
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        print(f"[upload_file_message ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 10. Reply to a Message
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
@parser_classes([MultiPartParser, FormParser, JSONParser])
def reply_message(request, message_id):
    """
    Reply to an existing message with any message type.
    Handles both text (JSON) and file (multipart) replies.
    """
    lang = get_user_language(request)
    try:
        user = request.user

        try:
            original = Message.objects.select_related('chatroom').get(id=message_id)
        except Message.DoesNotExist:
            return Response({'message': t('message_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        chatroom = original.chatroom
        member = _get_member(chatroom, user)
        if not member:
            return Response({'message': t('not_a_member', lang)}, status=status.HTTP_403_FORBIDDEN)
        if not member.can_send_message:
            return Response({'message': t('send_message_disabled', lang)}, status=status.HTTP_403_FORBIDDEN)

        message_type = request.data.get('message_type', 'text').lower()
        content = request.data.get('content', '').strip()
        file = request.FILES.get('file')

        if message_type == 'text' and not content:
            return Response({'message': t('invalid_data', lang)}, status=status.HTTP_400_BAD_REQUEST)

        if message_type != 'text' and not file:
            return Response({'message': t('no_file_provided', lang)}, status=status.HTTP_400_BAD_REQUEST)

        if file:
            if file.size > MAX_FILE_SIZE:
                return Response({'message': t('file_too_large', lang)}, status=status.HTTP_400_BAD_REQUEST)
            ext = file.name.rsplit('.', 1)[-1].lower() if '.' in file.name else ''
            allowed = ALLOWED_EXTENSIONS.get(message_type, [])
            if allowed and ext not in allowed:
                return Response({'message': t('file_type_not_allowed', lang)}, status=status.HTTP_400_BAD_REQUEST)

        with transaction.atomic():
            msg = Message.objects.create(
                chatroom=chatroom,
                sender=user,
                message_type=message_type,
                content=content,
                file=file if file else None,
                file_name=file.name if file else '',
                file_size=file.size if file else None,
                reply_to=original
            )
            _create_receipts_for_message(msg)
            chatroom.updated_at = timezone.now()
            chatroom.save(update_fields=['updated_at'])

        serializer = MessageSerializer(msg, context={'request': request})

        _broadcast(chatroom.id, {
            'type': 'chat_message',
            'message': serializer.data,
        })

        _notify_members_new_message(request, chatroom, msg, user)

        return Response(
            {'message': t('message_sent', lang), 'data': serializer.data},
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        print(f"[reply_message ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 11. Update a Text Message (only if not yet read by any receiver)
# =============================================================================

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_message(request, message_id):
    """Edit a text message only if no receiver has read it yet."""
    lang = get_user_language(request)
    try:
        user = request.user

        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({'message': t('message_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        if message.sender != user:
            return Response({'message': t('not_message_sender', lang)}, status=status.HTTP_403_FORBIDDEN)

        if message.message_type != Message.MessageType.TEXT:
            return Response({'message': t('invalid_data', lang)}, status=status.HTTP_400_BAD_REQUEST)

        # Check if any non-sender, non-hidden member has read it
        read_by_others = MessageReceipt.objects.filter(
            message=message,
            status='read'
        ).exclude(user=user).filter(
            user__chatroom_memberships__chatroom=message.chatroom,
            user__chatroom_memberships__is_hidden=False
        ).exists()

        if read_by_others:
            return Response({'message': t('message_already_read', lang)}, status=status.HTTP_400_BAD_REQUEST)

        new_content = request.data.get('content', '').strip()
        if not new_content:
            return Response({'message': t('invalid_data', lang)}, status=status.HTTP_400_BAD_REQUEST)

        message.content = new_content
        message.save(update_fields=['content', 'updated_at'])

        _broadcast(message.chatroom_id, {
            'type': 'message_updated',
            'message_id': message.id,
            'content': new_content,
        })

        serializer = MessageSerializer(message, context={'request': request})
        return Response(
            {'message': t('message_updated', lang), 'data': serializer.data},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"[update_message ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 12. Delete Message (Admin – permanent hard delete)
# =============================================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_message_admin(request, message_id):
    """Admin: permanently delete a message for all users."""
    lang = get_user_language(request)
    try:
        if not _is_admin(request.user):
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({'message': t('message_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        chatroom_id = message.chatroom_id
        message.delete()

        _broadcast(chatroom_id, {
            'type': 'message_deleted',
            'message_id': message_id,
        })

        return Response({'message': t('message_deleted', lang)}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[delete_message_admin ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 13. Delete Message (Sender)
# =============================================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_message_sender(request, message_id):
    """
    Sender deletes their own message.
    - If no receiver has read it yet → permanent delete.
    - If any receiver has read it → soft delete (hidden from sender only).
    """
    lang = get_user_language(request)
    try:
        user = request.user

        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({'message': t('message_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        if message.sender != user:
            return Response({'message': t('not_message_sender', lang)}, status=status.HTTP_403_FORBIDDEN)

        read_by_others = MessageReceipt.objects.filter(
            message=message,
            status='read'
        ).exclude(user=user).filter(
            user__chatroom_memberships__chatroom=message.chatroom,
            user__chatroom_memberships__is_hidden=False
        ).exists()

        if read_by_others:
            # Soft delete – hide from sender
            MessageDeletion.objects.get_or_create(message=message, user=user)
            return Response({'message': t('message_hidden', lang)}, status=status.HTTP_200_OK)
        else:
            # Permanent delete
            chatroom_id = message.chatroom_id
            message.delete()
            _broadcast(chatroom_id, {
                'type': 'message_deleted',
                'message_id': message_id,
            })
            return Response({'message': t('message_deleted', lang)}, status=status.HTTP_200_OK)

    except Exception as e:
        print(f"[delete_message_sender ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 14. Delete Message (Receiver – hide from receiver only)
# =============================================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def delete_message_receiver(request, message_id):
    """
    Receiver hides a message from their view (soft delete for receiver).
    Message remains visible to sender and admin.
    """
    lang = get_user_language(request)
    try:
        user = request.user

        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({'message': t('message_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        if message.sender == user:
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        member = _get_member(message.chatroom, user)
        if not member:
            return Response({'message': t('not_a_member', lang)}, status=status.HTTP_403_FORBIDDEN)

        MessageDeletion.objects.get_or_create(message=message, user=user)
        return Response({'message': t('message_hidden', lang)}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[delete_message_receiver ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 15. Get Message Info (sender or admin sees receipts)
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_message_info(request, message_id):
    """Get delivery/read info for a message (sender or admin only)."""
    lang = get_user_language(request)
    try:
        user = request.user

        try:
            message = Message.objects.get(id=message_id)
        except Message.DoesNotExist:
            return Response({'message': t('message_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        if message.sender != user and not _is_admin(user):
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        serializer = MessageInfoSerializer(message, context={'request': request})
        return Response(
            {'message': t('message_info_fetched', lang), 'data': serializer.data},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"[get_message_info ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 16. Get Unread Messages for a Chatroom
# =============================================================================

@api_view(['GET'])
@permission_classes([IsAuthenticated])
def get_unread_messages(request, chatroom_id):
    """Get messages not yet read by the current user in a chatroom."""
    lang = get_user_language(request)
    try:
        user = request.user

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        member = _get_member(chatroom, user)
        if not member:
            return Response({'message': t('not_a_member', lang)}, status=status.HTTP_403_FORBIDDEN)

        deleted_ids = MessageDeletion.objects.filter(user=user).values_list('message_id', flat=True)

        read_ids = MessageReceipt.objects.filter(
            user=user, status='read'
        ).values_list('message_id', flat=True)

        qs = chatroom.messages.exclude(
            sender=user
        ).exclude(
            id__in=deleted_ids
        ).exclude(
            id__in=read_ids
        )

        if not _is_admin(user):
            qs = qs.filter(is_deleted_by_admin=False)

        serializer = MessageSerializer(qs, many=True, context={'request': request})
        return Response(
            {'message': t('unread_messages_fetched', lang), 'messages': serializer.data},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"[get_unread_messages ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 17. Update Chatroom Settings
# =============================================================================

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def update_chatroom_settings(request, chatroom_id):
    """Admin: update chatroom name or active status."""
    lang = get_user_language(request)
    try:
        if not _is_admin(request.user):
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        name = request.data.get('name')
        is_active = request.data.get('is_active')

        if name:
            chatroom.name = name
        if is_active is not None:
            chatroom.is_active = bool(is_active)

        chatroom.save()
        serializer = ChatRoomSerializer(chatroom, context={'request': request})
        return Response(
            {'message': t('chatroom_settings_updated', lang), 'chatroom': serializer.data},
            status=status.HTTP_200_OK
        )
    except Exception as e:
        print(f"[update_chatroom_settings ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 18. Add Member to Chatroom
# =============================================================================

@api_view(['POST'])
@permission_classes([IsAuthenticated])
def add_chatroom_member(request, chatroom_id):
    """Admin: add a user to a chatroom."""
    lang = get_user_language(request)
    try:
        if not _is_admin(request.user):
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        user_id = request.data.get('user_id')
        try:
            from accounts.models import User as UserModel
            target_user = UserModel.objects.get(id=user_id)
        except Exception:
            return Response({'message': t('user_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        if ChatRoomMember.objects.filter(chatroom=chatroom, user=target_user).exists():
            return Response({'message': t('member_already_exists', lang)}, status=status.HTTP_400_BAD_REQUEST)

        member = ChatRoomMember.objects.create(chatroom=chatroom, user=target_user)

        _broadcast(chatroom_id, {
            'type': 'member_update',
            'action': 'added',
            'user_id': target_user.id,
            'username': target_user.username,
        })

        serializer = ChatRoomMemberSerializer(member)
        return Response(
            {'message': t('member_added', lang), 'member': serializer.data},
            status=status.HTTP_201_CREATED
        )
    except Exception as e:
        print(f"[add_chatroom_member ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 19. Remove Member from Chatroom
# =============================================================================

@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def remove_chatroom_member(request, chatroom_id, user_id):
    """Admin: remove a member from a chatroom."""
    lang = get_user_language(request)
    try:
        if not _is_admin(request.user):
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        try:
            member = ChatRoomMember.objects.get(chatroom=chatroom, user_id=user_id)
        except ChatRoomMember.DoesNotExist:
            return Response({'message': t('member_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        if member.is_admin:
            return Response({'message': t('cannot_remove_admin', lang)}, status=status.HTTP_400_BAD_REQUEST)

        member.delete()

        _broadcast(chatroom_id, {
            'type': 'member_update',
            'action': 'removed',
            'user_id': user_id,
        })

        return Response({'message': t('member_removed', lang)}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[remove_chatroom_member ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 20. Disable Chatroom Member (prevent sending messages)
# =============================================================================

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def disable_chatroom_member(request, chatroom_id, user_id):
    """Admin: disable a member from sending messages."""
    lang = get_user_language(request)
    try:
        if not _is_admin(request.user):
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        try:
            member = ChatRoomMember.objects.get(chatroom=chatroom, user_id=user_id)
        except ChatRoomMember.DoesNotExist:
            return Response({'message': t('member_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        member.can_send_message = False
        member.save(update_fields=['can_send_message'])

        _broadcast(chatroom_id, {
            'type': 'member_update',
            'action': 'disabled',
            'user_id': user_id,
        })

        # Notify the disabled user
        try:
            from accounts.models import User as UserModel
            target_user = UserModel.objects.get(id=user_id)
            _notify_chat(
                request, target_user,
                title="Chat Permission Changed",
                message_text=f"You have been disabled from sending messages in '{chatroom.name}'.",
                notification_type='announcement_posted',
                content_object=chatroom
            )
        except Exception as e:
            print(f"[disable_chatroom_member] notify error: {e}")

        return Response({'message': t('member_disabled', lang)}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[disable_chatroom_member ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# 21. Enable Chatroom Member
# =============================================================================

@api_view(['PATCH'])
@permission_classes([IsAuthenticated])
def enable_chatroom_member(request, chatroom_id, user_id):
    """Admin: re-enable a member to send messages."""
    lang = get_user_language(request)
    try:
        if not _is_admin(request.user):
            return Response({'message': t('not_authorized', lang)}, status=status.HTTP_403_FORBIDDEN)

        try:
            chatroom = ChatRoom.objects.get(id=chatroom_id)
        except ChatRoom.DoesNotExist:
            return Response({'message': t('chatroom_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        try:
            member = ChatRoomMember.objects.get(chatroom=chatroom, user_id=user_id)
        except ChatRoomMember.DoesNotExist:
            return Response({'message': t('member_not_found', lang)}, status=status.HTTP_404_NOT_FOUND)

        member.can_send_message = True
        member.save(update_fields=['can_send_message'])

        _broadcast(chatroom_id, {
            'type': 'member_update',
            'action': 'enabled',
            'user_id': user_id,
        })

        try:
            from accounts.models import User as UserModel
            target_user = UserModel.objects.get(id=user_id)
            _notify_chat(
                request, target_user,
                title="Chat Permission Restored",
                message_text=f"You can now send messages again in '{chatroom.name}'.",
                notification_type='announcement_posted',
                content_object=chatroom
            )
        except Exception as e:
            print(f"[enable_chatroom_member] notify error: {e}")

        return Response({'message': t('member_enabled', lang)}, status=status.HTTP_200_OK)
    except Exception as e:
        print(f"[enable_chatroom_member ERROR]: {e}")
        return Response({'message': t('error', lang)}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# =============================================================================
# Shared helper: notify members of new message
# =============================================================================

def _notify_members_new_message(request, chatroom, message, sender):
    """Send in-app notifications to all non-sender, non-hidden members."""
    try:
        members = ChatRoomMember.objects.filter(
            chatroom=chatroom,
            is_hidden=False
        ).exclude(user=sender).select_related('user')

        for member in members:
            _notify_chat(
                request,
                member.user,
                title=f"New message in {chatroom.name}",
                message_text=(
                    f"{sender.username}: {message.content[:80]}"
                    if message.message_type == 'text'
                    else f"{sender.username} sent a {message.message_type}."
                ),
                notification_type='message_received',
                content_object=message,
                extra_data={
                    'chatroom_id': chatroom.id,
                    'message_id': message.id
                }
            )
    except Exception as e:
        print(f"[_notify_members_new_message ERROR]: {e}")
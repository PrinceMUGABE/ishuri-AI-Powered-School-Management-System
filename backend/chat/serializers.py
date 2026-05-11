from rest_framework import serializers
from django.utils import timezone

from .models import ChatRoom, ChatRoomMember, Message, MessageDeletion, MessageReceipt


# ---------------------------------------------------------------------------
# MessageReceipt
# ---------------------------------------------------------------------------

class MessageReceiptSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = MessageReceipt
        fields = ['id', 'user', 'username', 'role', 'status', 'delivered_at', 'read_at']
        read_only_fields = ['id', 'delivered_at', 'read_at']


# ---------------------------------------------------------------------------
# Reply-to message (lightweight, avoids infinite nesting)
# ---------------------------------------------------------------------------

class ReplyToMessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)

    class Meta:
        model = Message
        fields = [
            'id', 'sender', 'sender_username', 'message_type',
            'content', 'file_name', 'sent_at'
        ]


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------

class MessageSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    sender_role = serializers.CharField(source='sender.role', read_only=True)
    reply_to_detail = ReplyToMessageSerializer(source='reply_to', read_only=True)
    receipts = MessageReceiptSerializer(many=True, read_only=True)

    # Tick status aggregated for the sender's view (excluding admin hidden members)
    tick_status = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'chatroom', 'sender', 'sender_username', 'sender_role',
            'message_type', 'content', 'file', 'file_name', 'file_size',
            'reply_to', 'reply_to_detail',
            'receipts', 'tick_status',
            'sent_at', 'updated_at'
        ]
        read_only_fields = [
            'id', 'sender', 'file_name', 'file_size',
            'sent_at', 'updated_at', 'tick_status'
        ]

    def get_tick_status(self, obj):
        """
        Aggregate delivery/read status across all non-sender, non-hidden members.
        Returns: 'sent' | 'delivered' | 'read'
        """
        # Exclude sender and hidden (admin) members
        visible_receipts = obj.receipts.filter(
            user__chatroom_memberships__chatroom=obj.chatroom,
            user__chatroom_memberships__is_hidden=False
        ).exclude(user=obj.sender)

        if not visible_receipts.exists():
            return 'sent'

        statuses = list(visible_receipts.values_list('status', flat=True))
        if all(s == 'read' for s in statuses):
            return 'read'
        if all(s in ('delivered', 'read') for s in statuses):
            return 'delivered'
        return 'sent'


class MessageCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Message
        fields = [
            'chatroom', 'message_type', 'content', 'file', 'reply_to'
        ]

    def validate(self, data):
        msg_type = data.get('message_type', 'text')
        content = data.get('content', '')
        file = data.get('file')

        if msg_type == 'text' and not content:
            raise serializers.ValidationError("Text messages must have content.")
        if msg_type != 'text' and not file:
            raise serializers.ValidationError(f"{msg_type} messages must include a file.")
        return data


# ---------------------------------------------------------------------------
# ChatRoomMember
# ---------------------------------------------------------------------------

class ChatRoomMemberSerializer(serializers.ModelSerializer):
    username = serializers.CharField(source='user.username', read_only=True)
    role = serializers.CharField(source='user.role', read_only=True)

    class Meta:
        model = ChatRoomMember
        fields = [
            'id', 'chatroom', 'user', 'username', 'role',
            'is_admin', 'can_send_message', 'joined_at', 'last_read_at'
        ]
        read_only_fields = ['id', 'joined_at']


# ---------------------------------------------------------------------------
# ChatRoom
# ---------------------------------------------------------------------------

class ChatRoomSerializer(serializers.ModelSerializer):
    members = serializers.SerializerMethodField()
    last_message = serializers.SerializerMethodField()
    unread_count = serializers.SerializerMethodField()
    student_roll_number = serializers.CharField(
        source='student.roll_number', read_only=True
    )

    class Meta:
        model = ChatRoom
        fields = [
            'id', 'name', 'room_type', 'is_active',
            'student', 'student_roll_number',
            'created_by', 'created_at', 'updated_at',
            'members', 'last_message', 'unread_count'
        ]
        read_only_fields = ['id', 'created_at', 'updated_at']

    def get_members(self, obj):
        request = self.context.get('request')
        qs = obj.members.all()

        # Non-admin users should not see hidden (admin) members
        if request and request.user.role != 'admin':
            qs = qs.filter(is_hidden=False)

        return ChatRoomMemberSerializer(qs, many=True).data

    def get_last_message(self, obj):
        request = self.context.get('request')
        user = request.user if request else None

        qs = obj.messages.all()
        if user:
            # Exclude messages soft-deleted for this user
            deleted_ids = MessageDeletion.objects.filter(
                user=user
            ).values_list('message_id', flat=True)
            qs = qs.exclude(id__in=deleted_ids)

        last = qs.last()
        if last:
            return {
                'id': last.id,
                'sender': last.sender.username,
                'message_type': last.message_type,
                'content': last.content[:80] if last.content else '',
                'sent_at': last.sent_at,
            }
        return None

    def get_unread_count(self, obj):
        request = self.context.get('request')
        if not request:
            return 0
        user = request.user
        # Messages in this room not sent by user and not yet read by user
        deleted_ids = MessageDeletion.objects.filter(
            user=user
        ).values_list('message_id', flat=True)

        return obj.messages.exclude(
            sender=user
        ).exclude(
            id__in=deleted_ids
        ).exclude(
            receipts__user=user,
            receipts__status='read'
        ).count()


class ChatRoomCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = ChatRoom
        fields = ['name', 'room_type', 'student']


# ---------------------------------------------------------------------------
# Message Info (for sender / admin to see receipt details)
# ---------------------------------------------------------------------------

class MessageInfoSerializer(serializers.ModelSerializer):
    sender_username = serializers.CharField(source='sender.username', read_only=True)
    seen_by = serializers.SerializerMethodField()
    not_seen_by = serializers.SerializerMethodField()
    tick_status = serializers.SerializerMethodField()

    class Meta:
        model = Message
        fields = [
            'id', 'chatroom', 'sender', 'sender_username',
            'message_type', 'content', 'file_name',
            'sent_at', 'tick_status',
            'seen_by', 'not_seen_by'
        ]

    def _visible_receipts(self, obj):
        return obj.receipts.filter(
            user__chatroom_memberships__chatroom=obj.chatroom,
            user__chatroom_memberships__is_hidden=False
        ).exclude(user=obj.sender)

    def get_seen_by(self, obj):
        receipts = self._visible_receipts(obj).filter(status='read')
        return [
            {
                'user_id': r.user.id,
                'username': r.user.username,
                'read_at': r.read_at
            }
            for r in receipts
        ]

    def get_not_seen_by(self, obj):
        receipts = self._visible_receipts(obj).exclude(status='read')
        return [
            {
                'user_id': r.user.id,
                'username': r.user.username,
                'status': r.status,
                'delivered_at': r.delivered_at
            }
            for r in receipts
        ]

    def get_tick_status(self, obj):
        visible_receipts = self._visible_receipts(obj)
        if not visible_receipts.exists():
            return 'sent'
        statuses = list(visible_receipts.values_list('status', flat=True))
        if all(s == 'read' for s in statuses):
            return 'read'
        if all(s in ('delivered', 'read') for s in statuses):
            return 'delivered'
        return 'sent'
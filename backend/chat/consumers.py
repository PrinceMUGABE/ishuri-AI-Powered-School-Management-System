"""
Django Channels WebSocket consumer for real-time chat.
Each chatroom has its own group: chat_{chatroom_id}
"""

import json
from channels.generic.websocket import AsyncWebsocketConsumer
from channels.db import database_sync_to_async
from django.utils import timezone

from .models import ChatRoom, ChatRoomMember, Message, MessageReceipt


class ChatConsumer(AsyncWebsocketConsumer):

    async def connect(self):
        self.chatroom_id = self.scope['url_route']['kwargs']['chatroom_id']
        self.group_name = f"chat_{self.chatroom_id}"
        self.user = self.scope.get('user')

        # Reject unauthenticated or non-member connections
        if not self.user or not self.user.is_authenticated:
            await self.close()
            return

        is_member = await self._is_member()
        if not is_member:
            await self.close()
            return

        await self.channel_layer.group_add(self.group_name, self.channel_name)
        await self.accept()

        # Mark all existing messages as delivered for this user on connect
        await self._mark_delivered()

    async def disconnect(self, close_code):
        await self.channel_layer.group_discard(self.group_name, self.channel_name)

    async def receive(self, text_data):
        """
        Client sends:
          { "type": "read_receipt", "message_id": 42 }
        to mark a message as read.
        """
        try:
            data = json.loads(text_data)
            event_type = data.get('type')

            if event_type == 'read_receipt':
                message_id = data.get('message_id')
                await self._mark_read(message_id)

                # Notify group about the read receipt
                await self.channel_layer.group_send(
                    self.group_name,
                    {
                        'type': 'receipt_update',
                        'message_id': message_id,
                        'user_id': self.user.id,
                        'username': self.user.username,
                        'status': 'read',
                        'read_at': timezone.now().isoformat(),
                    }
                )
        except Exception as e:
            print(f"[ChatConsumer] receive error: {e}")

    # ------------------------------------------------------------------
    # Group message handlers (called by channel layer)
    # ------------------------------------------------------------------

    async def chat_message(self, event):
        """Broadcast a new message to all group members."""
        await self.send(text_data=json.dumps({
            'event': 'new_message',
            'message': event['message'],
        }))

    async def receipt_update(self, event):
        """Broadcast a receipt update (delivered / read)."""
        await self.send(text_data=json.dumps({
            'event': 'receipt_update',
            'message_id': event['message_id'],
            'user_id': event['user_id'],
            'username': event.get('username'),
            'status': event['status'],
            'read_at': event.get('read_at'),
            'delivered_at': event.get('delivered_at'),
        }))

    async def message_deleted(self, event):
        """Notify group that a message was deleted by admin."""
        await self.send(text_data=json.dumps({
            'event': 'message_deleted',
            'message_id': event['message_id'],
        }))

    async def message_updated(self, event):
        """Notify group that a message text was updated."""
        await self.send(text_data=json.dumps({
            'event': 'message_updated',
            'message_id': event['message_id'],
            'content': event['content'],
        }))

    async def member_update(self, event):
        """Notify group of member add/remove/enable/disable changes."""
        await self.send(text_data=json.dumps({
            'event': 'member_update',
            'action': event['action'],
            'user_id': event['user_id'],
            'username': event.get('username'),
        }))

    # ------------------------------------------------------------------
    # DB helpers
    # ------------------------------------------------------------------

    @database_sync_to_async
    def _is_member(self):
        return ChatRoomMember.objects.filter(
            chatroom_id=self.chatroom_id,
            user=self.user
        ).exists()

    @database_sync_to_async
    def _mark_delivered(self):
        """Mark all undelivered messages in this room as delivered for this user."""
        messages = Message.objects.filter(
            chatroom_id=self.chatroom_id
        ).exclude(sender=self.user)

        for msg in messages:
            receipt, _ = MessageReceipt.objects.get_or_create(
                message=msg, user=self.user,
                defaults={'status': 'delivered', 'delivered_at': timezone.now()}
            )
            if receipt.status == 'sent':
                receipt.status = 'delivered'
                receipt.delivered_at = timezone.now()
                receipt.save(update_fields=['status', 'delivered_at'])

    @database_sync_to_async
    def _mark_read(self, message_id):
        try:
            msg = Message.objects.get(id=message_id, chatroom_id=self.chatroom_id)
            receipt, _ = MessageReceipt.objects.get_or_create(
                message=msg, user=self.user,
                defaults={
                    'status': 'read',
                    'delivered_at': timezone.now(),
                    'read_at': timezone.now()
                }
            )
            if receipt.status != 'read':
                receipt.status = 'read'
                if not receipt.delivered_at:
                    receipt.delivered_at = timezone.now()
                receipt.read_at = timezone.now()
                receipt.save(update_fields=['status', 'delivered_at', 'read_at'])
        except Message.DoesNotExist:
            pass
        except Exception as e:
            print(f"[ChatConsumer] _mark_read error: {e}")
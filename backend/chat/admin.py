from django.contrib import admin
from .models import ChatRoom, ChatRoomMember, Message, MessageDeletion, MessageReceipt


class ChatRoomMemberInline(admin.TabularInline):
    model = ChatRoomMember
    extra = 0
    readonly_fields = ['joined_at', 'last_read_at']


@admin.register(ChatRoom)
class ChatRoomAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'room_type', 'student', 'is_active', 'created_at']
    list_filter = ['room_type', 'is_active']
    search_fields = ['name', 'student__roll_number']
    inlines = [ChatRoomMemberInline]


@admin.register(ChatRoomMember)
class ChatRoomMemberAdmin(admin.ModelAdmin):
    list_display = ['id', 'chatroom', 'user', 'is_admin', 'is_hidden', 'can_send_message', 'joined_at']
    list_filter = ['is_admin', 'is_hidden', 'can_send_message']
    search_fields = ['chatroom__name', 'user__username']


class MessageReceiptInline(admin.TabularInline):
    model = MessageReceipt
    extra = 0
    readonly_fields = ['delivered_at', 'read_at']


@admin.register(Message)
class MessageAdmin(admin.ModelAdmin):
    list_display = ['id', 'chatroom', 'sender', 'message_type', 'sent_at', 'is_deleted_by_admin']
    list_filter = ['message_type', 'is_deleted_by_admin']
    search_fields = ['chatroom__name', 'sender__username', 'content']
    inlines = [MessageReceiptInline]


@admin.register(MessageDeletion)
class MessageDeletionAdmin(admin.ModelAdmin):
    list_display = ['id', 'message', 'user', 'deleted_at']


@admin.register(MessageReceipt)
class MessageReceiptAdmin(admin.ModelAdmin):
    list_display = ['id', 'message', 'user', 'status', 'delivered_at', 'read_at']
    list_filter = ['status']
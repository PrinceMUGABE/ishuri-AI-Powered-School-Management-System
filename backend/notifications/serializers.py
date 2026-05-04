from rest_framework import serializers
from .models import Notification


class NotificationSerializer(serializers.ModelSerializer):
    """Serializer for notifications."""
    
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)
    priority_display = serializers.CharField(source='get_priority_display', read_only=True)
    type_display = serializers.CharField(source='get_notification_type_display', read_only=True)
    
    class Meta:
        model = Notification
        fields = [
            'id', 'notification_type', 'type_display', 'priority', 'priority_display',
            'title', 'message', 'extra_data', 'is_read', 'created_at', 'read_at',
            'created_by', 'created_by_username'
        ]
        read_only_fields = ['id', 'created_at', 'read_at']


class MarkReadSerializer(serializers.Serializer):
    """Serializer for marking notifications as read."""
    
    notification_ids = serializers.ListField(
        child=serializers.IntegerField(),
        required=False,
        help_text="List of notification IDs to mark as read"
    )
    mark_all = serializers.BooleanField(
        required=False,
        default=False,
        help_text="Mark all notifications as read"
    )
    
    def validate(self, data):
        if not data.get('notification_ids') and not data.get('mark_all'):
            raise serializers.ValidationError(
                "Either notification_ids or mark_all must be provided"
            )
        return data
    
    
    
    
    
    
    
    
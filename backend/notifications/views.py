from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from django.shortcuts import get_object_or_404
# from accounts.views.base_view import BaseAPIView, api_endpoint
from accounts.views.base_view import BaseAPIView, api_endpoint
from accounts.translations.translator import translator
from .models import Notification
from .serializers import NotificationSerializer, MarkReadSerializer
from .services import NotificationService


class UserNotificationsView(BaseAPIView):
    """Get notifications for the current user."""
    
    permission_classes = [IsAuthenticated]
    
    @api_endpoint
    def get(self, request):
        """
        Get notifications for the current user.
        
        Query parameters:
            - limit: Number of notifications to return (default: 50)
            - unread_only: Only return unread notifications (default: false)
        """
        lang_code = self.get_language(request)
        self.translator = translator
        self.lang_code = lang_code
        
        limit = int(request.query_params.get('limit', 50))
        unread_only = request.query_params.get('unread_only', 'false').lower() == 'true'
        
        notifications = NotificationService.get_user_notifications(
            request.user, 
            limit=limit, 
            unread_only=unread_only
        )
        
        serializer = NotificationSerializer(notifications, many=True)
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'data': {
                'unread_count': Notification.objects.filter(user=request.user, is_read=False).count(),
                'notifications': serializer.data
            }
        }, status=status.HTTP_200_OK)


class NotificationDetailView(BaseAPIView):
    """Get, mark as read, or delete a specific notification."""
    
    permission_classes = [IsAuthenticated]
    
    def get_notification(self, notification_id, user):
        """Get notification or raise 404."""
        return get_object_or_404(Notification, id=notification_id, user=user)
    
    @api_endpoint
    def get(self, request, notification_id):
        """Get a specific notification."""
        lang_code = self.get_language(request)
        self.translator = translator
        self.lang_code = lang_code
        
        notification = self.get_notification(notification_id, request.user)
        serializer = NotificationSerializer(notification)
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'data': serializer.data
        }, status=status.HTTP_200_OK)
    
    @api_endpoint
    def post(self, request, notification_id):
        """Mark a notification as read."""
        lang_code = self.get_language(request)
        self.translator = translator
        self.lang_code = lang_code
        
        notification = self.get_notification(notification_id, request.user)
        notification.mark_as_read()
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'message': 'Notification marked as read'
        }, status=status.HTTP_200_OK)
    
    @api_endpoint
    def delete(self, request, notification_id):
        """Delete a notification."""
        lang_code = self.get_language(request)
        self.translator = translator
        self.lang_code = lang_code
        
        notification = self.get_notification(notification_id, request.user)
        notification.delete()
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'message': 'Notification deleted successfully'
        }, status=status.HTTP_200_OK)


class MarkNotificationsReadView(BaseAPIView):
    """Mark multiple notifications as read."""
    
    permission_classes = [IsAuthenticated]
    
    @api_endpoint
    def post(self, request):
        """Mark notifications as read."""
        lang_code = self.get_language(request)
        self.translator = translator
        self.lang_code = lang_code
        
        serializer = MarkReadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        data = serializer.validated_data
        
        if data.get('mark_all'):
            count = NotificationService.mark_all_as_read(request.user)
            message = f"Marked {count} notifications as read"
        else:
            notification_ids = data.get('notification_ids', [])
            count = 0
            for notification_id in notification_ids:
                if NotificationService.mark_as_read(notification_id, request.user):
                    count += 1
            message = f"Marked {count} notifications as read"
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'message': message,
            'data': {
                'marked_count': count,
                'unread_count': Notification.objects.filter(user=request.user, is_read=False).count()
            }
        }, status=status.HTTP_200_OK)
        
        
        
        
        
        
        
        
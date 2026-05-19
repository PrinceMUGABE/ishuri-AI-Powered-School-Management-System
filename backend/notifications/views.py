from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework.pagination import PageNumberPagination

from notifications.models import Notification, NotificationPreference
from notifications.serializers import (
    NotificationSerializer, NotificationMarkReadSerializer,
    NotificationPreferenceSerializer
)
from notifications.services import NotificationService
from accounts.models import User


class NotificationPagination(PageNumberPagination):
    page_size = 20
    page_size_query_param = 'page_size'
    max_page_size = 100


class NotificationListView(APIView):
    """List user's notifications"""
    permission_classes = [IsAuthenticated]
    pagination_class = NotificationPagination
    
    def get(self, request):
        notifications = Notification.objects.filter(
            recipient=request.user
        ).order_by('-created_at')
        
        # Apply filters
        notification_type = request.query_params.get('type')
        if notification_type:
            notifications = notifications.filter(notification_type=notification_type)
        
        status_filter = request.query_params.get('status')
        if status_filter:
            notifications = notifications.filter(status=status_filter)
        
        paginator = self.pagination_class()
        page = paginator.paginate_queryset(notifications, request)
        
        serializer = NotificationSerializer(page, many=True)
        return paginator.get_paginated_response({
            'success': True,
            'data': serializer.data
        })


class NotificationDetailView(APIView):
    """Get, update a specific notification"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id, recipient=request.user)
            serializer = NotificationSerializer(notification)
            return Response({
                'success': True,
                'data': serializer.data
            })
        except Notification.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Notification not found'
            }, status=status.HTTP_404_NOT_FOUND)
    
    def patch(self, request, notification_id):
        try:
            notification = Notification.objects.get(id=notification_id, recipient=request.user)
            notification.mark_as_read()
            serializer = NotificationSerializer(notification)
            return Response({
                'success': True,
                'message': 'Notification marked as read',
                'data': serializer.data
            })
        except Notification.DoesNotExist:
            return Response({
                'success': False,
                'message': 'Notification not found'
            }, status=status.HTTP_404_NOT_FOUND)


class NotificationMarkReadView(APIView):
    """Mark notifications as read"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        serializer = NotificationMarkReadSerializer(data=request.data)
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        if serializer.validated_data.get('mark_all'):
            count = NotificationService.mark_all_as_read(request.user)
            message = f'All notifications marked as read'
        else:
            notification_ids = serializer.validated_data.get('notification_ids', [])
            count = NotificationService.mark_as_read(notification_ids, request.user)
            message = f'{count} notifications marked as read'
        
        return Response({
            'success': True,
            'message': message,
            'data': {'marked_count': count}
        })


class NotificationUnreadCountView(APIView):
    """Get unread notification count"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        count = NotificationService.get_unread_count(request.user)
        return Response({
            'success': True,
            'data': {'unread_count': count}
        })


class NotificationSummaryView(APIView):
    """Get notification summary for header dropdown"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        unread_count = NotificationService.get_unread_count(request.user)
        
        recent_notifications = Notification.objects.filter(
            recipient=request.user
        ).order_by('-created_at')[:10]
        
        serializer = NotificationSerializer(recent_notifications, many=True)
        
        return Response({
            'success': True,
            'data': {
                'unread_count': unread_count,
                'recent_notifications': serializer.data
            }
        })


class NotificationPreferenceView(APIView):
    """Get and update user notification preferences"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preferences)
        return Response({
            'success': True,
            'data': serializer.data
        })
    
    def put(self, request):
        preferences, _ = NotificationPreference.objects.get_or_create(user=request.user)
        serializer = NotificationPreferenceSerializer(preferences, data=request.data, partial=True)
        
        if not serializer.is_valid():
            return Response({
                'success': False,
                'errors': serializer.errors
            }, status=status.HTTP_400_BAD_REQUEST)
        
        serializer.save()
        
        return Response({
            'success': True,
            'message': 'Preferences updated successfully',
            'data': serializer.data
        })
        
        
        
        
class SendNotificationView(APIView):
    """Send notification to users (admin only)"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        if request.user.role != 'admin':
            return Response({
                'success': False,
                'message': 'Only admins can send notifications'
            }, status=status.HTTP_403_FORBIDDEN)
        
        recipient_type = request.data.get('recipient_type')
        title = request.data.get('title')
        message = request.data.get('message')
        priority = request.data.get('priority', 'medium')
        
        if recipient_type == 'specific':
            user_ids = request.data.get('user_ids', [])
            users = User.objects.filter(id__in=user_ids)
        elif recipient_type == 'role':
            role = request.data.get('role')
            users = User.objects.filter(role=role, status='active')
        else:  # all
            users = User.objects.filter(status='active')
        
        for user in users:
            NotificationService.create_notification(
                recipient=user,
                notification_type='system_alert',
                title=title,
                message=message,
                priority=priority,
                created_by=request.user
            )
        
        return Response({
            'success': True,
            'message': f'Notification sent to {users.count()} users'
        })


class NotificationDeleteView(APIView):
    """Delete notification (admin only)"""
    permission_classes = [IsAuthenticated]
    
    def delete(self, request, notification_id):
        if request.user.role != 'admin':
            return Response({
                'success': False,
                'message': 'Only admins can delete notifications'
            }, status=status.HTTP_403_FORBIDDEN)
        
        try:
            notification = Notification.objects.get(id=notification_id)
            notification.delete()
            return Response({'success': True, 'message': 'Notification deleted'})
        except Notification.DoesNotExist:
            return Response({'success': False, 'message': 'Notification not found'}, status=404)
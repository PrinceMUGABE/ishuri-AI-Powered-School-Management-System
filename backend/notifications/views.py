from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework import status

from notifications.models import Notification, NotificationPreference
from notifications.serializers import (
    NotificationSerializer,
    NotificationMarkReadSerializer,
    NotificationPreferenceSerializer,
)
from notifications.services import NotificationService
from accounts.models import User


# ============================================================================
# NOTIFICATION LIST
# Returns ALL notifications for the authenticated user.
# Pagination and filtering are handled on the frontend.
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_list(request):
    """Return all notifications for the current user."""
    notifications = Notification.objects.filter(
        recipient=request.user
    ).order_by('-created_at')

    serializer = NotificationSerializer(notifications, many=True)
    return Response({
        'success': True,
        'count': notifications.count(),
        'results': serializer.data,
    })


# ============================================================================
# NOTIFICATION DETAIL  —  GET / PATCH (mark as read)
# ============================================================================
@api_view(['GET', 'PATCH'])
@permission_classes([IsAuthenticated])
def notification_detail(request, notification_id):
    """
    GET  — retrieve a single notification.
    PATCH — mark it as read.
    """
    try:
        notification = Notification.objects.get(
            id=notification_id,
            recipient=request.user
        )
    except Notification.DoesNotExist:
        return Response(
            {'success': False, 'message': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )

    if request.method == 'GET':
        serializer = NotificationSerializer(notification)
        return Response({'success': True, 'data': serializer.data})

    # PATCH — mark as read
    notification.mark_as_read()
    serializer = NotificationSerializer(notification)
    return Response({
        'success': True,
        'message': 'Notification marked as read',
        'data': serializer.data,
    })


# ============================================================================
# MARK NOTIFICATIONS AS READ  —  POST
# Body: { "notification_ids": [1, 2, 3] }  OR  { "mark_all": true }
# ============================================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def notification_mark_read(request):
    """Mark one, several, or all notifications as read."""
    serializer = NotificationMarkReadSerializer(data=request.data)
    if not serializer.is_valid():
        return Response(
            {'success': False, 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )

    if serializer.validated_data.get('mark_all'):
        count = NotificationService.mark_all_as_read(request.user)
        message = 'All notifications marked as read'
    else:
        notification_ids = serializer.validated_data.get('notification_ids', [])
        count = NotificationService.mark_as_read(notification_ids, request.user)
        message = f'{count} notification(s) marked as read'

    return Response({
        'success': True,
        'message': message,
        'data': {'marked_count': count},
    })


# ============================================================================
# UNREAD COUNT  —  GET
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_unread_count(request):
    """Return the number of unread notifications for the current user."""
    count = NotificationService.get_unread_count(request.user)
    return Response({
        'success': True,
        'data': {'unread_count': count},
    })


# ============================================================================
# NOTIFICATION SUMMARY  —  GET
# Returns unread count + 10 most recent notifications (for header dropdown).
# ============================================================================
@api_view(['GET'])
@permission_classes([IsAuthenticated])
def notification_summary(request):
    """Lightweight summary used by the header bell-icon dropdown."""
    unread_count = NotificationService.get_unread_count(request.user)
    recent = Notification.objects.filter(
        recipient=request.user
    ).order_by('-created_at')[:10]

    serializer = NotificationSerializer(recent, many=True)
    return Response({
        'success': True,
        'data': {
            'unread_count': unread_count,
            'recent_notifications': serializer.data,
        },
    })


# ============================================================================
# NOTIFICATION PREFERENCES  —  GET / PUT
# ============================================================================
@api_view(['GET', 'PUT'])
@permission_classes([IsAuthenticated])
def notification_preferences(request):
    """
    GET — retrieve the current user's notification preferences.
    PUT — update them (partial update supported).
    """
    preferences, _ = NotificationPreference.objects.get_or_create(user=request.user)

    if request.method == 'GET':
        serializer = NotificationPreferenceSerializer(preferences)
        return Response({'success': True, 'data': serializer.data})

    # PUT
    serializer = NotificationPreferenceSerializer(
        preferences, data=request.data, partial=True
    )
    if not serializer.is_valid():
        return Response(
            {'success': False, 'errors': serializer.errors},
            status=status.HTTP_400_BAD_REQUEST
        )
    serializer.save()
    return Response({
        'success': True,
        'message': 'Preferences updated successfully',
        'data': serializer.data,
    })


# ============================================================================
# SEND NOTIFICATION  —  POST  (admin only)
# Body: { recipient_type, title, message, priority, [user_ids | role] }
# ============================================================================
@api_view(['POST'])
@permission_classes([IsAuthenticated])
def send_notification(request):
    """Send a manual notification to specific users, a role, or everyone."""
    if request.user.role != 'admin':
        return Response(
            {'success': False, 'message': 'Only admins can send notifications'},
            status=status.HTTP_403_FORBIDDEN
        )

    recipient_type = request.data.get('recipient_type')
    title          = request.data.get('title', '').strip()
    message        = request.data.get('message', '').strip()
    priority       = request.data.get('priority', 'medium')

    if not title or not message:
        return Response(
            {'success': False, 'message': 'title and message are required'},
            status=status.HTTP_400_BAD_REQUEST
        )

    if recipient_type == 'specific':
        user_ids = request.data.get('user_ids', [])
        if not user_ids:
            return Response(
                {'success': False, 'message': 'user_ids is required for recipient_type=specific'},
                status=status.HTTP_400_BAD_REQUEST
            )
        users = User.objects.filter(id__in=user_ids)

    elif recipient_type == 'role':
        role = request.data.get('role', '').strip()
        if not role:
            return Response(
                {'success': False, 'message': 'role is required for recipient_type=role'},
                status=status.HTTP_400_BAD_REQUEST
            )
        users = User.objects.filter(role=role, status='active')

    else:  # 'all'
        users = User.objects.filter(status='active')

    for user in users:
        NotificationService.create_notification(
            recipient=user,
            notification_type='system_alert',
            title=title,
            message=message,
            priority=priority,
            created_by=request.user,
        )

    return Response({
        'success': True,
        'message': f'Notification sent to {users.count()} user(s)',
    }, status=status.HTTP_201_CREATED)


# ============================================================================
# DELETE NOTIFICATION  —  DELETE  (admin only)
# ============================================================================
@api_view(['DELETE'])
@permission_classes([IsAuthenticated])
def notification_delete(request, notification_id):
    """Permanently delete a notification (admin only)."""
    if request.user.role != 'admin':
        return Response(
            {'success': False, 'message': 'Only admins can delete notifications'},
            status=status.HTTP_403_FORBIDDEN
        )

    try:
        notification = Notification.objects.get(id=notification_id)
        notification.delete()
        return Response({'success': True, 'message': 'Notification deleted'})
    except Notification.DoesNotExist:
        return Response(
            {'success': False, 'message': 'Notification not found'},
            status=status.HTTP_404_NOT_FOUND
        )
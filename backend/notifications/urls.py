from django.urls import path
from notifications.views import (
    UserNotificationsView, NotificationDetailView, MarkNotificationsReadView
)

app_name = 'notifications'

urlpatterns = [
    path('', UserNotificationsView.as_view(), name='notifications'),
    path('mark-read/', MarkNotificationsReadView.as_view(), name='mark-read'),
    path('<int:notification_id>/', NotificationDetailView.as_view(), name='notification-detail'),
]
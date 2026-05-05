from django.urls import path
from notifications import views

app_name = 'notifications'

urlpatterns = [
    path('', views.NotificationListView.as_view(), name='notification-list'),
    path('summary/', views.NotificationSummaryView.as_view(), name='notification-summary'),
    path('unread-count/', views.NotificationUnreadCountView.as_view(), name='unread-count'),
    path('mark-read/', views.NotificationMarkReadView.as_view(), name='mark-read'),
    path('<int:notification_id>/', views.NotificationDetailView.as_view(), name='notification-detail'),
    path('preferences/', views.NotificationPreferenceView.as_view(), name='preferences'),
]
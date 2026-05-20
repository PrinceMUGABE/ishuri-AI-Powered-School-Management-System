from django.urls import path
from notifications import views

app_name = 'notifications'

urlpatterns = [
    path('',                           views.notification_list,         name='notification-list'),
    path('summary/',                   views.notification_summary,       name='notification-summary'),
    path('unread-count/',              views.notification_unread_count,  name='unread-count'),
    path('mark-read/',                 views.notification_mark_read,     name='mark-read'),
    path('preferences/',               views.notification_preferences,   name='preferences'),
    path('send/',                      views.send_notification,          name='send-notification'),
    path('<int:notification_id>/',     views.notification_detail,        name='notification-detail'),
    path('<int:notification_id>/delete/', views.notification_delete,     name='notification-delete'),
]
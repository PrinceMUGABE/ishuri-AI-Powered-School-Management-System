from django.contrib import admin
from django.urls import path, include, re_path
from django.conf import settings
from django.conf.urls.static import static
from django.views.static import serve

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/account/', include('accounts.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/academics/', include('academics.urls')),
    path('api/teachers/', include('teachers.urls')),
    path('api/students/', include('students.urls')),
    path('api/chat/', include('chat.urls')),
    path('api/payments/', include('payments.urls')),
    path('api/academics-records/', include('academics_records.urls')),
    
    # Serve media files directly
    re_path(r'^api/media/(?P<path>.*)$', serve, {'document_root': settings.MEDIA_ROOT}),
]

if settings.DEBUG:
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
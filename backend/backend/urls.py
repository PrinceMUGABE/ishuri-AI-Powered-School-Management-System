
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/account/', include('accounts.urls')),
    path('api/notifications/', include('notifications.urls')),
    path('api/academics/', include('academics.urls')),
    path('api/teachers/', include('teachers.urls')),
    path('api/students/', include('students.urls')),
]

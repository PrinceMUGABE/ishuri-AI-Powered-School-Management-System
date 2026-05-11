"""
ASGI config for the project.
Configures Django Channels with Redis channel layer for real-time chat.

Replace 'backend' with your actual project module name if different.
"""

import os
import django
from django.core.asgi import get_asgi_application
from channels.routing import ProtocolTypeRouter, URLRouter
from channels.security.websocket import AllowedHostsOriginValidator

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'backend.settings')

django.setup()

# Import after django.setup() so apps are ready
from channels.auth import AuthMiddlewareStack
from chat.routing import websocket_urlpatterns

application = ProtocolTypeRouter({
    # Standard Django HTTP requests
    'http': get_asgi_application(),

    # WebSocket connections — wrapped with JWT auth middleware
    'websocket': AllowedHostsOriginValidator(
        AuthMiddlewareStack(
            URLRouter(websocket_urlpatterns)
        )
    ),
})
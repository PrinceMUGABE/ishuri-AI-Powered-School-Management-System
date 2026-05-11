"""
JWT Authentication middleware for Django Channels WebSocket connections.

Django Channels' built-in AuthMiddlewareStack only works with session-based auth.
This middleware reads the JWT token from the WebSocket query string:
  ws://host/ws/chat/1/?token=<access_token>

Place this file at: chat/middleware.py

Usage in asgi.py:
    from chat.middleware import JWTAuthMiddlewareStack
    ...
    'websocket': JWTAuthMiddlewareStack(URLRouter(websocket_urlpatterns))
"""

from urllib.parse import parse_qs
from django.contrib.auth.models import AnonymousUser
from django.db import close_old_connections
from channels.middleware import BaseMiddleware
from channels.auth import AuthMiddlewareStack
from rest_framework_simplejwt.tokens import AccessToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError


class JWTAuthMiddleware(BaseMiddleware):
    """
    Authenticate WebSocket connections using a JWT access token
    passed as a query parameter: ?token=<jwt_access_token>
    """

    async def __call__(self, scope, receive, send):
        close_old_connections()

        # Extract token from query string
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token_list = params.get('token', [])

        if token_list:
            token_key = token_list[0]
            scope['user'] = await self._get_user(token_key)
        else:
            scope['user'] = AnonymousUser()

        return await super().__call__(scope, receive, send)

    @staticmethod
    async def _get_user(token_key):
        from channels.db import database_sync_to_async
        from django.contrib.auth import get_user_model

        User = get_user_model()

        @database_sync_to_async
        def get_user():
            try:
                token = AccessToken(token_key)
                user_id = token['user_id']
                return User.objects.get(id=user_id)
            except (InvalidToken, TokenError, User.DoesNotExist, KeyError):
                return AnonymousUser()

        return await get_user()


def JWTAuthMiddlewareStack(inner):
    """Convenience wrapper — replaces AuthMiddlewareStack for JWT-based auth."""
    return JWTAuthMiddleware(inner)
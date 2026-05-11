from django.urls import re_path
from . import consumers

websocket_urlpatterns = [
    # ws://host/ws/chat/<chatroom_id>/
    re_path(r'^ws/chat/(?P<chatroom_id>\d+)/$', consumers.ChatConsumer.as_asgi()),
]
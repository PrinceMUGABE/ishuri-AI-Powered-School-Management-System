from django.urls import path
from . import views

urlpatterns = [

    # ── Chatrooms ────────────────────────────────────────────────────────────

    # POST  /chat/chatrooms/create/
    path('chatrooms/create/', views.create_chatroom, name='create_chatroom'),

    # GET   /chat/chatrooms/all/               (admin)
    path('chatrooms/all/', views.get_all_chatrooms, name='get_all_chatrooms'),

    # GET   /chat/chatrooms/student/           (logged-in student)
    path('chatrooms/student/', views.get_student_chatrooms, name='get_student_chatrooms'),

    # GET   /chat/chatrooms/teacher/           (logged-in teacher)
    path('chatrooms/teacher/', views.get_teacher_chatrooms, name='get_teacher_chatrooms'),

    # GET   /chat/chatrooms/parent/            (logged-in parent)
    path('chatrooms/parent/', views.get_parent_chatrooms, name='get_parent_chatrooms'),

    # DELETE /chat/chatrooms/<id>/delete/      (admin)
    path('chatrooms/<int:chatroom_id>/delete/', views.delete_chatroom, name='delete_chatroom'),

    # PATCH  /chat/chatrooms/<id>/settings/    (admin)
    path('chatrooms/<int:chatroom_id>/settings/', views.update_chatroom_settings, name='update_chatroom_settings'),

    # ── Members ──────────────────────────────────────────────────────────────

    # POST   /chat/chatrooms/<id>/members/add/
    path('chatrooms/<int:chatroom_id>/members/add/', views.add_chatroom_member, name='add_chatroom_member'),

    # DELETE /chat/chatrooms/<id>/members/<user_id>/remove/
    path('chatrooms/<int:chatroom_id>/members/<int:user_id>/remove/', views.remove_chatroom_member, name='remove_chatroom_member'),

    # PATCH  /chat/chatrooms/<id>/members/<user_id>/disable/
    path('chatrooms/<int:chatroom_id>/members/<int:user_id>/disable/', views.disable_chatroom_member, name='disable_chatroom_member'),

    # PATCH  /chat/chatrooms/<id>/members/<user_id>/enable/
    path('chatrooms/<int:chatroom_id>/members/<int:user_id>/enable/', views.enable_chatroom_member, name='enable_chatroom_member'),

    # ── Messages ─────────────────────────────────────────────────────────────

    # GET   /chat/chatrooms/<id>/messages/
    path('chatrooms/<int:chatroom_id>/messages/', views.get_chatroom_messages, name='get_chatroom_messages'),

    # GET   /chat/chatrooms/<id>/messages/unread/
    path('chatrooms/<int:chatroom_id>/messages/unread/', views.get_unread_messages, name='get_unread_messages'),

    # POST  /chat/messages/send/               (text)
    path('messages/send/', views.send_message, name='send_message'),

    # POST  /chat/messages/upload/             (file: multipart)
    path('messages/upload/', views.upload_file_message, name='upload_file_message'),

    # POST  /chat/messages/<id>/reply/         (text or file)
    path('messages/<int:message_id>/reply/', views.reply_message, name='reply_message'),

    # PATCH  /chat/messages/<id>/update/       (sender, text only, not yet read)
    path('messages/<int:message_id>/update/', views.update_message, name='update_message'),

    # GET    /chat/messages/<id>/info/         (sender or admin)
    path('messages/<int:message_id>/info/', views.get_message_info, name='get_message_info'),

    # DELETE /chat/messages/<id>/delete/admin/
    path('messages/<int:message_id>/delete/admin/', views.delete_message_admin, name='delete_message_admin'),

    # DELETE /chat/messages/<id>/delete/sender/
    path('messages/<int:message_id>/delete/sender/', views.delete_message_sender, name='delete_message_sender'),

    # DELETE /chat/messages/<id>/delete/receiver/
    path('messages/<int:message_id>/delete/receiver/', views.delete_message_receiver, name='delete_message_receiver'),
]
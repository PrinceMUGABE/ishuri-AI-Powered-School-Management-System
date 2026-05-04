from django.urls import path
from accounts.views.auth_views import LoginView, LogoutView, RefreshTokenView  # Changed from 'view' to 'views'
from accounts.views.user_views import (
    UserCreateView, UserRetrieveUpdateDeleteView, AllUsersListView,
    CurrentUserView, ProfileUpdateView, UserActivationToggleView
)
from accounts.views.language_views import (
    GetCurrentLanguageView, ChangeLanguageView, ClearLanguageView
)

app_name = 'accounts'

urlpatterns = [
    # Authentication endpoints
    path('login/', LoginView.as_view(), name='login'),
    path('logout/', LogoutView.as_view(), name='logout'),
    path('refresh/', RefreshTokenView.as_view(), name='token_refresh'),
    
    # Language endpoints
    path('language/', GetCurrentLanguageView.as_view(), name='get-language'),
    path('language/change/', ChangeLanguageView.as_view(), name='change-language'),
    path('language/clear/', ClearLanguageView.as_view(), name='clear-language'),
    
    # Current user endpoints
    path('me/', CurrentUserView.as_view(), name='current-user'),
    path('me/update/', ProfileUpdateView.as_view(), name='profile-update'),
    
    # User management endpoints (admin only)
    path('users/', AllUsersListView.as_view(), name='user-list'),
    path('users/create/', UserCreateView.as_view(), name='user-create'),
    path('users/<int:user_id>/', UserRetrieveUpdateDeleteView.as_view(), name='user-detail'),
    path('users/<int:user_id>/toggle-status/', UserActivationToggleView.as_view(), name='user-toggle-status'),
]
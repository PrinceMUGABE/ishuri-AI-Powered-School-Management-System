# accounts/urls.py

from django.urls import path
from accounts import views

urlpatterns = [
    # Auth
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.RefreshTokenView.as_view(), name='token_refresh'),
    
    # Password Reset (NEW SIMPLIFIED VERSION)
    path('check-username/', views.CheckUsernameView.as_view(), name='check_username'),
    path('forgot-password/', views.ForgotPasswordView.as_view(), name='forgot_password'),
    path('change-password/', views.ChangePasswordView.as_view(), name='change_password'),
    
    # Profile
    path('me/', views.CurrentUserView.as_view()),
    path('me/update/', views.ProfileUpdateView.as_view()),
    
    # User Management (Admin Only)
    path('users/', views.UserListView.as_view()),
    path('users/create/', views.UserCreateView.as_view()),
    path('users/<int:user_id>/', views.UserDetailView.as_view()),
    path('users/<int:user_id>/toggle-status/', views.UserActivationToggleView.as_view()),
]
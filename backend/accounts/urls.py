from django.urls import path
from accounts import views

urlpatterns = [
    # Auth
    path('login/', views.LoginView.as_view(), name='login'),
    path('logout/', views.LogoutView.as_view(), name='logout'),
    path('refresh/', views.RefreshTokenView.as_view(), name='token_refresh'),
    
    # Password Reset
    path('password-reset/request/', views.PasswordResetRequestView.as_view()),
    path('password-reset/confirm/', views.PasswordResetConfirmView.as_view()),
    path('change-password/', views.ChangePasswordView.as_view()),
    
    # Profile
    path('me/', views.CurrentUserView.as_view()),
    path('me/update/', views.ProfileUpdateView.as_view()),
    
    # User Management (Admin Only)
    path('users/', views.UserListView.as_view()),
    path('users/create/', views.UserCreateView.as_view()),
    path('users/<int:user_id>/', views.UserDetailView.as_view()),
    path('users/<int:user_id>/toggle-status/', views.UserActivationToggleView.as_view()),
]
import logging
from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView
from rest_framework_simplejwt.tokens import RefreshToken
from django.shortcuts import get_object_or_404
from django.utils import timezone

from accounts.models import User
from accounts.serializers import (
    LoginSerializer, RefreshTokenSerializer, UserListSerializer, UserDetailSerializer,
    UserCreateSerializer, UserUpdateSerializer, ProfileUpdateSerializer,
    PasswordResetRequestSerializer, PasswordResetConfirmSerializer
)
from accounts.permissions import IsAdmin, IsAdminOrSelf
from accounts.utils import generate_reset_token
from accounts.translations import get_message, get_role_display, get_status_display

# Import notification service for in-app notifications
from notifications.services import NotificationService

logger = logging.getLogger(__name__)


# ==================== HELPER FUNCTION ====================

def get_request_language(request):
    """
    Detect language from request headers.
    Priority: X-Language > Accept-Language > Default 'en'
    """
    # Check X-Language header (custom header from frontend)
    if request.headers.get('X-Language'):
        lang = request.headers.get('X-Language')
        if lang in ['en', 'fr', 'rw']:
            print(f"[Language] Detected from X-Language header: {lang}")
            return lang
    
    # Check Accept-Language header
    if request.headers.get('Accept-Language'):
        accept_lang = request.headers.get('Accept-Language')
        lang = accept_lang.split(',')[0].split('-')[0]
        if lang in ['en', 'fr', 'rw']:
            print(f"[Language] Detected from Accept-Language header: {lang}")
            return lang
    
    # Check user profile if authenticated
    if request.user.is_authenticated and hasattr(request.user, 'language'):
        if request.user.language in ['en', 'fr', 'rw']:
            print(f"[Language] Detected from user profile: {request.user.language}")
            return request.user.language
    
    # Default to English
    print("[Language] No language detected, defaulting to: en")
    return 'en'


# ==================== AUTH VIEWS ====================

class LoginView(APIView):
    """User login view with in-app notification"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        print('\n' + '='*60)
        print('[LoginView] Request received')
        print('='*60)
        print(f'[LoginView] Request data: {request.data}')
        
        # Detect language
        lang = get_request_language(request)
        print(f'[LoginView] Using language: {lang}')
        
        # Initialize serializer
        serializer = LoginSerializer(
            data=request.data, 
            context={'request': request, 'language': lang}
        )
        
        if not serializer.is_valid():
            errors = list(serializer.errors.values())[0] if serializer.errors else 'Validation error'
            error_message = errors[0] if isinstance(errors, list) else errors
            
            print(f'[LoginView] Validation failed: {error_message}')
            
            return Response({
                'success': False,
                'message': error_message,
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.validated_data['user']
        print(f'[LoginView] User authenticated: {user.username} (role: {user.role})')
        
        # Generate tokens
        refresh = RefreshToken.for_user(user)
        
        # Update last login
        user.update_last_logged_in()
        
        # Create in-app notification for successful login
        try:
            NotificationService.create_user_notification(
                user=user,
                notification_type='login_success',
                created_by=user,
                extra_data={
                    'ip_address': request.META.get('REMOTE_ADDR', 'Unknown'),
                    'user_agent': request.META.get('HTTP_USER_AGENT', 'Unknown')[:50]
                },
                title=get_message('login_success', lang),
                message=f'You logged in successfully on {timezone.now().strftime("%Y-%m-%d %H:%M:%S")}',
                priority='low',
                action_url='/app/dashboard'
            )
            print(f'[LoginView] Login notification created for {user.username}')
        except Exception as e:
            print(f'[LoginView] Failed to create notification: {str(e)}')
        
        response_data = {
            'success': True,
            'status_code': status.HTTP_200_OK,
            'message': get_message('login_success', lang),
            'language': lang,
            'data': {
                'access_token': str(refresh.access_token),
                'refresh_token': str(refresh),
                'token_type': 'Bearer',
                'expires_in': 86400,
                'user': {
                    'id': user.id,
                    'username': user.username,
                    'role': user.role,
                    'role_display': get_role_display(user.role, lang),
                    'status': user.status,
                    'status_display': get_status_display(user.status, lang),
                    'language': user.language if user.language else lang,
                    'email': user.email
                }
            }
        }
        
        print(f'[LoginView] Login successful for user: {user.username}')
        print('='*60 + '\n')
        
        return Response(response_data)


class LogoutView(APIView):
    """User logout view"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        print('\n' + '='*60)
        print('[LogoutView] Request received')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[LogoutView] Using language: {lang}')
        
        username = request.user.username
        
        # Blacklist refresh token (optional, don't fail if it doesn't work)
        try:
            refresh_token = request.data.get('refresh')
            if refresh_token:
                token = RefreshToken(refresh_token)
                token.blacklist()
                print(f'[LogoutView] Token blacklisted for user: {username}')
        except Exception as e:
            print(f'[LogoutView] Token blacklist error (non-critical): {str(e)}')
        
        print(f'[LogoutView] Logout successful for user: {username}')
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'message': get_message('logout_success', lang),
            'language': lang
        })


class RefreshTokenView(APIView):
    """Refresh JWT access token"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        print('\n' + '='*60)
        print('[RefreshTokenView] Request received')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[RefreshTokenView] Using language: {lang}')
        
        serializer = RefreshTokenSerializer(data=request.data)
        
        if not serializer.is_valid():
            print(f'[RefreshTokenView] Invalid refresh token')
            return Response({
                'success': False,
                'message': 'Invalid refresh token',
                'language': lang
            }, status=status.HTTP_401_UNAUTHORIZED)
        
        try:
            refresh = RefreshToken(serializer.validated_data['refresh'])
            print(f'[RefreshTokenView] Token refreshed successfully')
            print('='*60 + '\n')
            
            return Response({
                'success': True,
                'language': lang,
                'data': {
                    'access_token': str(refresh.access_token),
                    'token_type': 'Bearer',
                    'expires_in': 86400
                }
            })
        except Exception as e:
            print(f'[RefreshTokenView] Error refreshing token: {str(e)}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'message': 'Invalid or expired refresh token',
                'language': lang
            }, status=status.HTTP_401_UNAUTHORIZED)


# ==================== USER MANAGEMENT VIEWS ====================

class UserListView(APIView):
    """List all users with filters (admin only)"""
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def get(self, request):
        print('\n' + '='*60)
        print('[UserListView] Request received')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[UserListView] Using language: {lang}')
        
        queryset = User.objects.all()
        
        # Apply filters
        role = request.query_params.get('role')
        if role:
            queryset = queryset.filter(role=role)
            print(f'[UserListView] Filter by role: {role}')
        
        status_filter = request.query_params.get('status')
        if status_filter:
            queryset = queryset.filter(status=status_filter)
            print(f'[UserListView] Filter by status: {status_filter}')
        
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(username__icontains=search)
            print(f'[UserListView] Search query: {search}')
        
        # Pagination parameters
        page = int(request.query_params.get('page', 1))
        page_size = int(request.query_params.get('page_size', 10))
        start = (page - 1) * page_size
        end = start + page_size
        
        total = queryset.count()
        paginated_users = queryset[start:end]
        
        serializer = UserListSerializer(paginated_users, many=True)
        
        print(f'[UserListView] Returning {len(paginated_users)} of {total} users')
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'language': lang,
            'data': {
                'count': total,
                'page': page,
                'page_size': page_size,
                'total_pages': (total + page_size - 1) // page_size,
                'results': serializer.data
            }
        })


class UserCreateView(APIView):
    """Create new user (admin only) with in-app notification"""
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def post(self, request):
        print('\n' + '='*60)
        print('[UserCreateView] Request received')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[UserCreateView] Using language: {lang}')
        print(f'[UserCreateView] Request data: {request.data}')
        
        serializer = UserCreateSerializer(data=request.data)
        
        if not serializer.is_valid():
            print(f'[UserCreateView] Validation failed: {serializer.errors}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'errors': serializer.errors,
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.save(created_by=request.user)
        
        print(f'[UserCreateView] User created: {user.username} (role: {user.role})')
        
        # Create in-app notification for the new user
        try:
            NotificationService.create_user_notification(
                user=user,
                notification_type='user_created',
                created_by=request.user,
                extra_data={'role': user.role, 'username': user.username},
                title='Account Created',
                message=f'Welcome {user.username}! Your account has been created with role: {user.get_role_display()}.',
                priority='high',
                action_url='/app/dashboard'
            )
            print(f'[UserCreateView] Welcome notification created for {user.username}')
        except Exception as e:
            print(f'[UserCreateView] Failed to create welcome notification: {str(e)}')
        
        # Create in-app notification for the admin who created the user
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='user_created',
                created_by=request.user,
                extra_data={'created_user': user.username, 'role': user.role},
                title='User Created',
                message=f'User {user.username} has been created successfully with role: {user.get_role_display()}.',
                priority='medium',
                action_url=f'/app/users/{user.id}'
            )
            print(f'[UserCreateView] Notification created for admin {request.user.username}')
        except Exception as e:
            print(f'[UserCreateView] Failed to create admin notification: {str(e)}')
        
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'message': get_message('user_created', lang),
            'language': lang,
            'data': UserDetailSerializer(user).data
        }, status=status.HTTP_201_CREATED)


class UserDetailView(APIView):
    """Get, update, delete user by ID"""
    permission_classes = [IsAuthenticated, IsAdminOrSelf]
    
    def get(self, request, user_id):
        print('\n' + '='*60)
        print(f'[UserDetailView] GET request for user_id: {user_id}')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[UserDetailView] Using language: {lang}')
        
        user = get_object_or_404(User, id=user_id)
        self.check_object_permissions(request, user)
        
        serializer = UserDetailSerializer(user)
        
        print(f'[UserDetailView] User data retrieved for: {user.username}')
        print('='*60 + '\n')
        
        return Response({
            'success': True, 
            'language': lang,
            'data': serializer.data
        })
    
    def put(self, request, user_id):
        print('\n' + '='*60)
        print(f'[UserDetailView] PUT request for user_id: {user_id}')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[UserDetailView] Using language: {lang}')
        print(f'[UserDetailView] Update data: {request.data}')
        
        user = get_object_or_404(User, id=user_id)
        
        # Check permission - only admin can update other users
        if request.user.role != 'admin':
            print(f'[UserDetailView] Permission denied: User {request.user.username} is not admin')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'message': 'Permission denied',
                'language': lang
            }, status=status.HTTP_403_FORBIDDEN)
        
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        
        if not serializer.is_valid():
            print(f'[UserDetailView] Validation failed: {serializer.errors}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'errors': serializer.errors,
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        old_role = user.role
        old_status = user.status
        
        serializer.save()
        
        print(f'[UserDetailView] User updated: {user.username}')
        
        # Create in-app notification for the updated user (if not updating self)
        if user.id != request.user.id:
            try:
                extra_data = {'updated_fields': list(request.data.keys())}
                if 'role' in request.data and old_role != user.role:
                    extra_data['old_role'] = old_role
                    extra_data['new_role'] = user.role
                if 'status' in request.data and old_status != user.status:
                    extra_data['old_status'] = old_status
                    extra_data['new_status'] = user.status
                
                NotificationService.create_user_notification(
                    user=user,
                    notification_type='user_updated',
                    created_by=request.user,
                    extra_data=extra_data,
                    title='Account Updated',
                    message=f'Your account was updated by {request.user.username}.',
                    priority='medium',
                    action_url='/app/profile'
                )
                print(f'[UserDetailView] Update notification created for {user.username}')
            except Exception as e:
                print(f'[UserDetailView] Failed to create update notification: {str(e)}')
        
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'message': get_message('user_updated', lang),
            'language': lang,
            'data': UserDetailSerializer(user).data
        })
    
    def delete(self, request, user_id):
        print('\n' + '='*60)
        print(f'[UserDetailView] DELETE request for user_id: {user_id}')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[UserDetailView] Using language: {lang}')
        
        user = get_object_or_404(User, id=user_id)
        
        # Check permission - only admin can delete users
        if request.user.role != 'admin':
            print(f'[UserDetailView] Permission denied: User {request.user.username} is not admin')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'message': 'Permission denied',
                'language': lang
            }, status=status.HTTP_403_FORBIDDEN)
        
        # Prevent self-deletion
        if user.id == request.user.id:
            print(f'[UserDetailView] Self-deletion prevented for user: {user.username}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'message': 'Cannot delete yourself',
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        username = user.username
        
        # Create in-app notification before deletion
        try:
            NotificationService.create_user_notification(
                user=user,
                notification_type='user_deleted',
                created_by=request.user,
                extra_data={'username': username, 'deleted_by': request.user.username},
                title='Account Deleted',
                message=f'Your account has been deleted by {request.user.username}.',
                priority='high'
            )
            print(f'[UserDetailView] Deletion notification created for {username}')
        except Exception as e:
            print(f'[UserDetailView] Failed to create deletion notification: {str(e)}')
        
        # Create notification for the admin who deleted
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='user_deleted',
                created_by=request.user,
                extra_data={'deleted_user': username},
                title='User Deleted',
                message=f'User {username} has been deleted successfully.',
                priority='medium'
            )
            print(f'[UserDetailView] Notification created for admin {request.user.username}')
        except Exception as e:
            print(f'[UserDetailView] Failed to create admin notification: {str(e)}')
        
        user.delete()
        
        print(f'[UserDetailView] User deleted: {username}')
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'message': get_message('user_deleted', lang),
            'language': lang,
            'username': username
        })


# ==================== PROFILE VIEWS ====================

class CurrentUserView(APIView):
    """Get current user profile"""
    permission_classes = [IsAuthenticated]
    
    def get(self, request):
        print('\n' + '='*60)
        print('[CurrentUserView] Request received')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[CurrentUserView] Using language: {lang}')
        
        serializer = UserDetailSerializer(request.user)
        
        print(f'[CurrentUserView] Profile data for user: {request.user.username}')
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'language': lang,
            'data': {
                'user': serializer.data,
                'current_language': lang,
                'available_languages': ['en', 'fr', 'rw']
            }
        })


class ProfileUpdateView(APIView):
    """Update current user profile"""
    permission_classes = [IsAuthenticated]
    
    def put(self, request):
        print('\n' + '='*60)
        print('[ProfileUpdateView] Request received')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[ProfileUpdateView] Using language: {lang}')
        print(f'[ProfileUpdateView] Update data: {request.data}')
        
        serializer = ProfileUpdateSerializer(
            request.user, 
            data=request.data, 
            partial=True,
            context={'request': request, 'language': lang}
        )
        
        if not serializer.is_valid():
            print(f'[ProfileUpdateView] Validation failed: {serializer.errors}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'errors': serializer.errors,
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        is_password_change = 'new_password' in request.data
        
        serializer.save()
        
        # Create in-app notification for profile update (not for password change, as that has its own notification)
        if not is_password_change:
            try:
                NotificationService.create_user_notification(
                    user=request.user,
                    notification_type='user_updated',
                    created_by=request.user,
                    extra_data={'updated_fields': list(request.data.keys())},
                    title='Profile Updated',
                    message='Your profile information has been updated successfully.',
                    priority='low',
                    action_url='/app/profile'
                )
                print(f'[ProfileUpdateView] Profile update notification created')
            except Exception as e:
                print(f'[ProfileUpdateView] Failed to create notification: {str(e)}')
        
        print(f'[ProfileUpdateView] Profile updated for user: {request.user.username}')
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'message': get_message('password_changed' if is_password_change else 'user_updated', lang),
            'language': lang,
            'data': UserDetailSerializer(request.user).data
        })


class UserActivationToggleView(APIView):
    """Toggle user activation status (admin only)"""
    permission_classes = [IsAuthenticated, IsAdmin]
    
    def post(self, request, user_id):
        print('\n' + '='*60)
        print(f'[UserActivationToggleView] Request for user_id: {user_id}')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[UserActivationToggleView] Using language: {lang}')
        
        user = get_object_or_404(User, id=user_id)
        
        # Prevent self-deactivation
        if user.id == request.user.id:
            print(f'[UserActivationToggleView] Cannot change own status for user: {user.username}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'message': 'Cannot change your own status',
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        old_status = user.status
        new_status = User.Status.INACTIVE if user.status == User.Status.ACTIVE else User.Status.ACTIVE
        user.status = new_status
        user.save()
        
        print(f'[UserActivationToggleView] User status changed: {user.username} ({old_status} -> {new_status})')
        
        # Create in-app notification for the user about status change
        try:
            status_action = 'activated' if new_status == User.Status.ACTIVE else 'deactivated'
            NotificationService.create_user_notification(
                user=user,
                notification_type='user_status_changed',
                created_by=request.user,
                extra_data={
                    'old_status': old_status,
                    'new_status': new_status,
                    'action': status_action
                },
                title=f'Account {status_action.capitalize()}',
                message=f'Your account has been {status_action} by {request.user.username}.',
                priority='high' if new_status == User.Status.INACTIVE else 'medium',
                action_url='/login'
            )
            print(f'[UserActivationToggleView] Status change notification created for {user.username}')
        except Exception as e:
            print(f'[UserActivationToggleView] Failed to create notification: {str(e)}')
        
        # Create notification for the admin who changed status
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='user_status_changed',
                created_by=request.user,
                extra_data={
                    'user': user.username,
                    'old_status': old_status,
                    'new_status': new_status
                },
                title='User Status Changed',
                message=f'User {user.username} status changed from {old_status} to {new_status}.',
                priority='low'
            )
            print(f'[UserActivationToggleView] Notification created for admin {request.user.username}')
        except Exception as e:
            print(f'[UserActivationToggleView] Failed to create admin notification: {str(e)}')
        
        message = get_message('user_activated' if new_status == User.Status.ACTIVE else 'user_deactivated', lang)
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'message': message,
            'language': lang,
            'data': {'status': new_status}
        })


# ==================== PASSWORD RESET VIEWS ====================

class PasswordResetRequestView(APIView):
    """Request password reset"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        print('\n' + '='*60)
        print('[PasswordResetRequestView] Request received')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[PasswordResetRequestView] Using language: {lang}')
        print(f'[PasswordResetRequestView] Request data: {request.data}')
        
        serializer = PasswordResetRequestSerializer(
            data=request.data,
            context={'request': request, 'language': lang}
        )
        
        if not serializer.is_valid():
            print(f'[PasswordResetRequestView] Validation failed: {serializer.errors}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'errors': serializer.errors,
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.context['user']
        token = generate_reset_token(user.id)
        
        print(f'[PasswordResetRequestView] Reset token generated for user: {user.username}')
        
        # Create in-app notification about password reset request
        try:
            NotificationService.create_user_notification(
                user=user,
                notification_type='password_reset_request',
                created_by=user,
                extra_data={'reset_method': 'token'},
                title='Password Reset Requested',
                message='A password reset has been requested for your account. If you did not request this, please contact support immediately.',
                priority='high',
                action_url='/reset-password'
            )
            print(f'[PasswordResetRequestView] Reset request notification created for {user.username}')
        except Exception as e:
            print(f'[PasswordResetRequestView] Failed to create notification: {str(e)}')
        
        print(f'[PasswordResetRequestView] Token (for development): {token}')
        print('='*60 + '\n')
        
        # Return token for development (remove in production)
        return Response({
            'success': True,
            'message': get_message('password_reset_sent', lang),
            'language': lang,
            'data': {'token': token}  # Remove in production
        })


class PasswordResetConfirmView(APIView):
    """Confirm password reset with token"""
    permission_classes = [AllowAny]
    
    def post(self, request):
        print('\n' + '='*60)
        print('[PasswordResetConfirmView] Request received')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[PasswordResetConfirmView] Using language: {lang}')
        
        serializer = PasswordResetConfirmSerializer(
            data=request.data,
            context={'request': request, 'language': lang}
        )
        
        if not serializer.is_valid():
            print(f'[PasswordResetConfirmView] Validation failed: {serializer.errors}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'errors': serializer.errors,
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        user = serializer.context['user']
        user.set_password(serializer.validated_data['new_password'])
        user.save()
        
        print(f'[PasswordResetConfirmView] Password reset successful for user: {user.username}')
        
        # Create in-app notification about successful password reset
        try:
            NotificationService.create_user_notification(
                user=user,
                notification_type='password_reset',
                created_by=user,
                extra_data={'reset_method': 'token'},
                title='Password Reset Successful',
                message='Your password has been reset successfully. You can now login with your new password.',
                priority='high',
                action_url='/login'
            )
            print(f'[PasswordResetConfirmView] Password reset confirmation notification created for {user.username}')
        except Exception as e:
            print(f'[PasswordResetConfirmView] Failed to create notification: {str(e)}')
        
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'message': get_message('password_reset_success', lang),
            'language': lang
        })


class ChangePasswordView(APIView):
    """Change password for authenticated user"""
    permission_classes = [IsAuthenticated]
    
    def post(self, request):
        print('\n' + '='*60)
        print('[ChangePasswordView] Request received')
        print('='*60)
        
        lang = get_request_language(request)
        print(f'[ChangePasswordView] Using language: {lang}')
        print(f'[ChangePasswordView] User: {request.user.username}')
        
        current_password = request.data.get('current_password')
        new_password = request.data.get('new_password')
        confirm_password = request.data.get('confirm_password')
        
        # Validate current password
        if not request.user.check_password(current_password):
            print(f'[ChangePasswordView] Invalid current password for user: {request.user.username}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'message': 'Current password is incorrect',
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check if passwords match
        if new_password != confirm_password:
            print(f'[ChangePasswordView] Password mismatch for user: {request.user.username}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'message': 'Passwords do not match',
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Check password length
        if len(new_password) < 6:
            print(f'[ChangePasswordView] Password too short for user: {request.user.username}')
            print('='*60 + '\n')
            
            return Response({
                'success': False,
                'message': 'Password must be at least 6 characters',
                'language': lang
            }, status=status.HTTP_400_BAD_REQUEST)
        
        # Update password
        request.user.set_password(new_password)
        request.user.save()
        
        print(f'[ChangePasswordView] Password changed successfully for user: {request.user.username}')
        
        # Create in-app notification about password change
        try:
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='password_changed',
                created_by=request.user,
                extra_data={'change_method': 'authenticated'},
                title='Password Changed',
                message='Your password has been changed successfully. If you did not change it, please contact support immediately.',
                priority='high',
                action_url='/login'
            )
            print(f'[ChangePasswordView] Password change notification created for {request.user.username}')
        except Exception as e:
            print(f'[ChangePasswordView] Failed to create notification: {str(e)}')
        
        print('='*60 + '\n')
        
        return Response({
            'success': True,
            'message': get_message('password_changed', lang),
            'language': lang
        })
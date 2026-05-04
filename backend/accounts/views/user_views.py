from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from accounts.models import User
from accounts.serializers.user_serializers import (
    UserListSerializer, UserDetailSerializer, UserCreateSerializer,
    UserUpdateSerializer, ProfileUpdateSerializer
)
from accounts.permissions import IsAdmin, IsAdminOrSelf
from accounts.views.base_view import BaseAPIView, api_endpoint
from accounts.translations.translator import translator
from notifications.services import NotificationService


class UserCreateView(BaseAPIView):
    """Create a new user (admin only)."""
    
    permission_classes = [IsAuthenticated, IsAdmin]
    
    @api_endpoint
    def post(self, request):
        """
        Create a new user account.
        
        Request body:
            - username: Unique username (required)
            - password: User password (required)
            - confirm_password: Confirm password (required)
            - role: admin/teacher/student/parent (required)
            - status: active/inactive/suspended (optional, defaults to active)
            - language: en/fr/rw (optional, defaults to en)
        """
        # Validate and create user
        serializer = UserCreateSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        user = serializer.save()
        
        # Create notification for the new user
        NotificationService.create_user_notification(
            user=user,
            notification_type='user_created',
            created_by=request.user,
            extra_data={
                'role': user.role,
                'username': user.username
            },
            request=request
        )
        
        # Return success response
        response_data = UserDetailSerializer(user, context={'request': request}).data
        
        return self.success_response(
            'user_created',
            data=response_data,
            status_code=status.HTTP_201_CREATED,
            username=user.username
        )


class UserRetrieveUpdateDeleteView(BaseAPIView):
    """Get, update, or delete a specific user by ID."""
    
    permission_classes = [IsAuthenticated, IsAdminOrSelf]
    
    def get_user(self, user_id):
        """Get user or raise 404."""
        return get_object_or_404(User, id=user_id)
    
    @api_endpoint
    def get(self, request, user_id):
        """Get user by ID with detailed information."""
        # Validate user_id
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return self.error_response('user_management.invalid_user_id', 
                                      status_code=status.HTTP_400_BAD_REQUEST)
        
        # Get user
        user = self.get_user(user_id)
        
        # Check object-level permission
        self.check_object_permissions(request, user)
        
        # Serialize and return
        serializer = UserDetailSerializer(user, context={'request': request})
        
        return self.success_response(
            'user_retrieved',
            data=serializer.data,
            status_code=status.HTTP_200_OK
        )
    
    @api_endpoint
    def put(self, request, user_id):
        """Update user by ID (admin only)."""
        # Validate user_id
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return self.error_response('user_management.invalid_user_id', 
                                      status_code=status.HTTP_400_BAD_REQUEST)
        
        # Get user
        user = self.get_user(user_id)
        
        # Check permission - only admin can update users
        if request.user.role != 'admin':
            return self.error_response('authentication.permission_denied', 
                                      status_code=status.HTTP_403_FORBIDDEN)
        
        # Validate and update user
        serializer = UserUpdateSerializer(
            user,
            data=request.data,
            partial=True,
            context={'request': request, 'user_id': user_id}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # Create notification for the updated user
        NotificationService.create_user_notification(
            user=user,
            notification_type='user_updated',
            created_by=request.user,
            extra_data={'updated_fields': list(request.data.keys())},
            request=request
        )
        
        # Return success response
        response_data = UserDetailSerializer(user, context={'request': request}).data
        
        return self.success_response(
            'user_updated',
            data=response_data,
            status_code=status.HTTP_200_OK,
            username=user.username
        )
    
    @api_endpoint
    def delete(self, request, user_id):
        """Delete user by ID (admin only)."""
        # Validate user_id
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return self.error_response('user_management.invalid_user_id', 
                                      status_code=status.HTTP_400_BAD_REQUEST)
        
        # Get user
        user = self.get_user(user_id)
        
        # Check permission - only admin can delete
        if request.user.role != 'admin':
            return self.error_response('authentication.permission_denied', 
                                      status_code=status.HTTP_403_FORBIDDEN)
        
        # Prevent self-deletion
        if user.id == request.user.id:
            return self.error_response('user_management.cannot_delete_self', 
                                      status_code=status.HTTP_400_BAD_REQUEST)
        
        username = user.username
        
        # Create notification before deletion
        NotificationService.create_user_notification(
            user=user,
            notification_type='user_deleted',
            created_by=request.user,
            extra_data={'username': username},
            request=request
        )
        
        # Delete user
        user.delete()
        
        return self.success_response(
            'user_deleted',
            status_code=status.HTTP_200_OK,
            username=username
        )


class AllUsersListView(BaseAPIView):
    """Get all users with optional filtering (admin only)."""
    
    permission_classes = [IsAuthenticated, IsAdmin]
    
    @api_endpoint
    def get(self, request):
        """
        Get all users with optional filters.
        
        Query parameters:
            - role: Filter by role (admin/teacher/student/parent)
            - status: Filter by status (active/inactive/suspended)
            - search: Search by username
        """
        # Start with all users
        queryset = User.objects.all()
        
        # Apply filters
        role = request.query_params.get('role')
        if role and role in ['admin', 'teacher', 'student', 'parent']:
            queryset = queryset.filter(role=role)
        elif role:
            return self.error_response('user_management.invalid_role_value',
                                      status_code=status.HTTP_400_BAD_REQUEST)
        
        status_filter = request.query_params.get('status')
        if status_filter and status_filter in ['active', 'inactive', 'suspended']:
            queryset = queryset.filter(status=status_filter)
        elif status_filter:
            return self.error_response('user_management.invalid_status',
                                      status_code=status.HTTP_400_BAD_REQUEST)
        
        # Search by username
        search = request.query_params.get('search')
        if search:
            queryset = queryset.filter(username__icontains=search)
        
        # Order by creation date (newest first)
        queryset = queryset.order_by('-created_at')
        
        # Serialize
        serializer = UserListSerializer(queryset, many=True, context={'request': request})
        
        return self.success_response(
            'users_retrieved',
            data={
                'count': queryset.count(),
                'results': serializer.data
            },
            status_code=status.HTTP_200_OK
        )


class CurrentUserView(BaseAPIView):
    """Get the currently logged-in user's profile."""
    
    permission_classes = [IsAuthenticated]
    
    @api_endpoint
    def get(self, request):
        """Get current user profile with language information."""
        # Ensure user's language is in session
        if hasattr(request.user, 'language') and request.user.language:
            translator.set_session_language(request, request.user.language)
        
        serializer = UserDetailSerializer(request.user, context={'request': request})
        
        # Get current language
        current_lang = translator.get_user_language(request)
        
        return self.success_response(
            'user_retrieved',
            data={
                'user': serializer.data,
                'current_language': current_lang,
                'available_languages': translator.get_supported_languages()
            },
            status_code=status.HTTP_200_OK
        )


class ProfileUpdateView(BaseAPIView):
    """Update the currently logged-in user's profile."""
    
    permission_classes = [IsAuthenticated]
    
    @api_endpoint
    def put(self, request):
        """Update current user profile."""
        # Validate and update profile
        serializer = ProfileUpdateSerializer(
            request.user,
            data=request.data,
            partial=True,
            context={'request': request, 'user': request.user}
        )
        serializer.is_valid(raise_exception=True)
        serializer.save()
        
        # If language was updated, update session as well
        if 'language' in request.data:
            translator.set_session_language(request, request.data['language'])
        
        # Check if password was changed
        if 'new_password' in request.data:
            # Create notification for password change
            NotificationService.create_user_notification(
                user=request.user,
                notification_type='password_changed',
                created_by=request.user,
                request=request
            )
            
            return self.success_response(
                'password_changed',
                status_code=status.HTTP_200_OK
            )
        
        # Return success response
        response_data = UserDetailSerializer(request.user, context={'request': request}).data
        
        return self.success_response(
            'profile_updated',
            data=response_data,
            status_code=status.HTTP_200_OK
        )


class UserActivationToggleView(BaseAPIView):
    """Activate or deactivate a user (admin only)."""
    
    permission_classes = [IsAuthenticated, IsAdmin]
    
    @api_endpoint
    def post(self, request, user_id):
        """Toggle user activation status."""
        # Validate user_id
        try:
            user_id = int(user_id)
        except (ValueError, TypeError):
            return self.error_response('user_management.invalid_user_id', 
                                      status_code=status.HTTP_400_BAD_REQUEST)
        
        # Get user
        user = get_object_or_404(User, id=user_id)
        
        # Prevent self-deactivation
        if user.id == request.user.id:
            return self.error_response('user_management.cannot_change_own_status', 
                                      status_code=status.HTTP_400_BAD_REQUEST)
        
        # Toggle status
        new_status = User.Status.INACTIVE if user.status == User.Status.ACTIVE else User.Status.ACTIVE
        old_status = user.status
        user.status = new_status
        user.save()
        
        # Create notification for status change
        NotificationService.create_user_notification(
            user=user,
            notification_type='user_status_changed',
            created_by=request.user,
            extra_data={
                'old_status': old_status,
                'new_status': new_status,
                'status_display': translator.get_status_display(new_status, request=request)
            },
            request=request
        )
        
        # Get appropriate message
        message_key = 'user_activated' if new_status == User.Status.ACTIVE else 'user_deactivated'
        
        return self.success_response(
            message_key,
            status_code=status.HTTP_200_OK,
            username=user.username
        )
        
        
        
        
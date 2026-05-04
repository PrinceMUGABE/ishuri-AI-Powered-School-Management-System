from rest_framework import status
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework.response import Response
from rest_framework_simplejwt.tokens import RefreshToken
from rest_framework_simplejwt.exceptions import InvalidToken, TokenError
from rest_framework_simplejwt.views import TokenRefreshView as JWTTokenRefreshView

from accounts.serializers.auth_serializers import LoginSerializer, RefreshTokenSerializer
from accounts.views.base_view import BaseAPIView, api_endpoint
from accounts.translations.translator import translator


class LoginView(BaseAPIView):
    """User login endpoint with role validation."""
    
    permission_classes = [AllowAny]
    
    @api_endpoint
    def post(self, request):
        """
        Authenticate user and return JWT tokens.
        
        Request body:
            - username: User's username
            - password: User's password
            - role: User's role (admin, teacher, student, parent)
        
        Returns:
            - access_token: JWT access token
            - refresh_token: JWT refresh token
            - user: User information
        """
        # Get language for response
        lang_code = translator.get_user_language(request)
        
        # Validate input
        serializer = LoginSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        # Get authenticated user
        user = serializer.validated_data['user']
        
        # Generate JWT tokens
        refresh = RefreshToken.for_user(user)
        
        # Set user's language preference from their profile into session
        if hasattr(user, 'language') and user.language:
            translator.set_session_language(request, user.language)
        
        # Prepare response data
        response_data = {
            'access_token': str(refresh.access_token),
            'refresh_token': str(refresh),
            'token_type': 'Bearer',
            'expires_in': 24 * 60 * 60,  # 24 hours in seconds
            'user': {
                'id': user.id,
                'username': user.username,
                'role': user.role,
                'role_display': translator.get_role_display(user.role, request=request),
                'status': user.status,
                'status_display': translator.get_status_display(user.status, request=request),
                'language': user.language if hasattr(user, 'language') else None
            }
        }
        
        # Get success message in user's language
        success_msg = translator.get_success_message('login_success', request=request)
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'message': success_msg['message'],
            'message_key': 'login_success',
            'language': lang_code,
            'data': response_data
        }, status=status.HTTP_200_OK)


class LogoutView(BaseAPIView):
    """User logout endpoint (blacklist refresh token)."""
    
    permission_classes = [IsAuthenticated]
    
    @api_endpoint
    def post(self, request):
        """
        Logout user by blacklisting refresh token.
        
        Request body:
            - refresh: Refresh token to blacklist (required)
            - clear_language: Whether to clear language preference (default: true)
        
        Returns:
            - Success message
        """
        refresh_token = request.data.get('refresh')
        clear_language = request.data.get('clear_language', True)
        
        # Validate refresh token presence
        if not refresh_token:
            return self.error_response(
                'validation.required_field',
                status_code=status.HTTP_400_BAD_REQUEST,
                field='refresh'
            )
        
        # Blacklist the refresh token
        try:
            token = RefreshToken(refresh_token)
            token.blacklist()
        except (InvalidToken, TokenError) as e:
            # Token might already be blacklisted or invalid
            # We still consider logout successful
            pass
        except Exception as e:
            # Log error but don't fail the logout
            pass
        
        # Clear language preference from session if requested
        if clear_language:
            translator.clear_session_language(request)
        
        # Get success message
        lang_code = translator.get_user_language(request)
        success_msg = translator.get_success_message('logout_success', request=request)
        
        return Response({
            'success': True,
            'status_code': status.HTTP_200_OK,
            'message': success_msg['message'],
            'message_key': 'logout_success',
            'language': lang_code
        }, status=status.HTTP_200_OK)


class RefreshTokenView(BaseAPIView):
    """
    Refresh JWT access token using refresh token.
    
    This endpoint allows users to obtain a new access token when their current
    access token expires, without requiring them to log in again.
    """
    
    permission_classes = [AllowAny]
    
    @api_endpoint
    def post(self, request):
        """
        Refresh access token.
        
        Request body:
            - refresh: Refresh token string (required)
        
        Returns:
            - access_token: New JWT access token
            - token_type: Token type (Bearer)
            - expires_in: Token expiration time in seconds
        
        Example:
            POST /api/accounts/refresh/
            {
                "refresh": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9..."
            }
        
        Response:
            {
                "success": true,
                "status_code": 200,
                "data": {
                    "access_token": "eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9...",
                    "token_type": "Bearer",
                    "expires_in": 86400
                }
            }
        """
        # Get language for response
        lang_code = translator.get_user_language(request)
        
        # Validate input
        serializer = RefreshTokenSerializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        
        refresh_token = serializer.validated_data['refresh']
        
        try:
            # Create a RefreshToken object from the token string
            refresh = RefreshToken(refresh_token)
            
            # Get the new access token
            access_token = str(refresh.access_token)
            
            # Return the new access token
            return Response({
                'success': True,
                'status_code': status.HTTP_200_OK,
                'language': lang_code,
                'data': {
                    'access_token': access_token,
                    'token_type': 'Bearer',
                    'expires_in': 24 * 60 * 60,  # 24 hours in seconds
                    'refresh_token_exists': True
                }
            }, status=status.HTTP_200_OK)
            
        except InvalidToken as e:
            # Invalid or malformed token
            return self.error_response(
                'authentication.token_invalid',
                status_code=status.HTTP_401_UNAUTHORIZED,
                details=str(e)
            )
        except TokenError as e:
            # Token is blacklisted or has other issues
            return self.error_response(
                'authentication.token_invalid',
                status_code=status.HTTP_401_UNAUTHORIZED,
                details=str(e)
            )
        except Exception as e:
            # Any other unexpected error
            return self.error_response(
                'system.internal_error',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                details=str(e) if str(e) else None
            )


class TokenVerifyView(BaseAPIView):
    """
    Verify if a token is valid.
    
    This endpoint allows checking if an access token is still valid.
    """
    
    permission_classes = [AllowAny]
    
    @api_endpoint
    def post(self, request):
        """
        Verify token validity.
        
        Request body:
            - token: Access token to verify (required)
        
        Returns:
            - valid: Boolean indicating if token is valid
            - message: Verification message
        """
        from rest_framework_simplejwt.tokens import AccessToken
        
        token = request.data.get('token')
        
        if not token:
            return self.error_response(
                'validation.required_field',
                status_code=status.HTTP_400_BAD_REQUEST,
                field='token'
            )
        
        try:
            # Try to decode the token
            access_token = AccessToken(token)
            
            # Token is valid
            return Response({
                'success': True,
                'status_code': status.HTTP_200_OK,
                'data': {
                    'valid': True,
                    'message': 'Token is valid',
                    'user_id': access_token.get('user_id'),
                    'username': access_token.get('username'),
                    'role': access_token.get('role'),
                    'expires_at': access_token.get('exp')
                }
            }, status=status.HTTP_200_OK)
            
        except InvalidToken as e:
            # Token is invalid
            return Response({
                'success': True,
                'status_code': status.HTTP_200_OK,
                'data': {
                    'valid': False,
                    'message': str(e)
                }
            }, status=status.HTTP_200_OK)
        except Exception as e:
            # Any other error
            return Response({
                'success': True,
                'status_code': status.HTTP_200_OK,
                'data': {
                    'valid': False,
                    'message': 'Token verification failed'
                }
            }, status=status.HTTP_200_OK)


class BlacklistTokenView(BaseAPIView):
    """
    Blacklist a refresh token (force logout on specific device).
    
    This endpoint allows users to blacklist a specific refresh token,
    effectively logging out that specific session/device.
    """
    
    permission_classes = [IsAuthenticated]
    
    @api_endpoint
    def post(self, request):
        """
        Blacklist a refresh token.
        
        Request body:
            - refresh: Refresh token to blacklist (required)
        
        Returns:
            - Success message
        """
        refresh_token = request.data.get('refresh')
        
        if not refresh_token:
            return self.error_response(
                'validation.required_field',
                status_code=status.HTTP_400_BAD_REQUEST,
                field='refresh'
            )
        
        try:
            # Try to blacklist the token
            token = RefreshToken(refresh_token)
            token.blacklist()
            
            return self.success_response(
                'logout_success',
                status_code=status.HTTP_200_OK
            )
            
        except (InvalidToken, TokenError) as e:
            # Token might already be blacklisted or invalid
            return self.success_response(
                'logout_success',
                status_code=status.HTTP_200_OK
            )
        except Exception as e:
            return self.error_response(
                'system.internal_error',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class BlacklistAllTokensView(BaseAPIView):
    """
    Blacklist all refresh tokens for the current user.
    
    This endpoint allows users to blacklist ALL refresh tokens associated
    with their account, effectively logging out all devices/sessions.
    """
    
    permission_classes = [IsAuthenticated]
    
    @api_endpoint
    def post(self, request):
        """
        Blacklist all refresh tokens for current user.
        
        Returns:
            - Success message with count of blacklisted tokens
        """
        from rest_framework_simplejwt.token_blacklist.models import BlacklistedToken, OutstandingToken
        
        try:
            # Get all outstanding tokens for the user
            tokens = OutstandingToken.objects.filter(user=request.user)
            count = tokens.count()
            
            # Blacklist each token
            for token in tokens:
                BlacklistedToken.objects.get_or_create(token=token)
            
            # Clear user's session language
            translator.clear_session_language(request)
            
            return Response({
                'success': True,
                'status_code': status.HTTP_200_OK,
                'message': f'Successfully logged out from all {count} devices',
                'data': {
                    'blacklisted_count': count
                }
            }, status=status.HTTP_200_OK)
            
        except Exception as e:
            return self.error_response(
                'system.internal_error',
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                details=str(e) if str(e) else None
            )
from rest_framework import serializers
from django.contrib.auth import authenticate
from django.core.exceptions import ValidationError
from accounts.models import User
from accounts.serializers.validators import UsernameValidator, PasswordValidator, RoleValidator
from accounts.translations.translator import translator


class LoginSerializer(serializers.Serializer):
    """Serializer for user login with comprehensive validation."""
    
    username = serializers.CharField(
        required=True,
        write_only=True,
        help_text="User's username"
    )
    password = serializers.CharField(
        required=True,
        write_only=True,
        style={'input_type': 'password'},
        help_text="User's password"
    )
    role = serializers.ChoiceField(
        choices=User.Roles.choices,
        required=True,
        help_text="User's role (admin, teacher, student, parent)"
    )
    
    def validate_username(self, value):
        """Validate username format."""
        if not value or value.strip() == '':
            raise serializers.ValidationError(
                translator.get_validation_error('username', 'required_field', field='username')
            )
        return value.strip()
    
    def validate(self, attrs):
        """
        Validate login credentials with role matching.
        Handles all possible error cases with user-friendly messages.
        """
        username = attrs.get('username')
        password = attrs.get('password')
        role = attrs.get('role')
        request = self.context.get('request')
        lang_code = request.lang_code if request else 'en'
        
        # Check if username exists
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError(
                translator.get_error_message('authentication.invalid_credentials', lang_code)
            )
        
        # Check if user is active
        if not user.can_login():
            if user.status == User.Status.INACTIVE:
                error_key = 'authentication.account_inactive'
            else:
                error_key = 'authentication.account_suspended'
            
            raise serializers.ValidationError(
                translator.get_error_message(error_key, lang_code)
            )
        
        # Authenticate with password
        authenticated_user = authenticate(username=username, password=password)
        
        if not authenticated_user:
            raise serializers.ValidationError(
                translator.get_error_message('authentication.invalid_credentials', lang_code)
            )
        
        # Validate role
        if user.role != role:
            role_display = translator.get_role_display(user.role, lang_code)
            raise serializers.ValidationError(
                translator.get_error_message('authentication.invalid_role', lang_code, role=role_display)
            )
        
        attrs['user'] = authenticated_user
        return attrs


class RefreshTokenSerializer(serializers.Serializer):
    """Serializer for refreshing JWT token."""
    
    refresh = serializers.CharField(required=True, help_text="Refresh token")
    
    def validate_refresh(self, value):
        if not value or value.strip() == '':
            raise serializers.ValidationError("Refresh token is required")
        return value
    
    
    
    
    
    
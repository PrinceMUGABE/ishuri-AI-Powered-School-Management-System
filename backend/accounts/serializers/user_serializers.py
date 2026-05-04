from rest_framework import serializers
from django.core.exceptions import ValidationError
from accounts.models import User
from accounts.serializers.validators import (
    UsernameValidator, PasswordValidator, RoleValidator, StatusValidator
)
from accounts.translations.translator import translator


class UserListSerializer(serializers.ModelSerializer):
    """Lightweight serializer for listing users."""
    
    role_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    language_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'role', 'role_display', 'language', 'language_display',
            'status', 'status_display', 'created_at', 'last_logged_in'
        ]
        read_only_fields = ['created_at', 'last_logged_in', 'id']
    
    def get_role_display(self, obj):
        request = self.context.get('request')
        return translator.get_role_display(obj.role, request=request)
    
    def get_status_display(self, obj):
        request = self.context.get('request')
        return translator.get_status_display(obj.status, request=request)
    
    def get_language_display(self, obj):
        request = self.context.get('request')
        return translator.get_translation(f"language.{obj.language}", request=request) if obj.language else None


class UserDetailSerializer(serializers.ModelSerializer):
    """Detailed serializer for single user."""
    
    role_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    language_display = serializers.SerializerMethodField()
    created_by_username = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = [
            'id', 'username', 'role', 'role_display', 'language', 'language_display',
            'status', 'status_display', 'created_at', 'updated_at', 'last_logged_in',
            'created_by', 'created_by_username', 'is_staff', 'is_superuser'
        ]
        read_only_fields = ['created_at', 'updated_at', 'last_logged_in', 'created_by', 'id']
    
    def get_role_display(self, obj):
        request = self.context.get('request')
        return translator.get_role_display(obj.role, request=request)
    
    def get_status_display(self, obj):
        request = self.context.get('request')
        return translator.get_status_display(obj.status, request=request)
    
    def get_language_display(self, obj):
        request = self.context.get('request')
        return translator.get_translation(f"language.{obj.language}", request=request) if obj.language else None
    
    def get_created_by_username(self, obj):
        return obj.created_by.username if obj.created_by else None


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer for creating new users (admin only)."""
    
    password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    confirm_password = serializers.CharField(write_only=True, required=True, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ['id', 'username', 'password', 'confirm_password', 'role', 'status', 'language']
    
    def validate_username(self, value):
        """Validate username format and uniqueness."""
        try:
            UsernameValidator.validate(value)
        except ValidationError as e:
            request = self.context.get('request')
            lang_code = translator.get_user_language(request) if request else 'en'
            error_key = e.message if isinstance(e.message, str) else e.message[0]
            raise serializers.ValidationError(
                translator.get_validation_error('username', error_key, lang_code, 
                                               min_length=UsernameValidator.MIN_LENGTH,
                                               max_length=UsernameValidator.MAX_LENGTH,
                                               username=value)
            )
        return value
    
    def validate_role(self, value):
        """Validate role."""
        try:
            RoleValidator.validate(value)
        except ValidationError as e:
            request = self.context.get('request')
            lang_code = translator.get_user_language(request) if request else 'en'
            error_key = e.message if isinstance(e.message, str) else e.message[0]
            raise serializers.ValidationError(
                translator.get_validation_error('role', error_key, lang_code)
            )
        return value
    
    def validate_status(self, value):
        """Validate status."""
        if value:
            try:
                StatusValidator.validate(value)
            except ValidationError as e:
                request = self.context.get('request')
                lang_code = translator.get_user_language(request) if request else 'en'
                error_key = e.message if isinstance(e.message, str) else e.message[0]
                raise serializers.ValidationError(
                    translator.get_validation_error('status', error_key, lang_code)
                )
        return value
    
    def validate(self, data):
        """Validate password match and strength."""
        password = data.get('password')
        confirm_password = data.get('confirm_password')
        username = data.get('username')
        request = self.context.get('request')
        lang_code = translator.get_user_language(request) if request else 'en'
        
        # Check if passwords match
        if password != confirm_password:
            raise serializers.ValidationError({
                'confirm_password': translator.get_error_message('password.password_mismatch', lang_code)
            })
        
        # Validate password strength
        try:
            PasswordValidator.validate_password_strength(password, username=username)
        except ValidationError as e:
            error_key = e.message if isinstance(e.message, str) else e.message[0]
            raise serializers.ValidationError({
                'password': translator.get_error_message(f'password.{error_key}', lang_code,
                                                         min_length=PasswordValidator.MIN_LENGTH)
            })
        
        return data
    
    def create(self, validated_data):
        """Create user with hashed password."""
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        
        request = self.context.get('request')
        if request and hasattr(request, 'user'):
            validated_data['created_by'] = request.user
        
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer for updating users (admin only)."""
    
    class Meta:
        model = User
        fields = ['username', 'role', 'status', 'language']
    
    def validate_username(self, value):
        """Validate username uniqueness excluding current user."""
        user_id = self.context.get('user_id')
        try:
            UsernameValidator.validate(value, exclude_user_id=user_id)
        except ValidationError as e:
            request = self.context.get('request')
            lang_code = translator.get_user_language(request) if request else 'en'
            error_key = e.message if isinstance(e.message, str) else e.message[0]
            raise serializers.ValidationError(
                translator.get_validation_error('username', error_key, lang_code,
                                               min_length=UsernameValidator.MIN_LENGTH,
                                               max_length=UsernameValidator.MAX_LENGTH,
                                               username=value)
            )
        return value
    
    def validate_role(self, value):
        """Validate role."""
        if value:
            try:
                RoleValidator.validate(value)
            except ValidationError as e:
                request = self.context.get('request')
                lang_code = translator.get_user_language(request) if request else 'en'
                error_key = e.message if isinstance(e.message, str) else e.message[0]
                raise serializers.ValidationError(
                    translator.get_validation_error('role', error_key, lang_code)
                )
        return value
    
    def validate_status(self, value):
        """Validate status."""
        if value:
            try:
                StatusValidator.validate(value)
            except ValidationError as e:
                request = self.context.get('request')
                lang_code = translator.get_user_language(request) if request else 'en'
                error_key = e.message if isinstance(e.message, str) else e.message[0]
                raise serializers.ValidationError(
                    translator.get_validation_error('status', error_key, lang_code)
                )
        return value


class ProfileUpdateSerializer(serializers.ModelSerializer):
    """Serializer for logged-in user to update their own profile."""
    
    current_password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    new_password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    confirm_new_password = serializers.CharField(write_only=True, required=False, style={'input_type': 'password'})
    
    class Meta:
        model = User
        fields = ['username', 'language', 'current_password', 'new_password', 'confirm_new_password']
    
    def validate_username(self, value):
        """Validate username uniqueness excluding current user."""
        user = self.context.get('user')
        if user:
            try:
                UsernameValidator.validate(value, exclude_user_id=user.id)
            except ValidationError as e:
                request = self.context.get('request')
                lang_code = translator.get_user_language(request) if request else 'en'
                error_key = e.message if isinstance(e.message, str) else e.message[0]
                raise serializers.ValidationError(
                    translator.get_validation_error('username', error_key, lang_code,
                                                   min_length=UsernameValidator.MIN_LENGTH,
                                                   max_length=UsernameValidator.MAX_LENGTH,
                                                   username=value)
                )
        return value
    
    def validate_language(self, value):
        """Validate language code."""
        if value and value not in ['en', 'fr', 'rw']:
            request = self.context.get('request')
            lang_code = translator.get_user_language(request) if request else 'en'
            raise serializers.ValidationError(
                translator.get_translation("errors.validation.invalid_choice", lang_code,
                                          field="language", choices="en, fr, rw")
            )
        return value
    
    def validate(self, data):
        """Validate password change."""
        user = self.context.get('user')
        new_password = data.get('new_password')
        confirm_password = data.get('confirm_new_password')
        current_password = data.get('current_password')
        request = self.context.get('request')
        lang_code = translator.get_user_language(request) if request else 'en'
        
        # If password change is requested
        if new_password or confirm_password or current_password:
            # Check if all password fields are provided
            if not current_password:
                raise serializers.ValidationError({
                    'current_password': translator.get_error_message('password.current_password_required', lang_code)
                })
            
            if not new_password:
                raise serializers.ValidationError({
                    'new_password': translator.get_error_message('password.new_password_required', lang_code)
                })
            
            # Verify current password
            if not user.check_password(current_password):
                raise serializers.ValidationError({
                    'current_password': translator.get_error_message('password.current_password_incorrect', lang_code)
                })
            
            # Check password match
            if new_password != confirm_password:
                raise serializers.ValidationError({
                    'confirm_new_password': translator.get_error_message('password.password_mismatch', lang_code)
                })
            
            # Validate new password strength
            try:
                PasswordValidator.validate_password_strength(new_password, username=user.username)
            except ValidationError as e:
                error_key = e.message if isinstance(e.message, str) else e.message[0]
                raise serializers.ValidationError({
                    'new_password': translator.get_error_message(f'password.{error_key}', lang_code,
                                                                 min_length=PasswordValidator.MIN_LENGTH)
                })
        
        return data
    
    def update(self, instance, validated_data):
        """Update user profile."""
        new_password = validated_data.pop('new_password', None)
        validated_data.pop('current_password', None)
        validated_data.pop('confirm_new_password', None)
        
        # Update username if provided
        if 'username' in validated_data:
            instance.username = validated_data['username']
        
        # Update language if provided
        if 'language' in validated_data:
            instance.language = validated_data['language']
        
        # Update password if provided
        if new_password:
            instance.set_password(new_password)
        
        instance.save()
        return instance
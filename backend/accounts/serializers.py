from rest_framework import serializers
from django.contrib.auth import authenticate
from django.core.validators import RegexValidator
from accounts.models import User
from accounts.utils import generate_reset_token, validate_reset_token
from accounts.translations import get_message


# Username Validator
username_validator = RegexValidator(
    regex=r'^[\w.@+-]+$',
    message='Username can only contain letters, numbers, and @/./+/-/_ characters'
)


# ==================== AUTH SERIALIZERS ====================

class LoginSerializer(serializers.Serializer):
    username = serializers.CharField(write_only=True)
    password = serializers.CharField(write_only=True, style={'input_type': 'password'})
    role = serializers.ChoiceField(choices=User.Roles.choices, write_only=True, required=False)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        request = self.context.get('request')
        lang = getattr(request, 'user_language', 'en')
        
        # Check user exists
        try:
            user = User.objects.get(username=username)
        except User.DoesNotExist:
            raise serializers.ValidationError(get_message('invalid_credentials', lang))
        
        # Check account status
        if not user.can_login():
            if user.status == User.Status.INACTIVE:
                msg = get_message('account_inactive', lang)
            else:
                msg = get_message('account_suspended', lang)
            raise serializers.ValidationError(msg)
        
        # Authenticate
        authenticated_user = authenticate(username=username, password=password)
        if not authenticated_user:
            raise serializers.ValidationError(get_message('invalid_credentials', lang))
        
        attrs['user'] = authenticated_user
        return attrs


class RefreshTokenSerializer(serializers.Serializer):
    refresh = serializers.CharField()


# ==================== USER SERIALIZERS ====================

class UserListSerializer(serializers.ModelSerializer):
    role_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'role', 'role_display', 'status', 'status_display', 'created_at']
    
    def get_role_display(self, obj):
        return dict(User.Roles.choices).get(obj.role, obj.role)
    
    def get_status_display(self, obj):
        return dict(User.Status.choices).get(obj.status, obj.status)


class UserDetailSerializer(serializers.ModelSerializer):
    role_display = serializers.SerializerMethodField()
    status_display = serializers.SerializerMethodField()
    
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'role', 'role_display', 'status', 
                  'status_display', 'language', 'created_at', 'updated_at']
    
    def get_role_display(self, obj):
        return dict(User.Roles.choices).get(obj.role, obj.role)
    
    def get_status_display(self, obj):
        return dict(User.Status.choices).get(obj.status, obj.status)


class UserCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    confirm_password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ['username', 'password', 'confirm_password', 'role', 'status', 'language', 'email']
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exists():
            raise serializers.ValidationError('Username already exists')
        username_validator(value)
        return value
    
    def validate(self, data):
        if data['password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        
        if len(data['password']) < 6:
            raise serializers.ValidationError({'password': 'Password must be at least 6 characters'})
        
        return data
    
    def create(self, validated_data):
        validated_data.pop('confirm_password')
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['username', 'email', 'role', 'status', 'language']
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('Username already exists')
        return value


class ProfileUpdateSerializer(serializers.ModelSerializer):
    current_password = serializers.CharField(write_only=True, required=False)
    new_password = serializers.CharField(write_only=True, required=False)
    confirm_password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = User
        fields = ['username', 'email', 'language', 'current_password', 'new_password', 'confirm_password']
    
    def validate_username(self, value):
        if User.objects.filter(username=value).exclude(id=self.instance.id).exists():
            raise serializers.ValidationError('Username already exists')
        return value
    
    def validate(self, data):
        user = self.instance
        new_password = data.get('new_password')
        
        if new_password:
            current = data.get('current_password')
            confirm = data.get('confirm_password')
            
            if not current:
                raise serializers.ValidationError({'current_password': 'Current password is required'})
            
            if not user.check_password(current):
                raise serializers.ValidationError({'current_password': 'Current password is incorrect'})
            
            if new_password != confirm:
                raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
            
            if len(new_password) < 6:
                raise serializers.ValidationError({'new_password': 'Password must be at least 6 characters'})
        
        return data
    
    def update(self, instance, validated_data):
        if 'new_password' in validated_data:
            instance.set_password(validated_data['new_password'])
            validated_data.pop('new_password')
            validated_data.pop('confirm_password', None)
            validated_data.pop('current_password', None)
        
        return super().update(instance, validated_data)


# ==================== PASSWORD RESET SERIALIZERS ====================

class PasswordResetRequestSerializer(serializers.Serializer):
    username = serializers.CharField()
    
    def validate_username(self, value):
        try:
            user = User.objects.get(username=value)
            self.context['user'] = user
        except User.DoesNotExist:
            raise serializers.ValidationError('No user found with this username')
        return value


class PasswordResetConfirmSerializer(serializers.Serializer):
    token = serializers.CharField()
    new_password = serializers.CharField()
    confirm_password = serializers.CharField()
    
    def validate(self, data):
        if data['new_password'] != data['confirm_password']:
            raise serializers.ValidationError({'confirm_password': 'Passwords do not match'})
        
        if len(data['new_password']) < 6:
            raise serializers.ValidationError({'new_password': 'Password must be at least 6 characters'})
        
        user_id = validate_reset_token(data['token'])
        if not user_id:
            raise serializers.ValidationError({'token': 'Invalid or expired token'})
        
        try:
            user = User.objects.get(id=user_id)
            self.context['user'] = user
        except User.DoesNotExist:
            raise serializers.ValidationError({'token': 'User not found'})
        
        return data
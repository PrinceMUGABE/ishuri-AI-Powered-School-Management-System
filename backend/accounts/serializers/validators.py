import re
from django.core.exceptions import ValidationError
from django.core.validators import validate_email as django_validate_email
from accounts.models import User


class UsernameValidator:
    """Validate username format and uniqueness."""
    
    MIN_LENGTH = 3
    MAX_LENGTH = 150
    PATTERN = re.compile(r'^[a-zA-Z0-9_]+$')
    
    @classmethod
    def validate(cls, username: str, exclude_user_id: int = None) -> None:
        """Validate username."""
        if not username:
            raise ValidationError('username_required')
        
        if len(username) < cls.MIN_LENGTH:
            raise ValidationError('username_length', params={'min_length': cls.MIN_LENGTH, 'max_length': cls.MAX_LENGTH})
        
        if len(username) > cls.MAX_LENGTH:
            raise ValidationError('username_length', params={'min_length': cls.MIN_LENGTH, 'max_length': cls.MAX_LENGTH})
        
        if not cls.PATTERN.match(username):
            raise ValidationError('username_invalid')
        
        # Check uniqueness
        queryset = User.objects.filter(username=username)
        if exclude_user_id:
            queryset = queryset.exclude(id=exclude_user_id)
        
        if queryset.exists():
            raise ValidationError('username_exists', params={'username': username})


class PasswordValidator:
    """Validate password strength and consistency."""
    
    MIN_LENGTH = 8
    
    @classmethod
    def validate_password_strength(cls, password: str, username: str = None, email: str = None) -> None:
        """Validate password strength."""
        if not password:
            raise ValidationError('new_password_required')
        
        if len(password) < cls.MIN_LENGTH:
            raise ValidationError('password_too_short', params={'min_length': cls.MIN_LENGTH})
        
        if password.isdigit():
            raise ValidationError('password_numeric')
        
        if password.lower() in ['password', 'password123', 'admin123', '12345678']:
            raise ValidationError('password_too_common')
        
        if username and password.lower() == username.lower():
            raise ValidationError('password_similar_to_username')
        
        if email and password.lower() in email.lower():
            raise ValidationError('password_similar_to_email')
    
    @classmethod
    def validate_password_match(cls, password: str, confirm_password: str) -> None:
        """Validate password and confirm password match."""
        if password != confirm_password:
            raise ValidationError('password_mismatch')


class RoleValidator:
    """Validate user role."""
    
    VALID_ROLES = ['admin', 'teacher', 'student', 'parent']
    
    @classmethod
    def validate(cls, role: str) -> None:
        """Validate role value."""
        if not role:
            raise ValidationError('required_field', params={'field': 'role'})
        
        if role not in cls.VALID_ROLES:
            raise ValidationError('invalid_role_value')


class StatusValidator:
    """Validate user status."""
    
    VALID_STATUSES = ['active', 'inactive', 'suspended']
    
    @classmethod
    def validate(cls, status: str) -> None:
        """Validate status value."""
        if status and status not in cls.VALID_STATUSES:
            raise ValidationError('invalid_status')
        
        
        
        
        
        
import jwt
import secrets
from datetime import datetime, timedelta
from django.conf import settings


def generate_reset_token(user_id):
    """Generate password reset token (expires in 1 hour)"""
    payload = {
        'user_id': user_id,
        'exp': datetime.utcnow() + timedelta(hours=1),
        'type': 'password_reset'
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm='HS256')


def validate_reset_token(token):
    """Validate reset token and return user_id"""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=['HS256'])
        if payload.get('type') != 'password_reset':
            return None
        return payload.get('user_id')
    except jwt.InvalidTokenError:
        return None


def generate_temp_password(length=10):
    """Generate temporary password"""
    alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
    return ''.join(secrets.choice(alphabet) for _ in range(length))
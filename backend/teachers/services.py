import random
import string
import re
from django.core.mail import send_mail
from django.conf import settings
from django.contrib.auth.hashers import make_password
from accounts.models import User


def generate_username(full_name):
    """Generate a unique username from full name."""
    # Convert to lowercase and replace spaces with dots
    base = full_name.lower().replace(' ', '.')
    # Remove any special characters
    base = re.sub(r'[^a-z0-9.]', '', base)
    username = base
    counter = 1
    
    while User.objects.filter(username=username).exists():
        username = f"{base}{counter}"
        counter += 1
    
    return username


def generate_password(length=10):
    """Generate a random password."""
    characters = string.ascii_letters + string.digits + '!@#$%^&*'
    password = ''.join(random.choice(characters) for _ in range(length))
    return password


def send_teacher_welcome_email(teacher, password, lang='en'):
    """Send welcome email to teacher with login credentials."""
    from .translations import get_translation
    
    subject = get_translation('teacher_welcome_subject', lang)
    body = get_translation('teacher_welcome_body', lang, 
                          name=teacher.full_name,
                          username=teacher.user.username,
                          password=password)
    
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[teacher.email],
            fail_silently=False,
        )
        print(f"Welcome email sent successfully to {teacher.email}")
        return True
    except Exception as e:
        print(f"Failed to send email to {teacher.email}: {str(e)}")
        return False


def create_teacher_user_account(teacher, password):
    """Create user account for teacher."""
    username = generate_username(teacher.full_name)
    
    user = User.objects.create(
        username=username,
        email=teacher.email,
        role='teacher',
        status='active',
        password=make_password(password)
    )
    
    return user
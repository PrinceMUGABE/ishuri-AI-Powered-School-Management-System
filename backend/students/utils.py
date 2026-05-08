"""
Utility helpers for the students app.
"""
import logging
import secrets
import string

from django.core.mail import send_mail
from django.conf import settings

from accounts.models import User

logger = logging.getLogger(__name__)

ADMIN_EMAIL = settings.EMAIL_HOST_USER


def generate_password(length: int = 10) -> str:
    """Generate a secure random password."""
    alphabet = string.ascii_letters + string.digits + "!@#$%"
    return ''.join(secrets.choice(alphabet) for _ in range(length))


def create_user_for_student(full_name: str, email: str | None, created_by: User) -> tuple[User, str]:
    """
    Create a User account for a student.
    Returns (user, raw_password).
    """
    # Build username from full_name
    base_username = full_name.lower().replace(' ', '_')[:20]
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}_{counter}"
        counter += 1

    raw_password = generate_password()
    user = User.objects.create_user(
        username=username,
        password=raw_password,
        email=email or '',
        role=User.Roles.STUDENT,
        status='active',
        created_by=created_by
    )
    logger.info(f"[StudentUtils] Created user account: {username} for student {full_name}")
    print(f"[StudentUtils] Created user account: {username} for student {full_name}")
    return user, raw_password


def create_user_for_parent(full_name: str, email: str, created_by: User) -> tuple[User, str]:
    """
    Create a User account for a parent/guardian.
    Returns (user, raw_password).
    """
    base_username = full_name.lower().replace(' ', '_')[:20]
    username = base_username
    counter = 1
    while User.objects.filter(username=username).exists():
        username = f"{base_username}_{counter}"
        counter += 1

    raw_password = generate_password()
    user = User.objects.create_user(
        username=username,
        password=raw_password,
        email=email,
        role=User.Roles.PARENT,
        status='active',
        created_by=created_by
    )
    logger.info(f"[ParentUtils] Created user account: {username} for parent {full_name}")
    print(f"[ParentUtils] Created user account: {username} for parent {full_name}")
    return user, raw_password


def send_student_credentials(student, raw_password: str, recipient_email: str | None = None):
    """
    Send login credentials to the student's email or fall back to ADMIN_EMAIL.
    """
    destination = recipient_email or student.email or ADMIN_EMAIL
    subject = "Your Student Account Credentials"
    body = (
        f"Dear {student.full_name},\n\n"
        f"Your student account has been created.\n\n"
        f"Roll Number : {student.roll_number}\n"
        f"Username    : {student.user.username}\n"
        f"Password    : {raw_password}\n\n"
        f"Please change your password after first login.\n\n"
        f"Best regards,\nSchool Administration"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[destination],
            fail_silently=False
        )
        print(f"[StudentUtils] Credentials email sent to {destination}")
        logger.info(f"[StudentUtils] Credentials email sent to {destination}")
    except Exception as e:
        logger.error(f"[StudentUtils] Failed to send credentials email: {e}")
        print(f"[StudentUtils] Failed to send credentials email: {e}")


def send_parent_credentials(parent, raw_password: str):
    """
    Send login credentials to parent's email.
    """
    subject = "Your Parent/Guardian Account Credentials"
    body = (
        f"Dear {parent.full_name},\n\n"
        f"Your parent/guardian account has been created on the school portal.\n\n"
        f"Username : {parent.user.username}\n"
        f"Password : {raw_password}\n\n"
        f"Please change your password after first login.\n\n"
        f"Best regards,\nSchool Administration"
    )
    try:
        send_mail(
            subject=subject,
            message=body,
            from_email=settings.DEFAULT_FROM_EMAIL,
            recipient_list=[parent.email],
            fail_silently=False
        )
        print(f"[ParentUtils] Credentials email sent to {parent.email}")
        logger.info(f"[ParentUtils] Credentials email sent to {parent.email}")
    except Exception as e:
        logger.error(f"[ParentUtils] Failed to send credentials email: {e}")
        print(f"[ParentUtils] Failed to send credentials email: {e}")
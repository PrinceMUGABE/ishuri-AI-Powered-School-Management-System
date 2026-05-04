from django.contrib.auth.models import AbstractBaseUser, BaseUserManager, PermissionsMixin
from django.db import models
from django.utils import timezone
from django.utils.translation import gettext_lazy as _


class UserManager(BaseUserManager):
    """Custom user manager for the custom User model."""
    
    def create_user(self, username, password=None, **extra_fields):
        """Create and save a regular user."""
        if not username:
            raise ValueError(_('The Username must be set'))
        
        username = username.strip()
        user = self.model(username=username, **extra_fields)
        user.set_password(password)
        user.save(using=self._db)
        return user
    
    def create_superuser(self, username, password=None, **extra_fields):
        """Create and save a superuser."""
        extra_fields.setdefault('is_staff', True)
        extra_fields.setdefault('is_superuser', True)
        extra_fields.setdefault('status', 'active')
        extra_fields.setdefault('role', 'admin')
        
        if extra_fields.get('is_staff') is not True:
            raise ValueError(_('Superuser must have is_staff=True.'))
        if extra_fields.get('is_superuser') is not True:
            raise ValueError(_('Superuser must have is_superuser=True.'))
        
        return self.create_user(username, password, **extra_fields)
    
    def get_by_natural_key(self, username):
        return self.get(username=username)


class User(AbstractBaseUser, PermissionsMixin):
    """
    Custom User model for Ishuri system.
    All user accounts are created by admin (except auto-created parent accounts).
    """
    
    class Roles(models.TextChoices):
        ADMIN = 'admin', _('Administrator')
        TEACHER = 'teacher', _('Teacher')
        STUDENT = 'student', _('Student')
        PARENT = 'parent', _('Parent')
    
    class Status(models.TextChoices):
        ACTIVE = 'active', _('Active')
        INACTIVE = 'inactive', _('Inactive')
        SUSPENDED = 'suspended', _('Suspended')
    
    # Basic fields
    username = models.CharField(
        _('username'),
        max_length=150,
        unique=True,
        help_text=_('Required. 150 characters or fewer.'),
        error_messages={
            'unique': _('A user with that username already exists.'),
        },
    )
    
    # Role and status
    role = models.CharField(
        _('role'),
        max_length=20,
        choices=Roles.choices,
        default=Roles.STUDENT,
        help_text=_('User role determines dashboard and permissions.')
    )
    status = models.CharField(
        _('status'),
        max_length=20,
        choices=Status.choices,
        default=Status.ACTIVE,
        help_text=_('Active users can log in. Inactive users cannot.')
    )
    
    # Timestamps
    created_at = models.DateTimeField(_('created at'), auto_now_add=True)
    updated_at = models.DateTimeField(_('updated at'), auto_now=True)
    last_logged_in = models.DateTimeField(_('last logged in'), null=True, blank=True)
    
    # Required fields for Django
    is_staff = models.BooleanField(
        _('staff status'),
        default=False,
        help_text=_('Designates whether the user can log into this admin site.'),
    )
    is_superuser = models.BooleanField(
        _('superuser status'),
        default=False,
        help_text=_('Designates that this user has all permissions without explicitly assigning them.'),
    )
    
    # Tracking
    created_by = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='created_users',
        verbose_name=_('created by')
    )
    
    objects = UserManager()
    
    USERNAME_FIELD = 'username'
    REQUIRED_FIELDS = []
    
    class Meta:
        verbose_name = _('user')
        verbose_name_plural = _('users')
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['username']),
            models.Index(fields=['role', 'status']),
        ]
    
    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"
    
    def save(self, *args, **kwargs):
        # Ensure superusers have proper role and status
        if self.is_superuser:
            self.role = self.Roles.ADMIN
            self.status = self.Status.ACTIVE
        super().save(*args, **kwargs)
    
    @property
    def is_active(self):
        """Override to use status field instead of is_active."""
        return self.status == self.Status.ACTIVE
    
    @property
    def role_display(self):
        """Return human-readable role name."""
        return self.get_role_display()
    
    def update_last_logged_in(self):
        """Update the last_logged_in timestamp."""
        self.last_logged_in = timezone.now()
        self.save(update_fields=['last_logged_in'])
    
    def can_login(self):
        """Check if user is allowed to login."""
        return self.status == self.Status.ACTIVE
    
    
    
    
    
    
    
    
    
    
    
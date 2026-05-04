from rest_framework import permissions


class IsAdmin(permissions.BasePermission):
    """Allow access only to admin users."""
    
    def has_permission(self, request, view):
        """Check if user is authenticated and has admin role."""
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )
    
    def has_object_permission(self, request, view, obj):
        """Check object-level permission for admin."""
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )


class IsTeacher(permissions.BasePermission):
    """Allow access only to teacher users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'teacher'
        )
    
    def has_object_permission(self, request, view, obj):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'teacher'
        )


class IsStudent(permissions.BasePermission):
    """Allow access only to student users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'student'
        )
    
    def has_object_permission(self, request, view, obj):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'student'
        )


class IsParent(permissions.BasePermission):
    """Allow access only to parent users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'parent'
        )
    
    def has_object_permission(self, request, view, obj):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'parent'
        )


class IsAdminOrSelf(permissions.BasePermission):
    """Allow access to admin users or the user themselves."""
    
    def has_permission(self, request, view):
        """Check if user is authenticated."""
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        """
        Check if user is admin or the object is the user themselves.
        obj is expected to be a User instance.
        """
        if not request.user.is_authenticated:
            return False
        
        # Admin can access any user
        if request.user.role == 'admin':
            return True
        
        # Users can access their own data
        return obj.id == request.user.id


class IsAdminOrTeacher(permissions.BasePermission):
    """Allow access to admin or teacher users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'admin' or request.user.role == 'teacher')
        )
    
    def has_object_permission(self, request, view, obj):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'admin' or request.user.role == 'teacher')
        )


class IsAdminOrParent(permissions.BasePermission):
    """Allow access to admin or parent users."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'admin' or request.user.role == 'parent')
        )
    
    def has_object_permission(self, request, view, obj):
        return (
            request.user and 
            request.user.is_authenticated and 
            (request.user.role == 'admin' or request.user.role == 'parent')
        )


class IsOwnerOrReadOnly(permissions.BasePermission):
    """Allow access only to the owner of the object for write operations."""
    
    def has_permission(self, request, view):
        return request.user and request.user.is_authenticated
    
    def has_object_permission(self, request, view, obj):
        # Read permissions are allowed for any authenticated user
        if request.method in permissions.SAFE_METHODS:
            return True
        
        # Write permissions are only allowed to the owner
        return obj.id == request.user.id


class IsAuthenticatedAndActive(permissions.BasePermission):
    """Allow access to authenticated and active users only."""
    
    def has_permission(self, request, view):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.status == 'active'
        )
    
    def has_object_permission(self, request, view, obj):
        return (
            request.user and 
            request.user.is_authenticated and 
            request.user.status == 'active'
        )
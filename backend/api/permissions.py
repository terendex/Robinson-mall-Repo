from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to users with the 'admin' role.
    Used for core system administration and managing other manager accounts.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role == 'admin'
        )

class IsManager(permissions.BasePermission):
    """
    Allows access to users with 'manager' or 'admin' roles.
    Used for accessing dashboards, campaign reports, and campaign configuration.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['manager', 'admin']
        )

class IsStaff(permissions.BasePermission):
    """
    Allows access to staff, managers, and admins.
    Used for day-to-day operations like looking up claims, registering stores,
    and managing vouchers.
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated and 
            request.user.role in ['staff', 'manager', 'admin']
        )

class IsCustomer(permissions.BasePermission):
    """
    Allows access to any authenticated user (primarily customers, but also supports
    staff/managers/admins who are authenticated and testing features).
    """
    def has_permission(self, request, view):
        return bool(
            request.user and 
            request.user.is_authenticated
        )

class IsOwnerOrStaff(permissions.BasePermission):
    """
    Object-level permission rule:
    - Staff, Managers, and Admins can access all records.
    - Customers are restricted to records where the 'user' field matches their authenticated profile.
    """
    def has_object_permission(self, request, view, obj):
        # Staff, Managers, and Admins bypass owner check
        if request.user.role in ['staff', 'manager', 'admin']:
            return True
        # Customers can only read/write their own objects
        return bool(obj.user == request.user)

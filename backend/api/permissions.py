
from rest_framework import permissions

class IsAdmin(permissions.BasePermission):
    """
    Allows access only to admin users.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role == 'admin')

class IsManager(permissions.BasePermission):
    """
    Allows access to managers and admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['manager', 'admin'])

class IsStaff(permissions.BasePermission):
    """
    Allows access to staff, managers, and admins.
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.role in ['staff', 'manager', 'admin'])

class IsCustomer(permissions.BasePermission):
    """
    Allows access only to authenticated customers (or higher roles for support).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated)

class IsOwnerOrStaff(permissions.BasePermission):
    """
    Custom permission to only allow owners of an object or staff to edit it.
    Assumes the model has a 'user' field.
    """
    def has_object_permission(self, request, view, obj):
        # Staff/Managers/Admins can see everything
        if request.user.role in ['staff', 'manager', 'admin']:
            return True
        # Customers can only see their own objects
        return obj.user == request.user

from rest_framework import permissions


class IsOwner(permissions.BasePermission):
    """
    Object-level permission to only allow owners of an object to access/edit it.
    """
    def has_object_permission(self, request, view, obj):
        return bool(obj.user == request.user)


class IsSuperUser(permissions.BasePermission):
    """
    Custom permission to allow access exclusively to superusers (is_superuser=True).
    """
    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and request.user.is_superuser)

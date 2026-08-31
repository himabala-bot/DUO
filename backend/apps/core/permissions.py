from rest_framework.permissions import BasePermission

class HasProfile(BasePermission):
    """
    Allows access only to authenticated users with an active Profile.
    """
    message = "User does not have an active profile."

    def has_permission(self, request, view):
        return bool(request.user and request.user.is_authenticated and hasattr(request.user, 'profile'))

class HasActiveDuo(BasePermission):
    """
    Allows access only to users who are members of an active DUO relationship.
    """
    message = "User is not currently connected in an active DUO relationship."

    def has_permission(self, request, view):
        if not (request.user and request.user.is_authenticated and hasattr(request.user, 'profile')):
            return False
        return request.user.profile.active_duo is not None

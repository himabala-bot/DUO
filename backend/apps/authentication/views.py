import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import ProfileSerializer, UpdateProfileSerializer
from apps.duos.models import DuoMember, ConnectionRequest
from apps.notifications.models import Notification

logger = logging.getLogger(__name__)

class SyncProfileView(APIView):
    """
    POST /api/auth/sync/
    Synchronizes the authenticated Supabase user profile and returns their current state.
    """
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return Response(
                {"error": "Profile could not be resolved from authentication token."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = ProfileSerializer(profile)
        return Response({
            "success": True,
            "profile": serializer.data
        }, status=status.HTTP_200_OK)


class ProfileDetailView(APIView):
    """
    GET /api/auth/profile/ - Retrieve current user profile
    PATCH /api/auth/profile/ - Update profile name, avatar, and preferences
    DELETE /api/auth/profile/ - Delete profile and user account
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)
        serializer = ProfileSerializer(profile)
        return Response(serializer.data)

    def patch(self, request):
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        serializer = UpdateProfileSerializer(profile, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response({
                "success": True,
                "profile": ProfileSerializer(profile).data
            })
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    def delete(self, request):
        profile = getattr(request.user, 'profile', None)
        if not profile:
            return Response({"error": "Profile not found"}, status=status.HTTP_404_NOT_FOUND)

        try:
            # 1. Leave any active DUO room
            active_memberships = DuoMember.objects.filter(user=profile, duo__status='ACTIVE')
            for m in active_memberships:
                duo = m.duo
                duo.status = 'DISCONNECTED'
                duo.save(update_fields=['status'])

            # 2. Delete connection requests & notifications
            ConnectionRequest.objects.filter(sender=profile).delete()
            ConnectionRequest.objects.filter(receiver=profile).delete()
            Notification.objects.filter(recipient=profile).delete()

            # 3. Delete Profile and Django User
            user = request.user
            profile.delete()
            user.delete()

            logger.info(f"Successfully deleted account for {profile.email}")
            return Response({
                "success": True,
                "message": "Account successfully deleted."
            }, status=status.HTTP_200_OK)
        except Exception as e:
            logger.exception(f"Error deleting account: {e}")
            return Response({
                "error": f"Failed to delete account: {str(e)}"
            }, status=status.HTTP_500_INTERNAL_SERVER_ERROR)

import logging
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from .serializers import ProfileSerializer, UpdateProfileSerializer

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
    PATCH /api/auth/profile/ - Update profile name and avatar
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

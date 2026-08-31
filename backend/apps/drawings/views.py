import logging
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.core.permissions import HasProfile, HasActiveDuo
from apps.notifications.services import create_notification
from .models import Drawing
from .serializers import DrawingSerializer, CreateDrawingSerializer

logger = logging.getLogger(__name__)

class DrawingListCreateView(APIView):
    """
    GET /api/drawings/ - List all drawings shared in the active DUO
    POST /api/drawings/ - Register a new drawing after frontend Supabase Storage upload
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def get(self, request):
        profile = request.user.profile
        duo = profile.active_duo

        drawings = Drawing.objects.filter(duo=duo).select_related('sender', 'receiver').order_by('-created_at')
        serializer = DrawingSerializer(drawings, many=True, context={'request': request})
        return Response({
            "drawings": serializer.data,
            "count": drawings.count()
        })

    def post(self, request):
        profile = request.user.profile
        duo = profile.active_duo
        partner = profile.partner

        if not partner:
            return Response(
                {"error": "Your partner profile is not active in this DUO."},
                status=status.HTTP_400_BAD_REQUEST
            )

        serializer = CreateDrawingSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        storage_path = serializer.validated_data['storage_path']
        caption = serializer.validated_data.get('caption', '')

        drawing = Drawing.objects.create(
            duo=duo,
            sender=profile,
            receiver=partner,
            storage_path=storage_path,
            caption=caption
        )

        # Notify partner
        notification_body = f"{profile.name} sent you a drawing!"
        if caption:
            notification_body += f' "{caption}"'

        create_notification(
            recipient=partner,
            n_type='DRAWING',
            title='New Drawing Received!',
            body=notification_body,
            reference_id=str(drawing.id)
        )

        output_serializer = DrawingSerializer(drawing, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class DrawingDetailView(APIView):
    """
    GET /api/drawings/<id>/ - Retrieve drawing detail and fresh signed URL
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def get(self, request, pk):
        profile = request.user.profile
        duo = profile.active_duo

        drawing = get_object_or_404(Drawing, id=pk, duo=duo)
        serializer = DrawingSerializer(drawing, context={'request': request})
        return Response(serializer.data)

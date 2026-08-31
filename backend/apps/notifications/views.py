import logging
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.core.permissions import HasProfile
from .models import Notification
from .serializers import NotificationSerializer

logger = logging.getLogger(__name__)

class NotificationListView(APIView):
    """
    GET /api/notifications/ - List notifications for current user with unread counter
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def get(self, request):
        profile = request.user.profile
        notifications = Notification.objects.filter(recipient=profile).order_by('-created_at')[:50]
        unread_count = Notification.objects.filter(recipient=profile, is_read=False).count()

        serializer = NotificationSerializer(notifications, many=True)
        return Response({
            "unread_count": unread_count,
            "notifications": serializer.data
        })


class MarkNotificationReadView(APIView):
    """
    POST /api/notifications/<id>/read/ - Mark a single notification as read
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def post(self, request, pk):
        profile = request.user.profile
        notification = get_object_or_404(Notification, id=pk, recipient=profile)
        notification.is_read = True
        notification.save(update_fields=['is_read'])
        return Response({
            "success": True,
            "notification": NotificationSerializer(notification).data
        })


class MarkAllNotificationsReadView(APIView):
    """
    POST /api/notifications/read-all/ - Mark all notifications as read
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def post(self, request):
        profile = request.user.profile
        updated = Notification.objects.filter(recipient=profile, is_read=False).update(is_read=True)
        return Response({
            "success": True,
            "marked_read": updated
        })

import logging
from django.utils import timezone
from django.shortcuts import get_object_or_404
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.core.permissions import HasProfile, HasActiveDuo
from apps.notifications.services import create_notification
from .models import Message
from .serializers import MessageSerializer, CreateMessageSerializer, ReactMessageSerializer

logger = logging.getLogger(__name__)

class MessageListCreateView(APIView):
    """
    GET /api/messages/ - Retrieve active message history for the active DUO
    POST /api/messages/ - Send a new message to the DUO partner
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def get(self, request):
        profile = request.user.profile
        duo = profile.active_duo

        messages = Message.objects.filter(duo=duo, is_unsent=False).select_related('sender', 'receiver', 'reply_to', 'reply_to__sender').order_by('created_at')
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response({
            "messages": serializer.data,
            "count": messages.count()
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

        serializer = CreateMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        content = serializer.validated_data['content']
        reply_to_id = serializer.validated_data.get('reply_to_id')

        reply_to_msg = None
        if reply_to_id:
            reply_to_msg = Message.objects.filter(id=reply_to_id, duo=duo).first()

        message = Message.objects.create(
            duo=duo,
            sender=profile,
            receiver=partner,
            content=content,
            reply_to=reply_to_msg
        )

        # Notify partner
        notif_body = "🎤 Voice note" if content.startswith('[voice:') else (content if len(content) <= 100 else f"{content[:97]}...")
        create_notification(
            recipient=partner,
            n_type='MESSAGE',
            title=f"Message from {profile.name}",
            body=notif_body,
            reference_id=str(message.id)
        )

        output_serializer = MessageSerializer(message, context={'request': request})
        return Response(output_serializer.data, status=status.HTTP_201_CREATED)


class MessageReactionView(APIView):
    """
    POST /api/messages/<id>/react/ - Toggle reaction on a message
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def post(self, request, pk):
        profile = request.user.profile
        duo = profile.active_duo

        message = get_object_or_404(Message, id=pk, duo=duo, is_unsent=False)
        serializer = ReactMessageSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        emoji = serializer.validated_data['emoji']
        reactions = dict(message.reactions or {})
        user_key = str(profile.id)

        # Toggle reaction
        if reactions.get(user_key) == emoji:
            reactions.pop(user_key, None)
        else:
            reactions[user_key] = emoji

        message.reactions = reactions
        message.save(update_fields=['reactions'])

        return Response({
            "success": True,
            "message_id": str(message.id),
            "reactions": reactions
        })


class MessageUnsendDeleteView(APIView):
    """
    DELETE /api/messages/<id>/ - Unsend or delete a message
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def delete(self, request, pk):
        profile = request.user.profile
        duo = profile.active_duo

        message = get_object_or_404(Message, id=pk, duo=duo)

        # Delete message or mark unsent
        message.delete()

        return Response({
            "success": True,
            "message_id": str(pk),
            "action": "DELETED"
        })


class MarkMessagesReadView(APIView):
    """
    POST /api/messages/mark-read/ - Mark unread messages as read
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def post(self, request):
        profile = request.user.profile
        duo = profile.active_duo

        now = timezone.now()
        updated_count = Message.objects.filter(
            duo=duo,
            receiver=profile,
            read_at__isnull=True
        ).update(read_at=now)

        return Response({"success": True, "marked_count": updated_count})


class ClearMessagesView(APIView):
    """
    POST /api/messages/clear/ - Clear all chat messages in active DUO room
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def post(self, request):
        profile = request.user.profile
        duo = profile.active_duo

        count, _ = Message.objects.filter(duo=duo).delete()
        logger.info(f"Cleared {count} messages for Duo {duo.id} by user {profile.id}")

        return Response({
            "success": True,
            "message": f"Cleared {count} messages.",
            "cleared_count": count
        })

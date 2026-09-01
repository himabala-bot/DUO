import logging
from datetime import timedelta
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

        # Clean up any expired disappearing messages
        now = timezone.now()
        Message.objects.filter(
            duo=duo,
            is_disappearing=True,
            expires_at__isnull=False,
            expires_at__lte=now
        ).delete()

        messages = Message.objects.filter(duo=duo, is_unsent=False).select_related('sender', 'receiver', 'reply_to', 'reply_to__sender').order_by('created_at')
        serializer = MessageSerializer(messages, many=True, context={'request': request})
        return Response({
            "messages": serializer.data,
            "disappearing_mode": getattr(duo, 'disappearing_mode', False),
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

        is_disappearing = getattr(duo, 'disappearing_mode', False)

        message = Message.objects.create(
            duo=duo,
            sender=profile,
            receiver=partner,
            content=content,
            reply_to=reply_to_msg,
            is_disappearing=is_disappearing
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

        # Delete message
        message.delete()

        return Response({
            "success": True,
            "message_id": str(pk),
            "action": "DELETED"
        })


class MarkMessagesReadView(APIView):
    """
    POST /api/messages/mark-read/ - Mark unread messages as read and start disappearing countdowns
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def post(self, request):
        profile = request.user.profile
        duo = profile.active_duo

        now = timezone.now()
        expires_at = now + timedelta(seconds=10)

        # Mark normal messages as read
        updated_normal = Message.objects.filter(
            duo=duo,
            receiver=profile,
            read_at__isnull=True,
            is_disappearing=False
        ).update(read_at=now)

        # Mark disappearing messages as read and set 10-second countdown
        updated_disappearing = Message.objects.filter(
            duo=duo,
            receiver=profile,
            read_at__isnull=True,
            is_disappearing=True
        ).update(read_at=now, expires_at=expires_at)

        return Response({
            "success": True,
            "marked_count": updated_normal + updated_disappearing,
            "disappearing_started": updated_disappearing
        })


class ToggleDisappearingModeView(APIView):
    """
    POST /api/messages/disappearing-mode/ - Toggle disappearing mode for active DUO
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def post(self, request):
        profile = request.user.profile
        duo = profile.active_duo

        enabled = request.data.get('enabled')
        if enabled is None:
            duo.disappearing_mode = not duo.disappearing_mode
        else:
            duo.disappearing_mode = bool(enabled)

        duo.save(update_fields=['disappearing_mode', 'updated_at'])

        return Response({
            "success": True,
            "disappearing_mode": duo.disappearing_mode
        })


class ExpireMessagesView(APIView):
    """
    POST /api/messages/expire/ - Purge expired disappearing messages from DB
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def post(self, request):
        profile = request.user.profile
        duo = profile.active_duo

        now = timezone.now()
        message_ids = request.data.get('message_ids')

        query = Message.objects.filter(duo=duo, is_disappearing=True)
        if message_ids and isinstance(message_ids, list):
            query = query.filter(id__in=message_ids)
        else:
            query = query.filter(expires_at__isnull=False, expires_at__lte=now)

        deleted_ids = list(query.values_list('id', flat=True))
        deleted_count, _ = query.delete()

        return Response({
            "success": True,
            "deleted_count": deleted_count,
            "deleted_ids": [str(mid) for mid in deleted_ids]
        })


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

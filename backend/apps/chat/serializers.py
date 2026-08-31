from rest_framework import serializers
from .models import Message
from apps.authentication.serializers import PartnerProfileSerializer

class SimpleReplyMessageSerializer(serializers.ModelSerializer):
    sender_name = serializers.CharField(source='sender.name', read_only=True)

    class Meta:
        model = Message
        fields = ['id', 'sender_name', 'content']


class MessageSerializer(serializers.ModelSerializer):
    sender = PartnerProfileSerializer(read_only=True)
    receiver = PartnerProfileSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()
    reply_to = SimpleReplyMessageSerializer(read_only=True)

    class Meta:
        model = Message
        fields = [
            'id',
            'duo_id',
            'sender',
            'receiver',
            'content',
            'reply_to',
            'reactions',
            'is_unsent',
            'is_me',
            'created_at',
            'read_at',
        ]
        read_only_fields = ['id', 'duo_id', 'sender', 'receiver', 'reply_to', 'reactions', 'is_unsent', 'created_at', 'read_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return False
        return obj.sender_id == request.user.profile.id


class CreateMessageSerializer(serializers.Serializer):
    content = serializers.CharField(max_length=5000, required=True, trim_whitespace=True)
    reply_to_id = serializers.UUIDField(required=False, allow_null=True)

    def validate_content(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Message content cannot be empty.")
        return val


class ReactMessageSerializer(serializers.Serializer):
    emoji = serializers.CharField(max_length=20, required=True)

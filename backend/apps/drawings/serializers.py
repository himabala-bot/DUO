from rest_framework import serializers
from .models import Drawing
from apps.authentication.serializers import PartnerProfileSerializer

class DrawingSerializer(serializers.ModelSerializer):
    sender = PartnerProfileSerializer(read_only=True)
    receiver = PartnerProfileSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()
    image_url = serializers.SerializerMethodField()

    class Meta:
        model = Drawing
        fields = [
            'id',
            'duo_id',
            'sender',
            'receiver',
            'is_me',
            'storage_path',
            'image_url',
            'caption',
            'created_at',
        ]
        read_only_fields = ['id', 'duo_id', 'sender', 'receiver', 'created_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return False
        return obj.sender_id == request.user.profile.id

    def get_image_url(self, obj):
        return obj.get_download_url(expires_in=7200)


class CreateDrawingSerializer(serializers.Serializer):
    storage_path = serializers.CharField(required=True, trim_whitespace=True)
    caption = serializers.CharField(max_length=255, required=False, allow_blank=True, default='')

    def validate_storage_path(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Storage path cannot be empty.")
        return val

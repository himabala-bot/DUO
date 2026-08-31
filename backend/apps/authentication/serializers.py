from rest_framework import serializers
from .models import Profile

class PartnerProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = ['id', 'name', 'email', 'avatar_url']
        read_only_fields = fields


class ProfileSerializer(serializers.ModelSerializer):
    partner = serializers.SerializerMethodField()
    has_active_duo = serializers.SerializerMethodField()
    active_duo_id = serializers.SerializerMethodField()
    connected_since = serializers.SerializerMethodField()

    class Meta:
        model = Profile
        fields = [
            'id',
            'auth_user_id',
            'name',
            'email',
            'avatar_url',
            'duo_code',
            'has_active_duo',
            'active_duo_id',
            'partner',
            'connected_since',
            'enter_to_send',
            'read_receipts',
            'notifications_enabled',
            'theme',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'auth_user_id', 'email', 'duo_code', 'created_at', 'updated_at']

    def get_partner(self, obj):
        partner = obj.partner
        if partner:
            return PartnerProfileSerializer(partner).data
        return None

    def get_has_active_duo(self, obj):
        return obj.active_duo is not None

    def get_active_duo_id(self, obj):
        duo = obj.active_duo
        return str(duo.id) if duo else None

    def get_connected_since(self, obj):
        duo = obj.active_duo
        return duo.created_at.isoformat() if duo else None


class UpdateProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = Profile
        fields = [
            'name',
            'avatar_url',
            'enter_to_send',
            'read_receipts',
            'notifications_enabled',
            'theme',
        ]

    def validate_name(self, value):
        val = value.strip()
        if not val:
            raise serializers.ValidationError("Name cannot be empty.")
        return val

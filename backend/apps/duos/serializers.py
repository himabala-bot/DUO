from rest_framework import serializers
from apps.authentication.serializers import PartnerProfileSerializer
from .models import Duo, DuoMember, ConnectionRequest, PairingSession
from apps.authentication.models import Profile

class DuoMemberSerializer(serializers.ModelSerializer):
    user = PartnerProfileSerializer(read_only=True)

    class Meta:
        model = DuoMember
        fields = ['id', 'user', 'role', 'joined_at']


class DuoDetailSerializer(serializers.ModelSerializer):
    members = DuoMemberSerializer(many=True, read_only=True)
    partner = serializers.SerializerMethodField()

    class Meta:
        model = Duo
        fields = ['id', 'status', 'created_at', 'members', 'partner']

    def get_partner(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return None
        current_profile = request.user.profile
        partner_member = obj.members.exclude(user=current_profile).select_related('user').first()
        if partner_member:
            return PartnerProfileSerializer(partner_member.user).data
        return None


class ConnectionRequestSerializer(serializers.ModelSerializer):
    sender = PartnerProfileSerializer(read_only=True)
    receiver = PartnerProfileSerializer(read_only=True)
    is_sender = serializers.SerializerMethodField()

    class Meta:
        model = ConnectionRequest
        fields = ['id', 'sender', 'receiver', 'status', 'is_sender', 'created_at', 'updated_at']
        read_only_fields = ['id', 'sender', 'receiver', 'status', 'created_at', 'updated_at']

    def get_is_sender(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return False
        return obj.sender_id == request.user.profile.id


class ConnectByCodeSerializer(serializers.Serializer):
    code = serializers.CharField(max_length=50, required=True, trim_whitespace=True)

    def validate_code(self, value):
        code = value.strip().upper()
        if not code.startswith('DUO-') and len(code) == 6:
            code = f"DUO-{code}"
        return code


class PairingSessionPublicSerializer(serializers.ModelSerializer):
    creator = PartnerProfileSerializer(read_only=True)
    is_valid = serializers.BooleanField(read_only=True)

    class Meta:
        model = PairingSession
        fields = ['id', 'token', 'code', 'creator', 'status', 'expires_at', 'is_valid', 'created_at']


class ClaimPairingSerializer(serializers.Serializer):
    token = serializers.CharField(required=False, allow_blank=True)
    code = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        if not attrs.get('token') and not attrs.get('code'):
            raise serializers.ValidationError("Either 'token' or 'code' must be provided.")
        return attrs

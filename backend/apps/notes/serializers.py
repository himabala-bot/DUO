from rest_framework import serializers
from .models import Note
from apps.authentication.serializers import PartnerProfileSerializer

class NoteSerializer(serializers.ModelSerializer):
    author = PartnerProfileSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Note
        fields = [
            'id',
            'duo_id',
            'author',
            'note_type',
            'content',
            'media_url',
            'color',
            'is_pinned',
            'is_me',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'duo_id', 'author', 'is_me', 'created_at', 'updated_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return False
        return obj.author_id == request.user.profile.id


class CreateNoteSerializer(serializers.Serializer):
    note_type = serializers.ChoiceField(choices=['TEXT', 'PHOTO', 'VOICE', 'DRAWING'], default='TEXT')
    content = serializers.CharField(required=False, allow_blank=True, default='')
    media_url = serializers.CharField(required=False, allow_blank=True, default='')
    color = serializers.CharField(max_length=30, required=False, default='#FAF7F2')
    is_pinned = serializers.BooleanField(required=False, default=False)

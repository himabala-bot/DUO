from rest_framework import serializers
from .models import TodoCategory, TodoItem
from apps.authentication.serializers import PartnerProfileSerializer

class TodoItemSerializer(serializers.ModelSerializer):
    created_by = PartnerProfileSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = TodoItem
        fields = [
            'id',
            'duo_id',
            'category_id',
            'created_by',
            'title',
            'description',
            'is_completed',
            'completed_at',
            'order',
            'is_me',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'duo_id', 'created_by', 'is_me', 'created_at', 'updated_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return False
        return obj.created_by_id == request.user.profile.id


class TodoCategorySerializer(serializers.ModelSerializer):
    items = TodoItemSerializer(many=True, read_only=True)

    class Meta:
        model = TodoCategory
        fields = [
            'id',
            'duo_id',
            'title',
            'emoji',
            'color',
            'order',
            'items',
            'created_at',
        ]
        read_only_fields = ['id', 'duo_id', 'created_at']


class CreateTodoItemSerializer(serializers.Serializer):
    category_id = serializers.UUIDField(required=True)
    title = serializers.CharField(max_length=255, required=True, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')


class CreateTodoCategorySerializer(serializers.Serializer):
    title = serializers.CharField(max_length=150, required=True, trim_whitespace=True)
    emoji = serializers.CharField(max_length=20, required=False, default='📌')
    color = serializers.CharField(max_length=30, required=False, default='#FAF7F2')

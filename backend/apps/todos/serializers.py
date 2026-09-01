from rest_framework import serializers
from .models import Task
from apps.authentication.serializers import PartnerProfileSerializer

class TaskSerializer(serializers.ModelSerializer):
    created_by = PartnerProfileSerializer(read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = Task
        fields = [
            'id',
            'duo_id',
            'created_by',
            'title',
            'description',
            'status',
            'order',
            'is_me',
            'completed_at',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'duo_id', 'created_by', 'is_me', 'completed_at', 'created_at', 'updated_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return False
        return obj.created_by_id == request.user.profile.id


class CreateTaskSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=True, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True, default='')
    status = serializers.ChoiceField(choices=['TODO', 'IN_PROGRESS', 'COMPLETED'], default='TODO')


class UpdateTaskSerializer(serializers.Serializer):
    title = serializers.CharField(max_length=255, required=False, trim_whitespace=True)
    description = serializers.CharField(required=False, allow_blank=True)
    status = serializers.ChoiceField(choices=['TODO', 'IN_PROGRESS', 'COMPLETED'], required=False)
    order = serializers.IntegerField(required=False)

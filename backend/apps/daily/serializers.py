from rest_framework import serializers
from .models import DailyQuestion, DailyPromptAssignment, DailyResponse

class DailyQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyQuestion
        fields = ['id', 'question', 'genre', 'category', 'order']


class DailyPromptAssignmentSerializer(serializers.ModelSerializer):
    question_id = serializers.UUIDField(source='question.id', read_only=True)
    question = serializers.CharField(source='question.question', read_only=True)
    genre = serializers.CharField(source='question.genre', read_only=True)

    class Meta:
        model = DailyPromptAssignment
        fields = [
            'id',
            'question_id',
            'question',
            'genre',
            'assigned_date',
            'status',
            'is_carried_forward',
            'original_assigned_date',
            'created_at',
        ]


class DailyResponseSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question', read_only=True)
    question_genre = serializers.CharField(source='question.genre', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = DailyResponse
        fields = [
            'id',
            'assignment_id',
            'question_id',
            'question_text',
            'question_genre',
            'user_id',
            'user_name',
            'answer',
            'response_date',
            'status',
            'submitted_at',
            'is_me',
            'created_at',
            'updated_at',
        ]
        read_only_fields = ['id', 'question_text', 'question_genre', 'user_name', 'created_at', 'updated_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return False
        return obj.user_id == request.user.profile.id


class SingleAnswerInputSerializer(serializers.Serializer):
    question_id = serializers.UUIDField(required=True)
    assignment_id = serializers.UUIDField(required=False, allow_null=True)
    answer = serializers.CharField(allow_blank=True, default='')


class SubmitDailyResponsesSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    action = serializers.ChoiceField(choices=['SAVE_DRAFT', 'SUBMIT'], default='SUBMIT')
    responses = serializers.ListField(
        child=SingleAnswerInputSerializer(),
        allow_empty=False
    )


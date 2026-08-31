from rest_framework import serializers
from .models import DailyQuestion, DailyResponse

class DailyQuestionSerializer(serializers.ModelSerializer):
    class Meta:
        model = DailyQuestion
        fields = ['id', 'question', 'category', 'order']


class DailyResponseSerializer(serializers.ModelSerializer):
    question_text = serializers.CharField(source='question.question', read_only=True)
    user_name = serializers.CharField(source='user.name', read_only=True)
    is_me = serializers.SerializerMethodField()

    class Meta:
        model = DailyResponse
        fields = [
            'id',
            'question_id',
            'question_text',
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
        read_only_fields = ['id', 'question_text', 'user_name', 'created_at', 'updated_at']

    def get_is_me(self, obj):
        request = self.context.get('request')
        if not request or not hasattr(request.user, 'profile'):
            return False
        return obj.user_id == request.user.profile.id


class SingleAnswerInputSerializer(serializers.Serializer):
    question_id = serializers.UUIDField(required=True)
    answer = serializers.CharField(allow_blank=True, default='')


class SubmitDailyResponsesSerializer(serializers.Serializer):
    date = serializers.DateField(required=False)
    action = serializers.ChoiceField(choices=['SAVE_DRAFT', 'SUBMIT'], default='SUBMIT')
    responses = serializers.ListField(
        child=SingleAnswerInputSerializer(),
        allow_empty=False
    )

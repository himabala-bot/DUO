import logging
from datetime import date
from django.utils import timezone
from django.db import models
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.core.permissions import HasProfile, HasActiveDuo
from apps.notifications.services import create_notification
from .models import DailyQuestion, DailyResponse
from .serializers import (
    DailyQuestionSerializer,
    DailyResponseSerializer,
    SubmitDailyResponsesSerializer,
)

logger = logging.getLogger(__name__)

class DailyQuestionListView(APIView):
    """
    GET /api/daily/questions/ - Returns list of active daily questions
    """
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        questions = DailyQuestion.objects.filter(active=True).order_by('order', 'created_at')
        serializer = DailyQuestionSerializer(questions, many=True)
        return Response({
            "questions": serializer.data,
            "count": questions.count()
        })


class DailyResponsesView(APIView):
    """
    GET /api/daily/responses/?date=YYYY-MM-DD - Get daily responses for a given date
    Enforces strict privacy: Own drafts + partner submitted answers only.

    POST /api/daily/responses/ - Save draft or submit answers for today
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def get(self, request):
        profile = request.user.profile
        duo = profile.active_duo
        partner = profile.partner

        target_date_str = request.query_params.get('date')
        if target_date_str:
            try:
                target_date = date.fromisoformat(target_date_str)
            except ValueError:
                return Response(
                    {"error": "Invalid date format. Please use YYYY-MM-DD."},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            target_date = timezone.now().date()

        # All questions
        questions = DailyQuestion.objects.filter(active=True).order_by('order', 'created_at')
        questions_data = DailyQuestionSerializer(questions, many=True).data

        # 1. My responses (can be DRAFT or SUBMITTED)
        my_responses_qs = DailyResponse.objects.filter(
            duo=duo,
            user=profile,
            response_date=target_date
        ).select_related('question')
        my_responses_data = DailyResponseSerializer(my_responses_qs, many=True, context={'request': request}).data

        # Determine my status
        my_status = "NOT_STARTED"
        if my_responses_qs.exists():
            if all(r.status == 'SUBMITTED' for r in my_responses_qs):
                my_status = "SUBMITTED"
            else:
                my_status = "DRAFT"

        # 2. Partner responses - STRICT PRIVACY RULE:
        # ONLY return responses where status == 'SUBMITTED'
        partner_responses_data = []
        partner_status = "NOT_SUBMITTED"

        if partner:
            partner_submitted_qs = DailyResponse.objects.filter(
                duo=duo,
                user=partner,
                response_date=target_date,
                status='SUBMITTED'
            ).select_related('question')

            partner_responses_data = DailyResponseSerializer(
                partner_submitted_qs, many=True, context={'request': request}
            ).data

            if partner_submitted_qs.exists():
                partner_status = "SUBMITTED"

        return Response({
            "date": target_date.isoformat(),
            "questions": questions_data,
            "my_status": my_status,
            "partner_status": partner_status,
            "my_responses": my_responses_data,
            "partner_responses": partner_responses_data,
        })

    def post(self, request):
        profile = request.user.profile
        duo = profile.active_duo
        partner = profile.partner

        serializer = SubmitDailyResponsesSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        validated_data = serializer.validated_data
        target_date = validated_data.get('date') or timezone.now().date()
        action = validated_data['action']
        items = validated_data['responses']

        new_status = 'SUBMITTED' if action == 'SUBMIT' else 'DRAFT'
        submitted_time = timezone.now() if action == 'SUBMIT' else None

        saved_responses = []
        for item in items:
            q_id = item['question_id']
            ans = item['answer']

            try:
                question = DailyQuestion.objects.get(id=q_id)
            except DailyQuestion.DoesNotExist:
                continue

            resp_obj, created = DailyResponse.objects.update_or_create(
                question=question,
                user=profile,
                duo=duo,
                response_date=target_date,
                defaults={
                    'answer': ans,
                    'status': new_status,
                    'submitted_at': submitted_time if new_status == 'SUBMITTED' else None
                }
            )
            saved_responses.append(resp_obj)

        if action == 'SUBMIT' and partner:
            # Create notification for partner
            create_notification(
                recipient=partner,
                n_type='DAILY_RESPONSE',
                title='Daily Answers Submitted',
                body=f"{profile.name} answered today's questions.",
                reference_id=str(target_date)
            )

        output_serializer = DailyResponseSerializer(saved_responses, many=True, context={'request': request})
        return Response({
            "success": True,
            "status": new_status,
            "date": target_date.isoformat(),
            "message": "Answers submitted successfully!" if action == 'SUBMIT' else "Draft saved successfully.",
            "responses": output_serializer.data
        })


class DailyHistoryView(APIView):
    """
    GET /api/daily/history/ - List historical dates where either partner submitted answers
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def get(self, request):
        profile = request.user.profile
        duo = profile.active_duo
        partner = profile.partner

        # Get all dates where DUO has submitted responses
        submitted_dates = DailyResponse.objects.filter(
            duo=duo,
            status='SUBMITTED'
        ).values_list('response_date', flat=True).distinct().order_by('-response_date')

        history_items = []
        for d in submitted_dates:
            my_count = DailyResponse.objects.filter(
                duo=duo, user=profile, response_date=d, status='SUBMITTED'
            ).count()
            partner_count = 0
            if partner:
                partner_count = DailyResponse.objects.filter(
                    duo=duo, user=partner, response_date=d, status='SUBMITTED'
                ).count()

            history_items.append({
                "date": d.isoformat(),
                "my_submitted": my_count > 0,
                "partner_submitted": partner_count > 0,
                "both_submitted": my_count > 0 and partner_count > 0,
                "summary": "Both answered" if (my_count > 0 and partner_count > 0) else (
                    f"{profile.name} answered" if my_count > 0 else (f"{partner.name} answered" if partner else "1 answered")
                )
            })

        return Response({
            "history": history_items,
            "total_days": len(history_items)
        })

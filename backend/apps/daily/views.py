import logging
import hashlib
import random
from datetime import date, timedelta
from django.utils import timezone
from django.db import models, transaction
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.core.permissions import HasProfile, HasActiveDuo
from apps.notifications.services import create_notification
from .models import DailyQuestion, DailyPromptAssignment, DailyResponse
from .serializers import (
    DailyQuestionSerializer,
    DailyPromptAssignmentSerializer,
    DailyResponseSerializer,
    SubmitDailyResponsesSerializer,
)

logger = logging.getLogger(__name__)

GENRES = ['FUN', 'DEEP', 'IMAGINATIVE']


def get_or_create_daily_assignments(user, duo, partner, target_date):
    """
    Ensures 3 distinct genre questions are assigned for `user` on `target_date`.
    Handles:
    - Carrying forward unanswered questions from prior days.
    - Deterministic assignment for today based on calendar day.
    - Complete exclusion of questions ever answered by either partner.
    - Independent non-overlapping questions between partners.
    """
    with transaction.atomic():
        # 1. Existing active assignments for today
        today_assignments = list(
            DailyPromptAssignment.objects.filter(
                user=user,
                duo=duo,
                assigned_date=target_date
            ).exclude(status='REPLACED').select_related('question')
        )

        assigned_genres = {a.genre for a in today_assignments}

        # 2. Check for unanswered carry-forward questions from prior days if slots remain
        if len(assigned_genres) < 3:
            # Find recent unanswered assignments
            unanswered_past = DailyPromptAssignment.objects.filter(
                user=user,
                duo=duo,
                assigned_date__lt=target_date,
                status__in=['ASSIGNED', 'CARRIED_FORWARD']
            ).exclude(
                question__responses__user=user,
                question__responses__status='SUBMITTED'
            ).order_by('-assigned_date').select_related('question')

            for past_a in unanswered_past:
                if past_a.genre not in assigned_genres:
                    # Carry forward to today
                    orig_date = past_a.original_assigned_date or past_a.assigned_date
                    # Mark past record as CARRIED_FORWARD
                    past_a.status = 'CARRIED_FORWARD'
                    past_a.save()

                    new_cf = DailyPromptAssignment.objects.create(
                        user=user,
                        partner=partner,
                        duo=duo,
                        question=past_a.question,
                        genre=past_a.genre,
                        assigned_date=target_date,
                        status='ASSIGNED',
                        is_carried_forward=True,
                        original_assigned_date=orig_date,
                    )
                    today_assignments.append(new_cf)
                    assigned_genres.add(past_a.genre)
                    if len(assigned_genres) >= 3:
                        break

        # 3. For any missing genres, assign fresh questions for today
        missing_genres = [g for g in GENRES if g not in assigned_genres]

        if missing_genres:
            # Find all questions ever answered by EITHER partner
            partner_ids = [user.id]
            if partner:
                partner_ids.append(partner.id)

            answered_question_ids = set(
                DailyResponse.objects.filter(
                    user_id__in=partner_ids,
                    status='SUBMITTED'
                ).values_list('question_id', flat=True)
            )

            # Questions currently assigned to partner today or in partner's active carry-forwards
            partner_assigned_ids = set()
            if partner:
                partner_assigned_ids = set(
                    DailyPromptAssignment.objects.filter(
                        user=partner,
                        duo=duo,
                        assigned_date=target_date
                    ).exclude(status='REPLACED').values_list('question_id', flat=True)
                )

            # Questions already assigned to this user in any state today
            user_today_question_ids = {a.question_id for a in today_assignments}

            # Questions previously assigned to this user
            user_past_assigned_ids = set(
                DailyPromptAssignment.objects.filter(
                    user=user,
                    duo=duo
                ).values_list('question_id', flat=True)
            )

            for genre in missing_genres:
                # Candidate pool
                candidates = DailyQuestion.objects.filter(
                    active=True,
                    genre=genre
                ).exclude(
                    id__in=answered_question_ids | partner_assigned_ids | user_today_question_ids
                )

                # Prioritize questions not yet shown to user
                fresh_candidates = candidates.exclude(id__in=user_past_assigned_ids)
                pool = list(fresh_candidates) if fresh_candidates.exists() else list(candidates)

                if not pool:
                    # Fallback to any active question in this genre not answered by either and not assigned to partner today
                    pool = list(
                        DailyQuestion.objects.filter(active=True, genre=genre)
                        .exclude(id__in=answered_question_ids | partner_assigned_ids | user_today_question_ids)
                    )

                if not pool:
                    # Final fallback: any active in genre
                    pool = list(DailyQuestion.objects.filter(active=True, genre=genre))

                if pool:
                    # Deterministic pick using hash of (user.id, target_date, genre)
                    seed_str = f"{user.id}-{target_date.isoformat()}-{genre}"
                    hash_val = int(hashlib.md5(seed_str.encode()).hexdigest(), 16)
                    selected_q = pool[hash_val % len(pool)]

                    new_assign = DailyPromptAssignment.objects.create(
                        user=user,
                        partner=partner,
                        duo=duo,
                        question=selected_q,
                        genre=genre,
                        assigned_date=target_date,
                        status='ASSIGNED',
                        is_carried_forward=False,
                    )
                    today_assignments.append(new_assign)
                    user_today_question_ids.add(selected_q.id)

        # Sort assignments in standard GENRES order
        today_assignments.sort(key=lambda a: GENRES.index(a.genre) if a.genre in GENRES else 99)
        return today_assignments


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
    GET /api/daily/responses/?date=YYYY-MM-DD - Get 3 daily questions and responses
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

        # 1. Get or generate user's 3 daily prompt assignments
        my_assignments = get_or_create_daily_assignments(profile, duo, partner, target_date)

        # Format questions data with assignment metadata
        questions_data = []
        for a in my_assignments:
            q_dict = DailyQuestionSerializer(a.question).data
            q_dict['assignment_id'] = str(a.id)
            q_dict['is_carried_forward'] = a.is_carried_forward
            q_dict['genre'] = a.genre
            q_dict['original_assigned_date'] = a.original_assigned_date.isoformat() if a.original_assigned_date else None
            questions_data.append(q_dict)

        # 2. My responses (DRAFT or SUBMITTED)
        my_responses_qs = DailyResponse.objects.filter(
            duo=duo,
            user=profile,
            response_date=target_date
        ).select_related('question')
        my_responses_data = DailyResponseSerializer(my_responses_qs, many=True, context={'request': request}).data

        my_status = "NOT_STARTED"
        if my_responses_qs.exists():
            if all(r.status == 'SUBMITTED' for r in my_responses_qs) and len(my_responses_qs) >= len(my_assignments):
                my_status = "SUBMITTED"
            else:
                my_status = "DRAFT"

        # 3. Partner responses - STRICT PRIVACY: only return SUBMITTED answers
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
                # If viewing history or archive, ensure partner's submitted questions are present in questions list
                existing_q_ids = {q['id'] for q in questions_data}
                for resp in partner_submitted_qs:
                    if str(resp.question_id) not in existing_q_ids:
                        p_q_dict = DailyQuestionSerializer(resp.question).data
                        p_q_dict['genre'] = resp.question.genre
                        questions_data.append(p_q_dict)
                        existing_q_ids.add(str(resp.question_id))

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
            assign_id = item.get('assignment_id')

            try:
                question = DailyQuestion.objects.get(id=q_id)
            except DailyQuestion.DoesNotExist:
                continue

            assignment = None
            if assign_id:
                try:
                    assignment = DailyPromptAssignment.objects.get(id=assign_id, user=profile)
                except DailyPromptAssignment.DoesNotExist:
                    assignment = None

            resp_obj, created = DailyResponse.objects.update_or_create(
                question=question,
                user=profile,
                duo=duo,
                response_date=target_date,
                defaults={
                    'assignment': assignment,
                    'answer': ans,
                    'status': new_status,
                    'submitted_at': submitted_time if new_status == 'SUBMITTED' else None
                }
            )
            saved_responses.append(resp_obj)

            if new_status == 'SUBMITTED' and assignment:
                assignment.status = 'ANSWERED'
                assignment.answered_at = timezone.now()
                assignment.save()

        if action == 'SUBMIT' and partner:
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


class ChangeDailyQuestionView(APIView):
    """
    POST /api/daily/questions/<assignment_id>/change/
    Replaces an assigned question with a fresh random eligible question of the same genre.
    Rules:
    - Same genre.
    - Not already answered by either partner.
    - Not assigned to partner.
    - Not currently used in user's active set today.
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def post(self, request, assignment_id):
        profile = request.user.profile
        duo = profile.active_duo
        partner = profile.partner

        try:
            assignment = DailyPromptAssignment.objects.get(
                id=assignment_id,
                user=profile,
                duo=duo
            )
        except DailyPromptAssignment.DoesNotExist:
            return Response({"error": "Prompt assignment not found."}, status=status.HTTP_404_NOT_FOUND)

        if assignment.status == 'ANSWERED':
            return Response({"error": "Cannot change an already answered question."}, status=status.HTTP_400_BAD_REQUEST)

        target_date = assignment.assigned_date
        genre = assignment.genre

        with transaction.atomic():
            # 1. Mark current assignment as REPLACED
            assignment.status = 'REPLACED'
            assignment.replaced_at = timezone.now()
            assignment.save()

            # 2. Exclude questions answered by either partner
            partner_ids = [profile.id]
            if partner:
                partner_ids.append(partner.id)

            answered_question_ids = set(
                DailyResponse.objects.filter(
                    user_id__in=partner_ids,
                    status='SUBMITTED'
                ).values_list('question_id', flat=True)
            )

            # Exclude questions assigned to partner today
            partner_assigned_ids = set()
            if partner:
                partner_assigned_ids = set(
                    DailyPromptAssignment.objects.filter(
                        user=partner,
                        duo=duo,
                        assigned_date=target_date
                    ).exclude(status='REPLACED').values_list('question_id', flat=True)
                )

            # Exclude user's currently assigned questions today
            user_today_assigned = set(
                DailyPromptAssignment.objects.filter(
                    user=profile,
                    duo=duo,
                    assigned_date=target_date
                ).exclude(status='REPLACED').values_list('question_id', flat=True)
            )

            # Questions previously shown/assigned to this user
            user_past_assigned_ids = set(
                DailyPromptAssignment.objects.filter(
                    user=profile,
                    duo=duo
                ).values_list('question_id', flat=True)
            )

            # Pool of candidates
            candidates = DailyQuestion.objects.filter(
                active=True,
                genre=genre
            ).exclude(
                id__in=answered_question_ids | partner_assigned_ids | user_today_assigned | {assignment.question_id}
            )

            fresh_candidates = candidates.exclude(id__in=user_past_assigned_ids)
            pool = list(fresh_candidates) if fresh_candidates.exists() else list(candidates)

            if not pool:
                # Broader fallback
                pool = list(
                    DailyQuestion.objects.filter(active=True, genre=genre)
                    .exclude(id__in=answered_question_ids | partner_assigned_ids | user_today_assigned)
                )

            if not pool:
                pool = list(DailyQuestion.objects.filter(active=True, genre=genre))

            if not pool:
                return Response({"error": "No replacement question available."}, status=status.HTTP_400_BAD_REQUEST)

            # Random replacement pick
            new_question = random.choice(pool)

            new_assignment = DailyPromptAssignment.objects.create(
                user=profile,
                partner=partner,
                duo=duo,
                question=new_question,
                genre=genre,
                assigned_date=target_date,
                status='ASSIGNED',
                is_carried_forward=False,
            )

            q_data = DailyQuestionSerializer(new_question).data
            q_data['assignment_id'] = str(new_assignment.id)
            q_data['is_carried_forward'] = False
            q_data['genre'] = genre

            return Response({
                "success": True,
                "message": "Question replaced successfully.",
                "assignment": DailyPromptAssignmentSerializer(new_assignment).data,
                "question": q_data
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


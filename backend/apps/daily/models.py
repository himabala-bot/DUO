import uuid
from django.db import models
from apps.authentication.models import Profile
from apps.duos.models import Duo

class DailyQuestion(models.Model):
    GENRE_CHOICES = [
        ('FUN', 'Fun / Playful'),
        ('DEEP', 'Deep / Emotional'),
        ('IMAGINATIVE', 'Imaginative / Hypothetical'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.TextField(unique=True)
    genre = models.CharField(max_length=20, choices=GENRE_CHOICES, default='FUN', db_index=True)
    category = models.CharField(max_length=50, default='DAILY', blank=True)
    active = models.BooleanField(default=True, db_index=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_questions'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"[{self.genre}] {self.question[:50]}..."


class DailyPromptAssignment(models.Model):
    STATUS_CHOICES = [
        ('ASSIGNED', 'Assigned'),
        ('CARRIED_FORWARD', 'Carried Forward'),
        ('REPLACED', 'Replaced'),
        ('ANSWERED', 'Answered'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    duo = models.ForeignKey(Duo, on_delete=models.CASCADE, related_name='prompt_assignments')
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='prompt_assignments')
    partner = models.ForeignKey(Profile, on_delete=models.SET_NULL, null=True, blank=True, related_name='partner_prompt_assignments')
    question = models.ForeignKey(DailyQuestion, on_delete=models.CASCADE, related_name='assignments')
    genre = models.CharField(max_length=20, choices=DailyQuestion.GENRE_CHOICES, db_index=True)
    assigned_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ASSIGNED', db_index=True)
    is_carried_forward = models.BooleanField(default=False)
    original_assigned_date = models.DateField(null=True, blank=True)
    replaced_at = models.DateTimeField(null=True, blank=True)
    answered_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_prompt_assignments'
        unique_together = ('user', 'question', 'assigned_date')
        ordering = ['assigned_date', 'genre', 'created_at']
        indexes = [
            models.Index(fields=['user', 'assigned_date', 'status']),
            models.Index(fields=['duo', 'assigned_date']),
            models.Index(fields=['question', 'status']),
        ]

    def __str__(self):
        return f"{self.user.name} - {self.genre} on {self.assigned_date} ({self.status})"


class DailyResponse(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    assignment = models.ForeignKey(DailyPromptAssignment, on_delete=models.SET_NULL, null=True, blank=True, related_name='responses')
    question = models.ForeignKey(DailyQuestion, on_delete=models.CASCADE, related_name='responses')
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='daily_responses')
    duo = models.ForeignKey(Duo, on_delete=models.CASCADE, related_name='daily_responses')
    answer = models.TextField(blank=True, default='')
    response_date = models.DateField(db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='DRAFT', db_index=True)
    submitted_at = models.DateTimeField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'daily_responses'
        unique_together = ('question', 'user', 'duo', 'response_date')
        ordering = ['response_date', 'question__order']
        indexes = [
            models.Index(fields=['duo', 'response_date', 'status']),
            models.Index(fields=['user', 'response_date', 'status']),
        ]

    def __str__(self):
        return f"Response by {self.user.name} on {self.response_date} [{self.status}]"


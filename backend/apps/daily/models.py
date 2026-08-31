import uuid
from django.db import models
from apps.authentication.models import Profile
from apps.duos.models import Duo

class DailyQuestion(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    question = models.TextField()
    category = models.CharField(max_length=50, default='DAILY', blank=True)
    active = models.BooleanField(default=True, db_index=True)
    order = models.IntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'daily_questions'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.question[:50]}..."


class DailyResponse(models.Model):
    STATUS_CHOICES = [
        ('DRAFT', 'Draft'),
        ('SUBMITTED', 'Submitted'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
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

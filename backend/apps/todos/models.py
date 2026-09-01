import uuid
from django.db import models
from apps.authentication.models import Profile
from apps.duos.models import Duo

class Task(models.Model):
    STATUS_CHOICES = [
        ('TODO', 'To Do'),
        ('IN_PROGRESS', 'In Progress'),
        ('COMPLETED', 'Completed'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    duo = models.ForeignKey(Duo, on_delete=models.CASCADE, related_name='tasks')
    created_by = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='created_tasks')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='TODO', db_index=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    completed_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'tasks'
        ordering = ['order', '-created_at']

    def __str__(self):
        return f"[{self.status}] {self.title}"

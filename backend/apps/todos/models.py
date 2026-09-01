import uuid
from django.db import models
from apps.authentication.models import Profile
from apps.duos.models import Duo

class TodoCategory(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    duo = models.ForeignKey(Duo, on_delete=models.CASCADE, related_name='todo_categories')
    title = models.CharField(max_length=150)
    emoji = models.CharField(max_length=20, default='📌')
    color = models.CharField(max_length=30, default='#FAF7F2')
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'todo_categories'
        ordering = ['order', 'created_at']

    def __str__(self):
        return f"{self.emoji} {self.title} in {self.duo_id}"


class TodoItem(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    duo = models.ForeignKey(Duo, on_delete=models.CASCADE, related_name='todo_items')
    category = models.ForeignKey(TodoCategory, on_delete=models.CASCADE, related_name='items')
    created_by = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='created_todos')
    title = models.CharField(max_length=255)
    description = models.TextField(blank=True, default='')
    is_completed = models.BooleanField(default=False)
    completed_at = models.DateTimeField(null=True, blank=True)
    order = models.PositiveIntegerField(default=0)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'todo_items'
        ordering = ['is_completed', 'order', '-created_at']

    def __str__(self):
        return f"{self.title} ({'Done' if self.is_completed else 'Pending'})"

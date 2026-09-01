import uuid
from django.db import models
from apps.authentication.models import Profile
from apps.duos.models import Duo

class Message(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    duo = models.ForeignKey(Duo, on_delete=models.CASCADE, related_name='messages')
    sender = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='sent_messages')
    receiver = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='received_messages')
    content = models.TextField()
    reply_to = models.ForeignKey('self', null=True, blank=True, on_delete=models.SET_NULL, related_name='replies')
    reactions = models.JSONField(default=dict, blank=True)
    is_unsent = models.BooleanField(default=False)
    is_disappearing = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    read_at = models.DateTimeField(null=True, blank=True, db_index=True)
    expires_at = models.DateTimeField(null=True, blank=True, db_index=True)

    class Meta:
        db_table = 'messages'
        ordering = ['created_at']
        indexes = [
            models.Index(fields=['duo', 'created_at']),
            models.Index(fields=['receiver', 'read_at']),
            models.Index(fields=['duo', 'is_disappearing', 'expires_at']),
        ]

    def __str__(self):
        return f"Message from {self.sender.name} to {self.receiver.name} at {self.created_at}"

import uuid
from django.db import models
from apps.authentication.models import Profile
from apps.duos.models import Duo

class Note(models.Model):
    NOTE_TYPES = [
        ('TEXT', 'Text Note'),
        ('PHOTO', 'Photo Note'),
        ('VOICE', 'Voice Note'),
        ('DRAWING', 'Drawing Note'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    duo = models.ForeignKey(Duo, on_delete=models.CASCADE, related_name='notes')
    author = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='notes')
    note_type = models.CharField(max_length=20, choices=NOTE_TYPES, default='TEXT')
    content = models.TextField(blank=True, default='')
    media_url = models.TextField(blank=True, default='')
    color = models.CharField(max_length=30, default='#FAF7F2')
    is_pinned = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'little_notes'
        ordering = ['-is_pinned', '-created_at']

    def __str__(self):
        return f"{self.note_type} note by {self.author.name} in {self.duo_id}"

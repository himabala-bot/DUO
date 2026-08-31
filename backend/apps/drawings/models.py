import uuid
from django.db import models
from apps.authentication.models import Profile
from apps.duos.models import Duo
from apps.core.supabase_client import get_signed_url

class Drawing(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    duo = models.ForeignKey(Duo, on_delete=models.CASCADE, related_name='drawings')
    sender = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='sent_drawings')
    receiver = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='received_drawings')
    storage_path = models.TextField()
    caption = models.CharField(max_length=255, blank=True, default='')
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        db_table = 'drawings'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['duo', '-created_at']),
        ]

    def __str__(self):
        return f"Drawing from {self.sender.name} to {self.receiver.name} ({self.created_at})"

    def get_download_url(self, expires_in: int = 3600) -> str:
        """Returns signed URL for reading/downloading from private Supabase bucket 'drawings' or direct data URL."""
        if not self.storage_path:
            return ""
        if self.storage_path.startswith(('data:', 'http://', 'https://')):
            return self.storage_path
        return get_signed_url('drawings', self.storage_path, expires_in)

import uuid
import random
import string
from django.db import models

def generate_duo_code():
    """Generates a random unique DUO code like DUO-7K4P2M."""
    chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'
    code = ''.join(random.choices(chars, k=6))
    return f"DUO-{code}"

class Profile(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    auth_user_id = models.UUIDField(unique=True, db_index=True)
    name = models.CharField(max_length=150, default='DUO Member')
    email = models.EmailField(unique=True, db_index=True)
    avatar_url = models.TextField(blank=True, default='')
    duo_code = models.CharField(max_length=20, unique=True, db_index=True, blank=True)
    enter_to_send = models.BooleanField(default=True)
    read_receipts = models.BooleanField(default=True)
    notifications_enabled = models.BooleanField(default=True)
    theme = models.CharField(max_length=20, default='system')
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'profiles'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.name} ({self.email})"

    def save(self, *args, **kwargs):
        if not self.duo_code:
            self.duo_code = self._generate_unique_code()
        super().save(*args, **kwargs)

    def _generate_unique_code(self):
        code = generate_duo_code()
        while Profile.objects.filter(duo_code=code).exists():
            code = generate_duo_code()
        return code

    @property
    def active_duo_membership(self):
        """Returns the active DuoMember instance if any."""
        return self.duo_memberships.filter(duo__status='ACTIVE').select_related('duo').first()

    @property
    def active_duo(self):
        """Returns the active Duo model instance if any."""
        membership = self.active_duo_membership
        return membership.duo if membership else None

    @property
    def partner_membership(self):
        """Returns the other DuoMember in the active DUO."""
        duo = self.active_duo
        if not duo:
            return None
        return duo.members.exclude(user=self).select_related('user').first()

    @property
    def partner(self):
        """Returns the partner Profile in the active DUO."""
        pm = self.partner_membership
        return pm.user if pm else None

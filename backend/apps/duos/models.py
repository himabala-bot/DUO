import uuid
from django.db import models, transaction
from django.core.exceptions import ValidationError
from apps.authentication.models import Profile

class Duo(models.Model):
    STATUS_CHOICES = [
        ('ACTIVE', 'Active'),
        ('ARCHIVED', 'Archived'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='ACTIVE', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'duos'
        ordering = ['-created_at']

    def __str__(self):
        return f"Duo {self.id} ({self.status})"

    def member_count(self):
        return self.members.count()


class DuoMember(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    duo = models.ForeignKey(Duo, on_delete=models.CASCADE, related_name='members')
    user = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='duo_memberships')
    role = models.CharField(max_length=50, default='MEMBER')
    joined_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'duo_members'
        unique_together = ('duo', 'user')
        ordering = ['joined_at']

    def __str__(self):
        return f"{self.user.name} in Duo {self.duo_id}"

    def clean(self):
        # A duo cannot have more than 2 members
        if self._state.adding and self.duo.members.count() >= 2:
            raise ValidationError("A DUO can only contain exactly two members.")


class ConnectionRequest(models.Model):
    STATUS_CHOICES = [
        ('PENDING', 'Pending'),
        ('ACCEPTED', 'Accepted'),
        ('DECLINED', 'Declined'),
        ('CANCELLED', 'Cancelled'),
    ]

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    sender = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='sent_requests')
    receiver = models.ForeignKey(Profile, on_delete=models.CASCADE, related_name='received_requests')
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='PENDING', db_index=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'connection_requests'
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['sender', 'status']),
            models.Index(fields=['receiver', 'status']),
        ]

    def __str__(self):
        return f"Request from {self.sender.name} to {self.receiver.name} [{self.status}]"

    def clean(self):
        if self.sender == self.receiver:
            raise ValidationError("You cannot send a connection request to yourself.")

    @transaction.atomic
    def accept(self):
        """
        Accepts the connection request:
        1. Checks both users are not in an active DUO
        2. Creates a new Duo
        3. Adds sender & receiver as DuoMembers
        4. Marks this request ACCEPTED and cancels any other pending requests for either user
        """
        if self.status != 'PENDING':
            raise ValidationError(f"Cannot accept request with status '{self.status}'.")

        if self.sender.active_duo is not None:
            raise ValidationError(f"{self.sender.name} is already in an active DUO.")

        if self.receiver.active_duo is not None:
            raise ValidationError("You are already in an active DUO.")

        # Create new DUO
        new_duo = Duo.objects.create(status='ACTIVE')
        DuoMember.objects.create(duo=new_duo, user=self.sender)
        DuoMember.objects.create(duo=new_duo, user=self.receiver)

        self.status = 'ACCEPTED'
        self.save(update_fields=['status', 'updated_at'])

        # Cancel any other pending requests involving either user
        ConnectionRequest.objects.filter(
            models.Q(sender=self.sender) | models.Q(receiver=self.sender) |
            models.Q(sender=self.receiver) | models.Q(receiver=self.receiver),
            status='PENDING'
        ).exclude(id=self.id).update(status='CANCELLED')

        return new_duo

    def decline(self):
        if self.status != 'PENDING':
            raise ValidationError(f"Cannot decline request with status '{self.status}'.")
        self.status = 'DECLINED'
        self.save(update_fields=['status', 'updated_at'])
        return self

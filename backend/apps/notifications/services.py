import logging
from .models import Notification

logger = logging.getLogger(__name__)

def create_notification(recipient, n_type: str, title: str, body: str, reference_id=None):
    """
    Creates a Notification record for recipient and can trigger Supabase Realtime broadcast.
    """
    try:
        notification = Notification.objects.create(
            recipient=recipient,
            type=n_type,
            title=title,
            body=body,
            reference_id=str(reference_id) if reference_id else None
        )
        logger.info(f"Created notification {notification.id} for user {recipient.id}")
        return notification
    except Exception as e:
        logger.exception(f"Error creating notification: {e}")
        return None

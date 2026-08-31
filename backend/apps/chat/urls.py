from django.urls import path
from .views import (
    MessageListCreateView,
    MarkMessagesReadView,
    MessageReactionView,
    MessageUnsendDeleteView,
)

urlpatterns = [
    path('', MessageListCreateView.as_view(), name='messages-list-create'),
    path('mark-read/', MarkMessagesReadView.as_view(), name='messages-mark-read'),
    path('<uuid:pk>/react/', MessageReactionView.as_view(), name='message-react'),
    path('<uuid:pk>/', MessageUnsendDeleteView.as_view(), name='message-unsend-delete'),
]

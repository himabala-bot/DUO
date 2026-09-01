from django.urls import path
from .views import (
    MessageListCreateView,
    MarkMessagesReadView,
    MessageReactionView,
    MessageUnsendDeleteView,
    ClearMessagesView,
    ToggleDisappearingModeView,
    ExpireMessagesView,
)

urlpatterns = [
    path('', MessageListCreateView.as_view(), name='messages-list-create'),
    path('clear/', ClearMessagesView.as_view(), name='messages-clear'),
    path('mark-read/', MarkMessagesReadView.as_view(), name='messages-mark-read'),
    path('disappearing-mode/', ToggleDisappearingModeView.as_view(), name='messages-disappearing-mode'),
    path('expire/', ExpireMessagesView.as_view(), name='messages-expire'),
    path('<uuid:pk>/react/', MessageReactionView.as_view(), name='message-react'),
    path('<uuid:pk>/', MessageUnsendDeleteView.as_view(), name='message-unsend-delete'),
]

from django.urls import path
from .views import (
    DailyQuestionListView,
    DailyResponsesView,
    DailyHistoryView,
    ChangeDailyQuestionView,
)

urlpatterns = [
    path('questions/', DailyQuestionListView.as_view(), name='daily-questions-list'),
    path('questions/<uuid:assignment_id>/change/', ChangeDailyQuestionView.as_view(), name='daily-question-change'),
    path('responses/', DailyResponsesView.as_view(), name='daily-responses'),
    path('history/', DailyHistoryView.as_view(), name='daily-history'),
]


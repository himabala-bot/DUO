from django.urls import path
from .views import DailyQuestionListView, DailyResponsesView, DailyHistoryView

urlpatterns = [
    path('questions/', DailyQuestionListView.as_view(), name='daily-questions-list'),
    path('responses/', DailyResponsesView.as_view(), name='daily-responses'),
    path('history/', DailyHistoryView.as_view(), name='daily-history'),
]

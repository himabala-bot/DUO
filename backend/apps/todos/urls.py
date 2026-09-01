from django.urls import path
from .views import TaskListCreateView, TaskDetailView

urlpatterns = [
    path('', TaskListCreateView.as_view(), name='tasks_list_create'),
    path('<uuid:pk>/', TaskDetailView.as_view(), name='tasks_detail'),
]

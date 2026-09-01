from django.urls import path
from .views import (
    TodoBoardView,
    TodoCategoryDetailView,
    TodoItemCreateView,
    TodoItemDetailView,
)

urlpatterns = [
    path('', TodoBoardView.as_view(), name='todo_board'),
    path('categories/<uuid:pk>/', TodoCategoryDetailView.as_view(), name='todo_category_detail'),
    path('items/', TodoItemCreateView.as_view(), name='todo_item_create'),
    path('items/<uuid:pk>/', TodoItemDetailView.as_view(), name='todo_item_detail'),
]

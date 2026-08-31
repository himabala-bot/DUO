from django.urls import path
from .views import DrawingListCreateView, DrawingDetailView

urlpatterns = [
    path('', DrawingListCreateView.as_view(), name='drawings-list-create'),
    path('<uuid:pk>/', DrawingDetailView.as_view(), name='drawing-detail'),
]

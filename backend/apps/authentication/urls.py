from django.urls import path
from .views import SyncProfileView, ProfileDetailView

urlpatterns = [
    path('sync/', SyncProfileView.as_view(), name='auth-sync'),
    path('profile/', ProfileDetailView.as_view(), name='auth-profile'),
]

from django.urls import path
from .views import (
    CurrentDuoView,
    RegenerateDuoCodeView,
    ConnectByCodeView,
    ConnectionRequestListView,
    AcceptConnectionRequestView,
    DeclineConnectionRequestView,
    CancelConnectionRequestView,
    LeaveDuoView,
    CreatePairingSessionView,
    GetPairingSessionView,
    ClaimPairingSessionView,
    CancelPairingSessionView,
)

urlpatterns = [
    path('', CurrentDuoView.as_view(), name='duo-current'),
    path('regenerate-code/', RegenerateDuoCodeView.as_view(), name='duo-regenerate-code'),
    path('connect/', ConnectByCodeView.as_view(), name='duo-connect'),
    path('requests/', ConnectionRequestListView.as_view(), name='duo-requests-list'),
    path('requests/<uuid:pk>/accept/', AcceptConnectionRequestView.as_view(), name='duo-request-accept'),
    path('requests/<uuid:pk>/decline/', DeclineConnectionRequestView.as_view(), name='duo-request-decline'),
    path('requests/<uuid:pk>/cancel/', CancelConnectionRequestView.as_view(), name='duo-request-cancel'),
    path('leave/', LeaveDuoView.as_view(), name='duo-leave'),
    path('pairing/create/', CreatePairingSessionView.as_view(), name='duo-pairing-create'),
    path('pairing/', GetPairingSessionView.as_view(), name='duo-pairing-get'),
    path('pairing/claim/', ClaimPairingSessionView.as_view(), name='duo-pairing-claim'),
    path('pairing/cancel/', CancelPairingSessionView.as_view(), name='duo-pairing-cancel'),
]

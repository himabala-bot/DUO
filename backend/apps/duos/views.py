import logging
from django.shortcuts import get_object_or_404
from django.db import models
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from apps.core.permissions import HasProfile, HasActiveDuo
from apps.authentication.models import Profile
from apps.notifications.services import create_notification
from .models import Duo, DuoMember, ConnectionRequest, PairingSession
from .serializers import (
    DuoDetailSerializer,
    ConnectionRequestSerializer,
    ConnectByCodeSerializer,
    PairingSessionPublicSerializer,
    ClaimPairingSerializer,
)

logger = logging.getLogger(__name__)

class CurrentDuoView(APIView):
    """
    GET /api/duo/ - Get active DUO details, partner info, and own DUO code.
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def get(self, request):
        profile = request.user.profile
        active_duo = profile.active_duo

        response_data = {
            "has_active_duo": active_duo is not None,
            "duo_code": profile.duo_code,
            "my_profile": {
                "id": str(profile.id),
                "name": profile.name,
                "email": profile.email,
                "avatar_url": profile.avatar_url,
            },
            "duo": None,
            "partner": None,
        }

        if active_duo:
            duo_serializer = DuoDetailSerializer(active_duo, context={'request': request})
            response_data["duo"] = duo_serializer.data
            partner = profile.partner
            if partner:
                response_data["partner"] = {
                    "id": str(partner.id),
                    "name": partner.name,
                    "email": partner.email,
                    "avatar_url": partner.avatar_url,
                }

        return Response(response_data)


class RegenerateDuoCodeView(APIView):
    """
    POST /api/duo/regenerate-code/ - Regenerates a fresh DUO code for the user.
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def post(self, request):
        profile = request.user.profile
        profile.duo_code = profile._generate_unique_code()
        profile.save(update_fields=['duo_code', 'updated_at'])
        return Response({
            "success": True,
            "duo_code": profile.duo_code
        })


class ConnectByCodeView(APIView):
    """
    POST /api/duo/connect/ - Send a connection request using partner's DUO code.
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def post(self, request):
        serializer = ConnectByCodeSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        code = serializer.validated_data['code']
        current_profile = request.user.profile

        # 1. Check if user already has an active DUO
        if current_profile.active_duo is not None:
            return Response(
                {"error": "You already belong to an active DUO relationship."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 2. Find target partner profile
        target_profile = Profile.objects.filter(duo_code=code).first()
        if not target_profile:
            return Response(
                {"error": f"No DUO code matching '{code}' was found. Please check and try again."},
                status=status.HTTP_404_NOT_FOUND
            )

        # 3. Check for self-connection
        if target_profile.id == current_profile.id:
            return Response(
                {"error": "You cannot connect with your own DUO code."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 4. Check if target partner is already in an active DUO
        if target_profile.active_duo is not None:
            return Response(
                {"error": f"{target_profile.name} is already connected in another active DUO."},
                status=status.HTTP_400_BAD_REQUEST
            )

        # 5. Check if a pending request already exists in either direction
        existing_request = ConnectionRequest.objects.filter(
            (models.Q(sender=current_profile, receiver=target_profile) |
             models.Q(sender=target_profile, receiver=current_profile)),
            status='PENDING'
        ).first()

        if existing_request:
            if existing_request.sender_id == current_profile.id:
                return Response(
                    {"error": "You have already sent a pending connection request to this user."},
                    status=status.HTTP_400_BAD_REQUEST
                )
            else:
                # If the other user already sent a request, auto-accept it!
                try:
                    new_duo = existing_request.accept()
                    create_notification(
                        recipient=target_profile,
                        n_type='CONNECTION_ACCEPTED',
                        title='DUO Connected!',
                        body=f"{current_profile.name} connected back with you! Your shared space is ready.",
                        reference_id=str(new_duo.id)
                    )
                    return Response({
                        "success": True,
                        "message": f"Connection completed! You and {target_profile.name} are now in a DUO.",
                        "duo_id": str(new_duo.id)
                    }, status=status.HTTP_200_OK)
                except Exception as e:
                    return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)

        # 6. Create the connection request
        req = ConnectionRequest.objects.create(
            sender=current_profile,
            receiver=target_profile,
            status='PENDING'
        )

        # Create notification for target partner
        create_notification(
            recipient=target_profile,
            n_type='CONNECTION_REQUEST',
            title='New DUO Connection Request',
            body=f"{current_profile.name} wants to join your DUO.",
            reference_id=str(req.id)
        )

        return Response({
            "success": True,
            "message": f"Connection request sent to {target_profile.name}.",
            "request": ConnectionRequestSerializer(req, context={'request': request}).data
        }, status=status.HTTP_201_CREATED)


class ConnectionRequestListView(APIView):
    """
    GET /api/duo/requests/ - List pending incoming and outgoing connection requests.
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def get(self, request):
        profile = request.user.profile
        incoming = ConnectionRequest.objects.filter(receiver=profile, status='PENDING')
        outgoing = ConnectionRequest.objects.filter(sender=profile, status='PENDING')

        incoming_serializer = ConnectionRequestSerializer(incoming, many=True, context={'request': request})
        outgoing_serializer = ConnectionRequestSerializer(outgoing, many=True, context={'request': request})

        return Response({
            "incoming": incoming_serializer.data,
            "outgoing": outgoing_serializer.data,
        })


class AcceptConnectionRequestView(APIView):
    """
    POST /api/duo/requests/<id>/accept/ - Accept a connection request.
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def post(self, request, pk):
        profile = request.user.profile
        conn_req = get_object_or_404(ConnectionRequest, id=pk, receiver=profile)

        if conn_req.status != 'PENDING':
            return Response(
                {"error": f"Request cannot be accepted (current status: {conn_req.status})"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            new_duo = conn_req.accept()

            # Create notification for the sender
            create_notification(
                recipient=conn_req.sender,
                n_type='CONNECTION_ACCEPTED',
                title='DUO Connected!',
                body=f"{profile.name} accepted your connection request! Your private space is ready.",
                reference_id=str(new_duo.id)
            )

            return Response({
                "success": True,
                "message": f"You are now connected with {conn_req.sender.name}!",
                "duo_id": str(new_duo.id)
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class DeclineConnectionRequestView(APIView):
    """
    POST /api/duo/requests/<id>/decline/ - Decline a connection request.
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def post(self, request, pk):
        profile = request.user.profile
        conn_req = get_object_or_404(ConnectionRequest, id=pk, receiver=profile)

        if conn_req.status != 'PENDING':
            return Response(
                {"error": f"Request cannot be declined (current status: {conn_req.status})"},
                status=status.HTTP_400_BAD_REQUEST
            )

        try:
            conn_req.decline()
            return Response({
                "success": True,
                "message": "Connection request declined."
            })
        except Exception as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)


class CancelConnectionRequestView(APIView):
    """
    POST /api/duo/requests/<id>/cancel/ - Cancel an outgoing connection request.
    """
    permission_classes = [permissions.IsAuthenticated, HasProfile]

    def post(self, request, pk):
        profile = request.user.profile
        conn_req = get_object_or_404(ConnectionRequest, id=pk, sender=profile)

        if conn_req.status != 'PENDING':
            return Response(
                {"error": f"Request cannot be cancelled (current status: {conn_req.status})"},
                status=status.HTTP_400_BAD_REQUEST
            )

        conn_req.status = 'CANCELLED'
        conn_req.save(update_fields=['status', 'updated_at'])
        return Response({
            "success": True,
            "message": "Connection request cancelled."
        })


class LeaveDuoView(APIView):
    """
    POST /api/duo/leave/ - Leave/archive active DUO relationship.
    """
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def post(self, request):
        profile = request.user.profile
        duo = profile.active_duo
        if not duo:
            return Response({"error": "No active DUO found."}, status=status.HTTP_400_BAD_REQUEST)

        partner = profile.partner
        duo.status = 'ARCHIVED'
        duo.save(update_fields=['status', 'updated_at'])

        if partner:
            create_notification(
                recipient=partner,
                n_type='MESSAGE',
                title='DUO Disconnected',
                body=f"{profile.name} has disconnected from the DUO.",
                reference_id=str(duo.id)
            )

        return Response({
            "success": True,
            "message": "You have left the DUO."
        })

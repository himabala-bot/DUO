from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from apps.core.permissions import HasActiveDuo
from apps.notifications.services import create_notification
from .models import Note
from .serializers import NoteSerializer, CreateNoteSerializer

class NoteListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def get(self, request):
        duo = request.user.profile.active_duo
        notes = Note.objects.filter(duo=duo).select_related('author')
        serializer = NoteSerializer(notes, many=True, context={'request': request})
        return Response({
            'notes': serializer.data,
            'count': notes.count()
        })

    def post(self, request):
        serializer = CreateNoteSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        profile = request.user.profile
        duo = profile.active_duo

        note = Note.objects.create(
            duo=duo,
            author=profile,
            note_type=serializer.validated_data.get('note_type', 'TEXT'),
            content=serializer.validated_data.get('content', ''),
            media_url=serializer.validated_data.get('media_url', ''),
            color=serializer.validated_data.get('color', '#FAF7F2'),
            is_pinned=serializer.validated_data.get('is_pinned', False),
        )

        partner = profile.partner
        if partner:
            create_notification(
                recipient=partner,
                n_type='MESSAGE',
                title='New Little Note 💌',
                body=f"{profile.name} posted a new {note.get_note_type_display().lower()}.",
                reference_id=str(note.id)
            )

        return Response(
            NoteSerializer(note, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class NoteDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def patch(self, request, pk):
        duo = request.user.profile.active_duo
        note = get_object_or_404(Note, id=pk, duo=duo)

        if 'is_pinned' in request.data:
            note.is_pinned = bool(request.data['is_pinned'])
        if 'content' in request.data:
            note.content = request.data['content']
        if 'color' in request.data:
            note.color = request.data['color']
        if 'media_url' in request.data:
            note.media_url = request.data['media_url']

        note.save()
        return Response(NoteSerializer(note, context={'request': request}).data)

    def delete(self, request, pk):
        duo = request.user.profile.active_duo
        note = get_object_or_404(Note, id=pk, duo=duo)
        note.delete()
        return Response({'success': True, 'message': 'Note deleted.'})

from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.permissions import HasActiveDuo
from apps.notifications.services import create_notification
from .models import Task
from .serializers import TaskSerializer, CreateTaskSerializer, UpdateTaskSerializer

class TaskListCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def get(self, request):
        duo = request.user.profile.active_duo
        tasks = Task.objects.filter(duo=duo).select_related('created_by')
        serializer = TaskSerializer(tasks, many=True, context={'request': request})
        return Response({
            'tasks': serializer.data,
            'count': tasks.count()
        })

    def post(self, request):
        serializer = CreateTaskSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        profile = request.user.profile
        duo = profile.active_duo
        task_status = serializer.validated_data.get('status', 'TODO')
        count = Task.objects.filter(duo=duo, status=task_status).count()

        task = Task.objects.create(
            duo=duo,
            created_by=profile,
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
            status=task_status,
            order=count,
            completed_at=timezone.now() if task_status == 'COMPLETED' else None
        )

        partner = profile.partner
        if partner:
            create_notification(
                recipient=partner,
                n_type='MESSAGE',
                title='New Shared Task 📋',
                body=f"{profile.name} added: \"{task.title}\"",
                reference_id=str(task.id)
            )

        return Response(
            TaskSerializer(task, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class TaskDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def patch(self, request, pk):
        duo = request.user.profile.active_duo
        task = get_object_or_404(Task, id=pk, duo=duo)

        serializer = UpdateTaskSerializer(data=request.data, partial=True)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        data = serializer.validated_data
        if 'title' in data:
            task.title = data['title']
        if 'description' in data:
            task.description = data['description']
        if 'order' in data:
            task.order = data['order']
        if 'status' in data:
            new_status = data['status']
            if new_status == 'COMPLETED' and task.status != 'COMPLETED':
                task.completed_at = timezone.now()
            elif new_status != 'COMPLETED':
                task.completed_at = None
            task.status = new_status

        task.save()
        return Response(TaskSerializer(task, context={'request': request}).data)

    def delete(self, request, pk):
        duo = request.user.profile.active_duo
        task = get_object_or_404(Task, id=pk, duo=duo)
        task.delete()
        return Response({'success': True, 'message': 'Task deleted.'})

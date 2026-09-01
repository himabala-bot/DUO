from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status, permissions
from django.shortcuts import get_object_or_404
from django.utils import timezone
from apps.core.permissions import HasActiveDuo
from apps.notifications.services import create_notification
from .models import TodoCategory, TodoItem
from .serializers import (
    TodoCategorySerializer,
    TodoItemSerializer,
    CreateTodoItemSerializer,
    CreateTodoCategorySerializer,
)

DEFAULT_LISTS = [
    ('Places to go', '📍', '#AECFD0', 0),
    ('Things to eat', '🍜', '#FFD094', 1),
    ('Movies to watch', '🎬', '#F9D4F8', 2),
    ('Things to try', '🛹', '#DDF2B8', 3),
    ('Random stupid ideas', '💡', '#F7E9B2', 4),
]

class TodoBoardView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def get(self, request):
        duo = request.user.profile.active_duo
        categories = TodoCategory.objects.filter(duo=duo).prefetch_related('items__created_by')

        # Auto-seed default categories if empty
        if not categories.exists():
            for title, emoji, color, order in DEFAULT_LISTS:
                TodoCategory.objects.create(
                    duo=duo,
                    title=title,
                    emoji=emoji,
                    color=color,
                    order=order
                )
            categories = TodoCategory.objects.filter(duo=duo).prefetch_related('items__created_by')

        serializer = TodoCategorySerializer(categories, many=True, context={'request': request})
        return Response({'categories': serializer.data})

    def post(self, request):
        serializer = CreateTodoCategorySerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        duo = request.user.profile.active_duo
        count = TodoCategory.objects.filter(duo=duo).count()
        category = TodoCategory.objects.create(
            duo=duo,
            title=serializer.validated_data['title'],
            emoji=serializer.validated_data.get('emoji', '📌'),
            color=serializer.validated_data.get('color', '#FAF7F2'),
            order=count
        )
        return Response(
            TodoCategorySerializer(category, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class TodoCategoryDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def patch(self, request, pk):
        duo = request.user.profile.active_duo
        category = get_object_or_404(TodoCategory, id=pk, duo=duo)

        if 'title' in request.data:
            category.title = request.data['title']
        if 'emoji' in request.data:
            category.emoji = request.data['emoji']
        if 'color' in request.data:
            category.color = request.data['color']
        if 'order' in request.data:
            category.order = int(request.data['order'])

        category.save()
        return Response(TodoCategorySerializer(category, context={'request': request}).data)

    def delete(self, request, pk):
        duo = request.user.profile.active_duo
        category = get_object_or_404(TodoCategory, id=pk, duo=duo)
        category.delete()
        return Response({'success': True, 'message': 'Category deleted.'})


class TodoItemCreateView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def post(self, request):
        serializer = CreateTodoItemSerializer(data=request.data)
        if not serializer.is_valid():
            return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

        profile = request.user.profile
        duo = profile.active_duo
        category = get_object_or_404(
            TodoCategory,
            id=serializer.validated_data['category_id'],
            duo=duo
        )

        count = TodoItem.objects.filter(category=category).count()
        item = TodoItem.objects.create(
            duo=duo,
            category=category,
            created_by=profile,
            title=serializer.validated_data['title'],
            description=serializer.validated_data.get('description', ''),
            order=count
        )

        partner = profile.partner
        if partner:
            create_notification(
                recipient=partner,
                n_type='MESSAGE',
                title=f"New item in {category.title} 📋",
                body=f"{profile.name} added: \"{item.title}\"",
                reference_id=str(item.id)
            )

        return Response(
            TodoItemSerializer(item, context={'request': request}).data,
            status=status.HTTP_201_CREATED
        )


class TodoItemDetailView(APIView):
    permission_classes = [permissions.IsAuthenticated, HasActiveDuo]

    def patch(self, request, pk):
        duo = request.user.profile.active_duo
        item = get_object_or_404(TodoItem, id=pk, duo=duo)

        if 'is_completed' in request.data:
            completed = bool(request.data['is_completed'])
            item.is_completed = completed
            item.completed_at = timezone.now() if completed else None
        if 'title' in request.data:
            item.title = request.data['title']
        if 'description' in request.data:
            item.description = request.data['description']
        if 'category_id' in request.data:
            new_cat = get_object_or_404(TodoCategory, id=request.data['category_id'], duo=duo)
            item.category = new_cat
        if 'order' in request.data:
            item.order = int(request.data['order'])

        item.save()
        return Response(TodoItemSerializer(item, context={'request': request}).data)

    def delete(self, request, pk):
        duo = request.user.profile.active_duo
        item = get_object_or_404(TodoItem, id=pk, duo=duo)
        item.delete()
        return Response({'success': True, 'message': 'Item deleted.'})

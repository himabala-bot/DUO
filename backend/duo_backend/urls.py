from django.contrib import admin
from django.urls import path, include
from django.http import JsonResponse

def health_check(request):
    return JsonResponse({
        'status': 'healthy',
        'service': 'DUO Backend API',
        'version': '1.0.0'
    })

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/health/', health_check, name='health-check'),
    path('api/auth/', include('apps.authentication.urls')),
    path('api/duo/', include('apps.duos.urls')),
    path('api/messages/', include('apps.chat.urls')),
    path('api/drawings/', include('apps.drawings.urls')),
    path('api/daily/', include('apps.daily.urls')),
    path('api/notifications/', include('apps.notifications.urls')),
    path('api/notes/', include('apps.notes.urls')),
    path('api/todos/', include('apps.todos.urls')),
]

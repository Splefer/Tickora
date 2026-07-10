from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('appearances.urls')),
    path('api/', include('events.urls')),
    path('api/', include('authapp.urls')),
]

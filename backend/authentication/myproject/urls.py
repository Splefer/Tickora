"""
URL configuration for myproject project.

The `urlpatterns` list routes URLs to views. For more information please see:
    https://docs.djangoproject.com/en/6.0/topics/http/urls/
Examples:
Function views
    1. Add an import:  from my_app import views
    2. Add a URL to urlpatterns:  path('', views.home, name='home')
Class-based views
    1. Add an import:  from other_app.views import Home
    2. Add a URL to urlpatterns:  path('', Home.as_view(), name='home')
Including another URLconf
    1. Import the include() function: from django.urls import include, path
    2. Add a URL to urlpatterns:  path('blog/', include('blog.urls'))
"""
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    # JSON API — auth (Next.js frontend)
    path("api/auth/", include("authapp.api_urls")),
    # JSON API — payments (Stripe)
    path("api/payments/", include("authapp.payment_urls")),
    # JSON API — performer appearance approval workflow (BKG-2.1)
    path("api/", include("appearances.urls")),
    # HTML template routes
    path("authapp/", include("authapp.urls")),
]

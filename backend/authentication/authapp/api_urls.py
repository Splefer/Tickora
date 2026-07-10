from django.urls import path
from . import api_views

urlpatterns = [
    path("register/", api_views.api_register_view, name="api_register"),
    path("verify/", api_views.api_verify_view, name="api_verify"),
    path("login/", api_views.api_login_view, name="api_login"),
    path("logout/", api_views.api_logout_view, name="api_logout"),
    path("me/", api_views.api_current_user_view, name="api_current_user"),
]
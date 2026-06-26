from django.urls import path
from . import views

urlpatterns = [
    path("create-checkout-session/", views.create_checkout_session_view, name="create-checkout-session"),
    path("verify/", views.verify_payment_view, name="verify-payment"),
    path("webhook/", views.stripe_webhook_view, name="stripe-webhook"),
]

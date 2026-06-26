import stripe
from django.conf import settings
from django.contrib import messages
from django.http import JsonResponse, HttpResponse
from django.shortcuts import render, redirect
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET

from .backend import (
    register,
    verify,
    authenticate_user,
    login_user,
    logout_user,
    get_loggedin_user,
)
from . import payments
from .payments import PaymentError


# ── Stripe payment views ───────────────────────────────────────────────────────

@csrf_exempt
@require_POST
def create_checkout_session_view(request):
    """POST /api/payments/create-checkout-session/

    Body: {"event_id": int, "tickets": [{"type_id": int, "quantity": int}, ...]}
    Returns: {"url", "session_id", "booking_id"}
    """
    import json
    user = get_loggedin_user(request)
    if user is None:
        return JsonResponse({"error": "Not logged in."}, status=401)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    event_id = data.get("event_id")
    tickets = data.get("tickets")
    if event_id is None:
        return JsonResponse({"error": "event_id is required."}, status=400)

    try:
        line_items, total = payments.compute_line_items(event_id, tickets or [])
        booking = payments.create_pending_booking(user, event_id)
        success_url = settings.FRONTEND_URL + "/checkout/success?session_id={CHECKOUT_SESSION_ID}"
        cancel_url = settings.FRONTEND_URL + "/checkout?canceled=1"
        session = payments.create_checkout_session(
            booking, line_items, total, success_url, cancel_url
        )
    except PaymentError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except stripe.error.StripeError as e:
        return JsonResponse({"error": f"Stripe error: {e}"}, status=502)

    return JsonResponse({
        "url": session.url,
        "session_id": session.id,
        "booking_id": booking.booking_id,
    })


@require_GET
def verify_payment_view(request):
    """GET /api/payments/verify/?session_id=cs_test_..."""
    session_id = request.GET.get("session_id")
    if not session_id:
        return JsonResponse({"error": "session_id is required."}, status=400)

    try:
        status, booking_id = payments.mark_paid(session_id)
    except PaymentError as e:
        return JsonResponse({"error": str(e)}, status=400)
    except stripe.error.StripeError as e:
        return JsonResponse({"error": f"Stripe error: {e}"}, status=502)

    return JsonResponse({"status": status, "booking_id": booking_id})


@csrf_exempt
@require_POST
def stripe_webhook_view(request):
    """POST /api/payments/webhook/"""
    payload = request.body
    sig_header = request.META.get("HTTP_STRIPE_SIGNATURE", "")

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except (ValueError, stripe.error.SignatureVerificationError):
        return HttpResponse(status=400)

    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]
        try:
            payments.mark_paid(session["id"])
        except PaymentError:
            pass

    return HttpResponse(status=200)


# ── HTML template views ────────────────────────────────────────────────────────

def register_view(request):
    if request.method == "POST":
        success, result = register(request.POST)
        if success:
            request.session["verify_email"] = result.email
            messages.success(request, "Registration successful. Please check your email for the verification code.")
            return redirect("verify")
        for error in result:
            messages.error(request, error)
    return render(request, "authapp/register.html")


def verify_view(request):
    email = request.session.get("verify_email")
    if request.method == "POST":
        code = request.POST.get("verification_code")
        success, message = verify(email, code)
        if success:
            messages.success(request, message)
            request.session.pop("verify_email", None)
            return redirect("login")
        messages.error(request, message)
    return render(request, "authapp/verify.html", {"email": email})


def login_view(request):
    if request.method == "POST":
        email = request.POST.get("email")
        password = request.POST.get("password")
        success, result = authenticate_user(email, password)
        if success:
            login_user(request, result)
            messages.success(request, "Logged in successfully.")
            return redirect("home")
        messages.error(request, result)
    return render(request, "authapp/login.html")


def logout_view(request):
    logout_user(request)
    messages.success(request, "Logged out successfully.")
    return redirect("login")


def home_view(request):
    user = get_loggedin_user(request)
    if user is None:
        return redirect("login")
    return render(request, "authapp/home.html", {"user": user})

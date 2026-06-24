import json

import stripe
from django.conf import settings
from django.http import JsonResponse, HttpResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_POST, require_GET

from .backend import get_loggedin_user
from . import payments
from .payments import PaymentError


@csrf_exempt
@require_POST
def create_checkout_session_view(request):
    """POST /api/payments/create-checkout-session/

    Body: {"event_id": int, "tickets": [{"type_id": int, "quantity": int}, ...]}
    Returns: {"url", "session_id", "booking_id"}
    """
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
    """GET /api/payments/verify/?session_id=cs_test_...

    Called by the frontend on the success page. Confirms the booking if paid.
    Returns: {"status", "booking_id"}
    """
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
    """POST /api/payments/webhook/

    Stripe calls this directly. Verifies the signature and confirms the
    booking on checkout.session.completed. Optional but more reliable than
    relying on the browser redirect.
    """
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

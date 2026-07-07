"""
EVT-02: customer event booking (browse / detail / search).

A customer can list events, search them, and view one event's details
including its ticket types and prices. Booking itself is handled by the
existing Stripe checkout endpoint (authapp create_checkout_session_view);
the event detail response includes the ticket type ids the customer needs
to start that checkout.

Same plain-Django style as authapp and the events app: function views,
JsonResponse out. These are public browsing endpoints (no login required to
look at what is on sale); the checkout step is where auth kicks in.
"""
from django.http import JsonResponse
from django.views.decorators.http import require_GET

from authapp.models import UpcomingEvents, TicketTypes


def _event_summary(event):
    """Compact shape for list/search results."""
    return {
        "event_id": event.event_id,
        "event_name": event.event_name,
        "event_date": event.event_date.isoformat() if hasattr(event.event_date, "isoformat") else event.event_date,
        "venue": event.venue_id,
        "venue_name": event.venue.venue_name,
    }


def _ticket_type_dict(tt):
    return {
        "type_id": tt.type_id,
        "tier": tt.tier,
        "price": str(tt.price),
    }


@require_GET
def list_events_view(request):
    """GET /api/booking/events/

    Lists active (listed) events for customers to browse.
    Only events with is_active = 1 are shown.
    """
    events = (UpcomingEvents.objects
              .filter(is_active=1)
              .select_related("venue")
              .order_by("event_date"))
    return JsonResponse({"events": [_event_summary(e) for e in events]})


@require_GET
def event_detail_view(request, event_id):
    """GET /api/booking/events/<event_id>/

    Full detail for one event, including its ticket types and prices so the
    customer can choose what to buy. The type_id values here are what the
    checkout endpoint expects.
    """
    try:
        event = UpcomingEvents.objects.select_related("venue").get(
            event_id=event_id, is_active=1
        )
    except UpcomingEvents.DoesNotExist:
        return JsonResponse({"error": "Event not found."}, status=404)

    ticket_types = TicketTypes.objects.filter(event=event).order_by("price")

    return JsonResponse({
        "event_id": event.event_id,
        "event_name": event.event_name,
        "event_date": event.event_date.isoformat() if hasattr(event.event_date, "isoformat") else event.event_date,
        "description": event.description,
        "venue": {
            "venue_id": event.venue.venue_id,
            "venue_name": event.venue.venue_name,
            "venue_address": event.venue.venue_address,
            "province": event.venue.province,
            "capacity": event.venue.capacity,
        },
        "ticket_types": [_ticket_type_dict(tt) for tt in ticket_types],
        # To buy: POST to /api/payments/create-checkout-session/ with this
        # event_id and the chosen ticket type_id(s) and quantities.
        "checkout_endpoint": "/api/payments/create-checkout-session/",
    })


@require_GET
def search_events_view(request):
    """GET /api/booking/search/?q=<term>

    Searches active events by name (case-insensitive, partial match).
    Returns the same compact shape as the list endpoint.
    """
    term = (request.GET.get("q") or "").strip()
    if not term:
        return JsonResponse({"error": "A search term (q) is required."}, status=400)

    events = (UpcomingEvents.objects
              .filter(is_active=1, event_name__icontains=term)
              .select_related("venue")
              .order_by("event_date"))
    return JsonResponse({"events": [_event_summary(e) for e in events]})

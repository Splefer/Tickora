"""
EVT-01: an event organizer creates a new event with a venue, date, and
description, so it can be listed on the platform for ticket sales.

Built in the same plain-Django style as authapp: function views with
@csrf_exempt / @require_POST / @require_GET, session auth via
get_loggedin_user, json.loads on the body, and JsonResponse out.
"""
import json

from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_POST

from authapp.backend import get_loggedin_user
from authapp.models import UpcomingEvents, Venues


def _event_to_dict(event):
    """Shape a single event for JSON responses."""
    return {
        "event_id": event.event_id,
        "event_name": event.event_name,
        "event_date": (event.event_date.isoformat()
                       if hasattr(event.event_date, "isoformat")
                       else event.event_date),
        "description": event.description,
        "venue": event.venue_id,
        "is_active": event.is_active,
        "organizer_id": event.organizer_id,
    }


@csrf_exempt
@require_POST
def create_event_view(request):
    """POST /api/events/create/

    Body: {"event_name", "event_date" (YYYY-MM-DD), "description", "venue"}
    Returns: the created event, or an error.
    Only logged-in organizers may create events.
    """
    user = get_loggedin_user(request)
    if user is None:
        return JsonResponse({"error": "Not logged in."}, status=401)

    # Only organizers can create events (EVT-01 is an organizer action).
    if user.role.role_name != "organizer":
        return JsonResponse({"error": "Only organizers can create events."}, status=403)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    event_name = data.get("event_name")
    event_date = data.get("event_date")
    description = data.get("description")
    venue_id = data.get("venue")

    # EVT-01 requires a venue, a date, and a description.
    missing = [f for f in ("event_name", "event_date", "description", "venue")
               if not data.get(f)]
    if missing:
        return JsonResponse(
            {"error": f"Missing required field(s): {', '.join(missing)}."},
            status=400,
        )

    try:
        venue = Venues.objects.get(venue_id=venue_id)
    except Venues.DoesNotExist:
        return JsonResponse({"error": "Unknown venue."}, status=400)

    event = UpcomingEvents.objects.create(
        event_name=event_name,
        event_date=event_date,
        description=description,
        venue=venue,
        organizer=user,
        is_active=1,  # listed for ticket sales
    )

    return JsonResponse(_event_to_dict(event), status=201)


@require_GET
def my_events_view(request):
    """GET /api/events/mine/

    Returns the logged-in organizer's own events.
    """
    user = get_loggedin_user(request)
    if user is None:
        return JsonResponse({"error": "Not logged in."}, status=401)

    events = UpcomingEvents.objects.filter(organizer=user).order_by("event_date")
    return JsonResponse({"events": [_event_to_dict(e) for e in events]})


@require_GET
def venues_view(request):
    """GET /api/events/venues/

    Lists venues an organizer can pick from when creating an event.
    """
    user = get_loggedin_user(request)
    if user is None:
        return JsonResponse({"error": "Not logged in."}, status=401)

    venues = Venues.objects.all().order_by("venue_name")
    return JsonResponse({"venues": [
        {
            "venue_id": v.venue_id,
            "venue_name": v.venue_name,
            "venue_address": v.venue_address,
            "province": v.province,
            "capacity": v.capacity,
        }
        for v in venues
    ]})

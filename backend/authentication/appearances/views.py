"""
BKG-2.1: Approve Performer Appearance

Built in the same plain-Django style as authapp/events/booking: function
views with @csrf_exempt / @require_GET / @require_POST, session auth via
get_loggedin_user, json.loads on the body, JsonResponse out.

The "manager" of an artist is whichever organizer is linked to that
performer through authapp.PerformerLinks (this is the same relationship the
recently-shipped organizer "Artists" tab / inbox uses). Only that manager
may view or decide on an appearance request for that artist.
"""
import json

from django.http import JsonResponse
from django.utils import timezone
from django.views.decorators.csrf import csrf_exempt
from django.views.decorators.http import require_GET, require_http_methods

from authapp.backend import get_loggedin_user
from authapp.models import EventPerformers, PerformerLinks, Users

from .models import AppearanceRequests
from .notifications import notify_decision

DECISION_STATUSES = {"approved", "declined", "changes_requested"}


def _manager_of(performer_id, manager):
    """True iff `manager` manages the performer with this id."""
    return PerformerLinks.objects.filter(performer_id=performer_id, manager=manager).exists()


def _artist_to_dict(performer):
    pending_count = AppearanceRequests.objects.filter(performer=performer, status="pending").count()
    upcoming_count = AppearanceRequests.objects.filter(
        performer=performer, status="approved", event__event_date__gte=timezone.now().date()
    ).count()
    return {
        "artist_id": performer.user_id,
        "artist_name": f"{performer.forename} {performer.surname}",
        "pending_request_count": pending_count,
        "upcoming_appearance_count": upcoming_count,
    }


def _request_to_dict(req):
    event = req.event
    return {
        "request_id": req.request_id,
        "artist_id": req.performer_id,
        "event_id": event.event_id,
        "event_name": event.event_name,
        "event_date": event.event_date.isoformat() if hasattr(event.event_date, "isoformat") else event.event_date,
        "venue": {
            "venue_name": event.venue.venue_name,
            "venue_address": event.venue.venue_address,
        },
        "requested_by": f"{req.requested_by.forename} {req.requested_by.surname}",
        "fee_offer": float(req.fee_offer) if req.fee_offer is not None else None,
        "notes": req.notes,
        "status": req.status,
        "decline_reason": req.decision_reason,
    }


@require_GET
def managed_artists_view(request):
    """GET /api/organizer/artists

    Every performer managed by the logged-in organizer, with a pending
    request count and an upcoming (approved) appearance count.
    """
    user = get_loggedin_user(request)
    if user is None:
        return JsonResponse({"error": "Not logged in."}, status=401)

    performer_ids = PerformerLinks.objects.filter(manager=user).values_list("performer_id", flat=True)
    performers = Users.objects.filter(user_id__in=performer_ids).order_by("forename", "surname")
    return JsonResponse([_artist_to_dict(p) for p in performers], safe=False)


@require_GET
def artist_requests_view(request, artist_id):
    """GET /api/organizer/artists/<artist_id>/requests

    All appearance requests sent in for one managed artist, newest first.
    """
    user = get_loggedin_user(request)
    if user is None:
        return JsonResponse({"error": "Not logged in."}, status=401)

    if not _manager_of(artist_id, user):
        return JsonResponse({"error": "You do not manage this artist."}, status=403)

    requests_qs = AppearanceRequests.objects.filter(performer_id=artist_id).order_by("-created_at")
    return JsonResponse([_request_to_dict(r) for r in requests_qs], safe=False)


@csrf_exempt
@require_http_methods(["PATCH"])
def respond_request_view(request, request_id):
    """PATCH /api/organizer/requests/<request_id>

    Body: {"status": "approved" | "declined" | "changes_requested", "reason": "..."}
    Only the artist's manager may decide, and only while the request is
    still pending. On approval, the performer is added to the event's
    EventPerformers so the event/schedule reflect the decision.
    """
    user = get_loggedin_user(request)
    if user is None:
        return JsonResponse({"error": "Not logged in."}, status=401)

    try:
        appearance_request = AppearanceRequests.objects.select_related(
            "event", "event__venue", "performer", "requested_by"
        ).get(pk=request_id)
    except AppearanceRequests.DoesNotExist:
        return JsonResponse({"error": "Appearance request not found."}, status=404)

    if not _manager_of(appearance_request.performer_id, user):
        return JsonResponse({"error": "You do not manage this artist."}, status=403)

    if appearance_request.status != "pending":
        return JsonResponse({"error": "This request has already been decided."}, status=400)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    status = data.get("status")
    if status not in DECISION_STATUSES:
        return JsonResponse(
            {"error": f"status must be one of {sorted(DECISION_STATUSES)}."}, status=400
        )

    appearance_request.status = status
    appearance_request.decision_reason = data.get("reason") or None
    appearance_request.decided_by = user
    appearance_request.decided_at = timezone.now()
    appearance_request.save()

    if status == "approved":
        EventPerformers.objects.get_or_create(
            event=appearance_request.event, performer=appearance_request.performer
        )

    notify_decision(appearance_request)

    return JsonResponse(_request_to_dict(appearance_request))


@csrf_exempt
@require_http_methods(["PATCH"])
def resubmit_request_view(request, request_id):
    """PATCH /api/requests/<request_id>/resubmit

    Body: {"fee_offer": ..., "notes": "..."} (both optional)
    Only the requester who originally sent a "changes_requested" request may
    resubmit it. Puts it back to "pending" so the manager can decide again —
    this is the other half of "request changes": without it, a
    changes_requested request could never move again.
    """
    user = get_loggedin_user(request)
    if user is None:
        return JsonResponse({"error": "Not logged in."}, status=401)

    try:
        appearance_request = AppearanceRequests.objects.select_related(
            "event", "event__venue", "performer", "requested_by"
        ).get(pk=request_id)
    except AppearanceRequests.DoesNotExist:
        return JsonResponse({"error": "Appearance request not found."}, status=404)

    if appearance_request.requested_by_id != user.user_id:
        return JsonResponse({"error": "Only the requester can resubmit this request."}, status=403)

    if appearance_request.status != "changes_requested":
        return JsonResponse({"error": "Only a request with changes requested can be resubmitted."}, status=400)

    try:
        data = json.loads(request.body or "{}")
    except json.JSONDecodeError:
        return JsonResponse({"error": "Invalid JSON."}, status=400)

    if "fee_offer" in data:
        appearance_request.fee_offer = data["fee_offer"]
    if "notes" in data:
        appearance_request.notes = data["notes"]

    appearance_request.status = "pending"
    appearance_request.decision_reason = None
    appearance_request.decided_by = None
    appearance_request.decided_at = None
    appearance_request.save()

    return JsonResponse(_request_to_dict(appearance_request))


@require_GET
def performer_appearances_view(request):
    """GET /api/performer/appearances

    The logged-in performer's own appearance requests (their schedule),
    so approved/declined/changes-requested status is visible on their side.
    """
    user = get_loggedin_user(request)
    if user is None:
        return JsonResponse({"error": "Not logged in."}, status=401)

    requests_qs = AppearanceRequests.objects.filter(performer=user).order_by("-event__event_date")
    return JsonResponse([_request_to_dict(r) for r in requests_qs], safe=False)


@require_GET
def event_performers_view(request, event_id):
    """GET /api/events/<event_id>/performers

    The event's approved performer lineup — this is where "approved status
    reflected on relevant events" is actually observable from outside the
    appearance-request itself. Public, same as booking's discovery endpoints.
    """
    performer_ids = EventPerformers.objects.filter(event_id=event_id).values_list("performer_id", flat=True)
    performers = Users.objects.filter(user_id__in=performer_ids).order_by("forename", "surname")
    return JsonResponse({
        "event_id": event_id,
        "performers": [
            {"artist_id": p.user_id, "artist_name": f"{p.forename} {p.surname}"} for p in performers
        ],
    })

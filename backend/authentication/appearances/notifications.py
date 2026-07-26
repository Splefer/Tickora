"""
Notification helpers for the appearance-request decision workflow.

Writes an in-app Notifications row (always) and best-effort emails the user
(same send_mail pattern as authapp.backend.verification_email). Email is
fail_silently=True here on purpose: a decision must not fail to save just
because SMTP is unreachable, this is a convenience notification on top of
the in-app row.
"""
from django.conf import settings
from django.core.mail import send_mail

from .models import Notifications

STATUS_LABELS = {
    "approved": "approved",
    "declined": "declined",
    "changes_requested": "sent back with requested changes",
}


def _notify(user, message, appearance_request):
    Notifications.objects.create(user=user, appearance_request=appearance_request, message=message)
    if user.email:
        try:
            send_mail(
                "Tickora: appearance request update",
                message,
                getattr(settings, "EMAIL_HOST_USER", None),
                [user.email],
                fail_silently=True,
            )
        except Exception:
            # Email is a best-effort convenience on top of the in-app
            # Notifications row above, which has already been saved. A
            # misconfigured/unreachable mail setup must never fail the
            # decision request itself — fail_silently=True only covers
            # errors during the actual send, not e.g. missing settings.
            pass


def notify_decision(appearance_request):
    """Notify the artist and every organizer side of this decision.

    That's the performer, whoever sent the request, and (if different — e.g.
    a booking agency requested on the event owner's behalf) the event's own
    organizer, so "organizers" plural is actually covered rather than just
    whichever single account happened to submit the request.
    """
    label = STATUS_LABELS.get(appearance_request.status, appearance_request.status)
    event_name = appearance_request.event.event_name

    performer_message = f"Your appearance request for '{event_name}' was {label}."
    if appearance_request.decision_reason:
        performer_message += f" Reason: {appearance_request.decision_reason}"
    _notify(appearance_request.performer, performer_message, appearance_request)

    organizer_message = (
        f"The appearance request for '{event_name}' "
        f"({appearance_request.performer.forename} {appearance_request.performer.surname}) was {label}."
    )
    if appearance_request.decision_reason:
        organizer_message += f" Reason: {appearance_request.decision_reason}"

    organizer_recipients = {appearance_request.requested_by_id: appearance_request.requested_by}
    event_organizer = appearance_request.event.organizer
    organizer_recipients.setdefault(event_organizer.user_id, event_organizer)

    for organizer in organizer_recipients.values():
        _notify(organizer, organizer_message, appearance_request)

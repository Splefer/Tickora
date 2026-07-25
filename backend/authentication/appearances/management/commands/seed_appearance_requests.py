"""
Create a demo pending appearance request, for exercising the approve /
decline / request-changes workflow by hand without a frontend that can
create requests yet (that's a separate ticket).

Run:  python manage.py seed_appearance_requests
"""
from django.core.management.base import BaseCommand

from authapp.models import PerformerLinks, UpcomingEvents, Users
from appearances.models import AppearanceRequests


class Command(BaseCommand):
    help = "Create a demo pending AppearanceRequest, linking a performer to a manager if needed."

    def handle(self, *args, **options):
        performers = list(Users.objects.filter(role__role_name="performer").order_by("user_id"))
        organizers = list(Users.objects.filter(role__role_name="organizer").order_by("user_id"))
        events = list(UpcomingEvents.objects.all().order_by("event_id"))

        if not performers or not organizers or not events:
            self.stdout.write(self.style.ERROR(
                "Need at least one performer, one organizer, and one event to seed a request."
            ))
            return

        self.stdout.write("Performers:")
        for p in performers:
            self.stdout.write(f"  {p.user_id}  -  {p.forename} {p.surname}")
        performer_id = int(input("\nPerformer (artist) user_id: ").strip())
        performer = Users.objects.get(user_id=performer_id)

        self.stdout.write("\nOrganizers:")
        for o in organizers:
            self.stdout.write(f"  {o.user_id}  -  {o.forename} {o.surname}")
        manager_id = int(input("\nManager user_id (this artist's manager, approves the request): ").strip())
        manager = Users.objects.get(user_id=manager_id)

        requester_id = input("Requester user_id (who is asking for the artist, blank = same as manager): ").strip()
        requester = Users.objects.get(user_id=int(requester_id)) if requester_id else manager

        PerformerLinks.objects.get_or_create(performer=performer, manager=manager)

        self.stdout.write("\nEvents:")
        for e in events:
            self.stdout.write(f"  {e.event_id}  -  {e.event_name}")
        event_id = int(input("\nEvent id: ").strip())
        event = UpcomingEvents.objects.get(event_id=event_id)

        fee_offer = input("Fee offer (blank = none): ").strip()
        notes = input("Notes (blank = none): ").strip()

        req = AppearanceRequests.objects.create(
            event=event,
            performer=performer,
            requested_by=requester,
            fee_offer=fee_offer or None,
            notes=notes or None,
        )

        self.stdout.write(self.style.SUCCESS(
            f"\nCreated pending appearance request #{req.request_id}: "
            f"{performer.forename} {performer.surname} for '{event.event_name}', "
            f"manager={manager.forename} {manager.surname}."
        ))

"""
Add ticket types to an existing event so it becomes bookable.

Run:  python manage.py seed_tickets

Prompts for an event id, then adds a couple of ticket tiers (GA and VIP) to it.
After running, the event detail endpoint will show these tickets with prices,
and their type_id values are what the checkout endpoint expects.
"""
from django.core.management.base import BaseCommand

from authapp.models import UpcomingEvents, TicketTypes


class Command(BaseCommand):
    help = "Add demo ticket types (GA, VIP) to an event."

    def handle(self, *args, **options):
        events = list(UpcomingEvents.objects.all().order_by("event_id"))
        if not events:
            self.stdout.write(self.style.ERROR("No events exist. Create one first."))
            return

        self.stdout.write("Events:")
        for e in events:
            self.stdout.write(f"  {e.event_id}  -  {e.event_name}")

        raw = input("\nEvent id to add tickets to: ").strip()
        try:
            event = UpcomingEvents.objects.get(event_id=int(raw))
        except (ValueError, UpcomingEvents.DoesNotExist):
            self.stdout.write(self.style.ERROR(f"No event with id {raw}."))
            return

        tiers = [("GA", "50.00"), ("VIP", "120.00")]
        created = []
        for tier, price in tiers:
            tt = TicketTypes.objects.create(tier=tier, price=price, event=event)
            created.append(tt)

        self.stdout.write(self.style.SUCCESS(
            f"\nAdded {len(created)} ticket types to '{event.event_name}':"
        ))
        for tt in created:
            self.stdout.write(f"  type_id={tt.type_id}  {tt.tier}  ${tt.price}")
        self.stdout.write("\nRefresh the event detail endpoint to see them.\n")

"""
Interactive helper to try event creation (with ticket types) by hand.

Run:  python manage.py try_event

Prompts for an organizer, the event details, and one or more ticket types,
then creates the event and its ticket types together and prints the result.
"""
from decimal import Decimal, InvalidOperation

from django.core.management.base import BaseCommand
from django.db import transaction

from authapp.models import Users, Venues, UpcomingEvents, TicketTypes


class Command(BaseCommand):
    help = "Interactively create an event with ticket types and show the result."

    def handle(self, *args, **options):
        self.stdout.write("\n=== Create an event ===\n")

        email = input("Organizer email: ").strip()
        try:
            organizer = Users.objects.get(email=email)
        except Users.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"No user with email {email}."))
            return

        if organizer.role.role_name != "organizer":
            self.stdout.write(self.style.WARNING(
                f"Note: {email} has role '{organizer.role.role_name}', not 'organizer'."
            ))

        venues = list(Venues.objects.all().order_by("venue_name"))
        if not venues:
            self.stdout.write(self.style.ERROR("No venues exist yet. Add a venue first."))
            return
        self.stdout.write("\nAvailable venues:")
        for v in venues:
            self.stdout.write(f"  {v.venue_id}  -  {v.venue_name} ({v.capacity} seats)")

        self.stdout.write("")
        event_name = input("Event name: ").strip()
        event_date = input("Event date (YYYY-MM-DD): ").strip()
        description = input("Description: ").strip()
        venue_id = input("Venue id (from the list above): ").strip()

        if not all([event_name, event_date, description, venue_id]):
            self.stdout.write(self.style.ERROR("All fields are required."))
            return
        try:
            venue = Venues.objects.get(venue_id=venue_id)
        except Venues.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"No venue with id {venue_id}."))
            return

        # Collect ticket types (at least one).
        self.stdout.write("\nNow add ticket types (at least one). Leave the tier")
        self.stdout.write("name blank and press Enter when you are done.\n")
        clean_types = []
        while True:
            tier = input(f"  Ticket tier #{len(clean_types) + 1} name (or blank to finish): ").strip()
            if not tier:
                break
            price_raw = input(f"  Price for {tier}: ").strip()
            try:
                price = Decimal(price_raw)
            except (InvalidOperation, TypeError):
                self.stdout.write(self.style.ERROR("  Invalid price, try again."))
                continue
            if price <= 0:
                self.stdout.write(self.style.ERROR("  Price must be above 0, try again."))
                continue
            clean_types.append((tier, price))

        if not clean_types:
            self.stdout.write(self.style.ERROR("At least one ticket type is required."))
            return

        # All or nothing.
        with transaction.atomic():
            event = UpcomingEvents.objects.create(
                event_name=event_name, event_date=event_date, description=description,
                venue=venue, organizer=organizer, is_active=1,
            )
            created = [
                TicketTypes.objects.create(tier=tier, price=price, event=event)
                for tier, price in clean_types
            ]

        self.stdout.write(self.style.SUCCESS("\nEvent created!\n"))
        self.stdout.write(f"  event_id:    {event.event_id}")
        self.stdout.write(f"  name:        {event.event_name}")
        self.stdout.write(f"  date:        {event.event_date}")
        self.stdout.write(f"  description: {event.description}")
        self.stdout.write(f"  venue:       {venue.venue_name} ({venue.venue_id})")
        self.stdout.write(f"  organizer:   {organizer.forename} {organizer.surname} ({organizer.email})")
        self.stdout.write("  ticket types:")
        for tt in created:
            self.stdout.write(f"     type_id={tt.type_id}  {tt.tier}  ${tt.price}")
        self.stdout.write("")
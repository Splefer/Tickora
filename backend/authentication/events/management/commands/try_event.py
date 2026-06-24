"""
Interactive helper to try EVT-01 by hand.

Run:  python manage.py try_event

It prompts you for an organizer email, then the event details, creates the
event using the same logic as the API, and prints back what was saved. This
talks straight to the database (no HTTP), so it is a quick way to see event
creation work with your own input.
"""
from django.core.management.base import BaseCommand

from authapp.models import Users, Venues, UpcomingEvents


class Command(BaseCommand):
    help = "Interactively create an event (EVT-01) and show the result."

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING("\n=== Create an event (EVT-01) ===\n"))

        # 1. Pick the organizer by email.
        email = input("Organizer email: ").strip()
        try:
            organizer = Users.objects.get(email=email)
        except Users.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"No user with email {email}. Create one first."))
            return

        if organizer.role.role_name != "organizer":
            self.stdout.write(self.style.WARNING(
                f"Note: {email} has role '{organizer.role.role_name}', not 'organizer'. "
                "The API would reject this, but creating directly for the demo."
            ))

        # 2. Show available venues to choose from.
        venues = list(Venues.objects.all().order_by("venue_name"))
        if not venues:
            self.stdout.write(self.style.ERROR("No venues exist yet. Add a venue first."))
            return
        self.stdout.write("\nAvailable venues:")
        for v in venues:
            self.stdout.write(f"  {v.venue_id}  -  {v.venue_name} ({v.capacity} seats)")

        # 3. Collect the event details.
        self.stdout.write("")
        event_name = input("Event name: ").strip()
        event_date = input("Event date (YYYY-MM-DD): ").strip()
        description = input("Description: ").strip()
        venue_id = input("Venue id (from the list above): ").strip()

        # 4. Basic checks, same as the API requires.
        if not all([event_name, event_date, description, venue_id]):
            self.stdout.write(self.style.ERROR("All fields are required."))
            return
        try:
            venue = Venues.objects.get(venue_id=venue_id)
        except Venues.DoesNotExist:
            self.stdout.write(self.style.ERROR(f"No venue with id {venue_id}."))
            return

        # 5. Create it.
        event = UpcomingEvents.objects.create(
            event_name=event_name,
            event_date=event_date,
            description=description,
            venue=venue,
            organizer=organizer,
            is_active=1,
        )

        # 6. Show what was saved.
        self.stdout.write(self.style.SUCCESS("\nEvent created!\n"))
        self.stdout.write(f"  event_id:    {event.event_id}")
        self.stdout.write(f"  name:        {event.event_name}")
        self.stdout.write(f"  date:        {event.event_date}")
        self.stdout.write(f"  description: {event.description}")
        self.stdout.write(f"  venue:       {venue.venue_name} ({venue.venue_id})")
        self.stdout.write(f"  organizer:   {organizer.forename} {organizer.surname} ({organizer.email})")
        self.stdout.write(f"  is_active:   {event.is_active}  (listed for ticket sales)\n")

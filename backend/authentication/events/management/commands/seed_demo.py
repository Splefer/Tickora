from django.core.management.base import BaseCommand
from authapp.models import Roles, Users, Venues


class Command(BaseCommand):
    help = "Seed a demo organizer and venue for local testing."

    def handle(self, *args, **options):
        role, _ = Roles.objects.get_or_create(role_name="organizer")
        user, _ = Users.objects.get_or_create(
            email="des@demo.com",
            defaults=dict(forename="Des", surname="Ryan",
                          pass_field="placeholder", role=role, verified=True),
        )
        venue, _ = Venues.objects.get_or_create(
            venue_id="V001",
            defaults=dict(venue_name="Scotiabank Arena",
                          venue_address="40 Bay St", capacity=19000),
        )
        self.stdout.write(self.style.SUCCESS(
            f"Ready. Organizer email: {user.email}  |  Venue id: {venue.venue_id}"
        ))

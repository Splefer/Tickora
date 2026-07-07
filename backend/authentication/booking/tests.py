"""
Tests for EVT-02 customer browsing (list / detail / search).
Plain-Django style, matching the events app tests.
"""
from django.test import TestCase

from authapp.models import Roles, Users, Venues, UpcomingEvents, TicketTypes


class Evt02Tests(TestCase):
    def setUp(self):
        role = Roles.objects.create(role_name="organizer")
        self.organizer = Users.objects.create(
            forename="Org", surname="Anizer", email="org@x.com",
            pass_field="h", role=role, verified=True,
        )
        self.venue = Venues.objects.create(
            venue_id="V001", venue_name="Hall A",
            venue_address="12 Main", capacity=500,
        )
        # An active (listed) event with two ticket tiers.
        self.concert = UpcomingEvents.objects.create(
            event_name="Summer Concert", event_date="2026-08-15",
            description="A great night", venue=self.venue,
            organizer=self.organizer, is_active=1,
        )
        TicketTypes.objects.create(tier="GA", price="50.00", event=self.concert)
        TicketTypes.objects.create(tier="VIP", price="120.00", event=self.concert)
        # An inactive event that customers should NOT see.
        self.hidden = UpcomingEvents.objects.create(
            event_name="Cancelled Gig", event_date="2026-08-20",
            description="not listed", venue=self.venue,
            organizer=self.organizer, is_active=0,
        )

    def test_list_shows_active_events(self):
        res = self.client.get("/api/booking/events/")
        self.assertEqual(res.status_code, 200)
        names = [e["event_name"] for e in res.json()["events"]]
        self.assertIn("Summer Concert", names)

    def test_list_hides_inactive_events(self):
        res = self.client.get("/api/booking/events/")
        names = [e["event_name"] for e in res.json()["events"]]
        self.assertNotIn("Cancelled Gig", names)

    def test_event_detail_includes_ticket_types(self):
        res = self.client.get(f"/api/booking/events/{self.concert.event_id}/")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["event_name"], "Summer Concert")
        tiers = [t["tier"] for t in body["ticket_types"]]
        self.assertIn("GA", tiers)
        self.assertIn("VIP", tiers)
        # points customers at the existing checkout
        self.assertIn("checkout_endpoint", body)

    def test_detail_404_for_unknown_event(self):
        res = self.client.get("/api/booking/events/99999/")
        self.assertEqual(res.status_code, 404)

    def test_detail_404_for_inactive_event(self):
        res = self.client.get(f"/api/booking/events/{self.hidden.event_id}/")
        self.assertEqual(res.status_code, 404)

    def test_search_finds_by_name(self):
        res = self.client.get("/api/booking/search/?q=summer")
        self.assertEqual(res.status_code, 200)
        names = [e["event_name"] for e in res.json()["events"]]
        self.assertIn("Summer Concert", names)

    def test_search_requires_term(self):
        res = self.client.get("/api/booking/search/")
        self.assertEqual(res.status_code, 400)

    def test_search_excludes_inactive(self):
        res = self.client.get("/api/booking/search/?q=cancelled")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()["events"]), 0)

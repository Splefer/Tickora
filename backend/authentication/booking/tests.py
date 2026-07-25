"""
Tests for EVT-02 customer browsing (list / detail / search).
Plain-Django style, matching the events app tests.
"""
from django.test import TestCase

from authapp.models import Roles, Users, Venues, UpcomingEvents, TicketTypes


class Evt02Tests(TestCase):

    #Creates data values to run tests from
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
    """
    This test creates an active event and then requests the list of events.
    This proves that customers can see lsited events.
    """
    def test_list_shows_active_events(self):
        res = self.client.get("/api/booking/events/")
        self.assertEqual(res.status_code, 200)
        names = [e["event_name"] for e in res.json()["events"]]
        self.assertIn("Summer Concert", names)

    """
    This test creates an inactive event to confim it will not appear on the list.
    This proves that customers can't see unlisted events in the list.
    """
    def test_list_hides_inactive_events(self):
        res = self.client.get("/api/booking/events/")
        names = [e["event_name"] for e in res.json()["events"]]
        self.assertNotIn("Cancelled Gig", names)

    """
    This test requests an event's details and checks if it returns the ticket types
    and provides the checkout_endpoint URL.
    This proves that the page gives the customers all the info required to buy.
    """
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

    """
    This test requests an event id that doesn't exist throwing back error 404.
    This proves that missing events are handled without crashing
    """
    def test_detail_404_for_unknown_event(self):
        res = self.client.get("/api/booking/events/99999/")
        self.assertEqual(res.status_code, 404)

    """
    This test requests an event that exists but is inactive. Returns a 404
    This proves that users can't access unlisted events.
    """
    def test_detail_404_for_inactive_event(self):
        res = self.client.get(f"/api/booking/events/{self.hidden.event_id}/")
        self.assertEqual(res.status_code, 404)

    """
    This test searches for a concert by name and confimrs the result.
    This proves that users can search for events.
    """
    def test_search_finds_by_name(self):
        res = self.client.get("/api/booking/search/?q=summer")
        self.assertEqual(res.status_code, 200)
        names = [e["event_name"] for e in res.json()["events"]]
        self.assertIn("Summer Concert", names)

    """
    This test searches qithout 'q' confirming a 400 error code.
    This shows how an empty search is handled without crashing.
    """
    def test_search_requires_term(self):
        res = self.client.get("/api/booking/search/")
        self.assertEqual(res.status_code, 400)

    """
    This test searches for a term appart of an inactive event and confirms 0 results.
    This proves that users can only search for active events.
    """
    def test_search_excludes_inactive(self):
        res = self.client.get("/api/booking/search/?q=cancelled")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()["events"]), 0)

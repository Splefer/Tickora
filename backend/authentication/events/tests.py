"""
Tests for EVT-01, in the same plain-Django style as authapp/tests.py.
Login is simulated by setting request.session["user_id"], which is exactly
what authapp's login_user does.
"""
from django.test import TestCase, Client

from authapp.models import Roles, Users, Venues, UpcomingEvents


def make_user(email, role):
    return Users.objects.create(
        forename="Test", surname="User", email=email,
        pass_field="hashed", role=role, verified=True,
    )


class Evt01Tests(TestCase):
    def setUp(self):
        self.organizer_role = Roles.objects.create(role_name="organizer")
        self.customer_role = Roles.objects.create(role_name="customer")
        self.alice = make_user("alice@x.com", self.organizer_role)
        self.bob = make_user("bob@x.com", self.organizer_role)
        self.customer = make_user("cust@x.com", self.customer_role)
        self.venue = Venues.objects.create(
            venue_id="V001", venue_name="Hall A",
            venue_address="12 Main", capacity=500,
        )

    def login(self, user):
        # Mirror authapp's login_user: store user_id in the session.
        session = self.client.session
        session["user_id"] = user.user_id
        session.save()

    def test_create_event(self):
        self.login(self.alice)
        res = self.client.post("/api/events/create/", data={
            "event_name": "Spring Showcase",
            "event_date": "2026-09-01",
            "description": "Annual showcase",
            "venue": "V001",
        }, content_type="application/json")
        self.assertEqual(res.status_code, 201)
        body = res.json()
        self.assertEqual(body["event_name"], "Spring Showcase")
        self.assertEqual(body["organizer_id"], self.alice.user_id)
        self.assertEqual(UpcomingEvents.objects.count(), 1)

    def test_missing_description_rejected(self):
        self.login(self.alice)
        res = self.client.post("/api/events/create/", data={
            "event_name": "No desc", "event_date": "2026-09-01", "venue": "V001",
        }, content_type="application/json")
        self.assertEqual(res.status_code, 400)

    def test_requires_login(self):
        res = self.client.post("/api/events/create/", data={
            "event_name": "X", "event_date": "2026-09-01",
            "description": "d", "venue": "V001",
        }, content_type="application/json")
        self.assertEqual(res.status_code, 401)

    def test_only_organizer_can_create(self):
        self.login(self.customer)  # a customer, not an organizer
        res = self.client.post("/api/events/create/", data={
            "event_name": "X", "event_date": "2026-09-01",
            "description": "d", "venue": "V001",
        }, content_type="application/json")
        self.assertEqual(res.status_code, 403)

    def test_organizer_sees_only_own_events(self):
        UpcomingEvents.objects.create(
            event_name="Alice ev", event_date="2026-09-01",
            description="hers", venue=self.venue, organizer=self.alice, is_active=1,
        )
        self.login(self.bob)
        res = self.client.get("/api/events/mine/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(len(res.json()["events"]), 0)

    def test_list_venues(self):
        self.login(self.alice)
        res = self.client.get("/api/events/venues/")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["venues"][0]["venue_id"], "V001")

    def test_invalid_json_rejected(self):
        self.login(self.alice)
        res = self.client.post("/api/events/create/", data="not json",
                               content_type="application/json")
        self.assertEqual(res.status_code, 400)

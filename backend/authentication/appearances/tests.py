"""
Tests for BKG-2.1, in the same plain-Django style as events/tests.py.
Login is simulated by setting request.session["user_id"], mirroring
authapp's login_user.
"""
from django.core import mail
from django.test import Client, TestCase

from authapp.models import EventPerformers, PerformerLinks, Roles, UpcomingEvents, Users, Venues

from .models import AppearanceRequests, Notifications


def make_user(email, role):
    return Users.objects.create(
        forename="Test", surname="User", email=email,
        pass_field="hashed", role=role, verified=True,
    )


class Bkg21Tests(TestCase):
    def setUp(self):
        self.organizer_role = Roles.objects.create(role_name="organizer")
        self.performer_role = Roles.objects.create(role_name="performer")

        self.manager = make_user("manager@x.com", self.organizer_role)
        self.other_organizer = make_user("other@x.com", self.organizer_role)
        self.requester = make_user("promoter@x.com", self.organizer_role)
        self.artist = make_user("artist@x.com", self.performer_role)
        self.unmanaged_artist = make_user("indie@x.com", self.performer_role)

        PerformerLinks.objects.create(performer=self.artist, manager=self.manager)

        self.venue = Venues.objects.create(
            venue_id="V001", venue_name="Hall A", venue_address="12 Main", capacity=500,
        )
        self.event = UpcomingEvents.objects.create(
            event_name="Summer Fest", event_date="2026-09-01",
            description="d", venue=self.venue, organizer=self.requester, is_active=1,
        )

        self.pending_request = AppearanceRequests.objects.create(
            event=self.event, performer=self.artist, requested_by=self.requester,
            fee_offer="500.00", notes="45 min set",
        )

    def login(self, user):
        session = self.client.session
        session["user_id"] = user.user_id
        session.save()

    # -- managed artists -----------------------------------------------------

    def test_managed_artists_lists_only_linked_performers(self):
        self.login(self.manager)
        res = self.client.get("/api/organizer/artists")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["artist_id"], self.artist.user_id)
        self.assertEqual(body[0]["pending_request_count"], 1)

    def test_managed_artists_requires_login(self):
        res = self.client.get("/api/organizer/artists")
        self.assertEqual(res.status_code, 401)

    # -- artist requests ------------------------------------------------------

    def test_artist_requests_visible_to_manager(self):
        self.login(self.manager)
        res = self.client.get(f"/api/organizer/artists/{self.artist.user_id}/requests")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["status"], "pending")
        self.assertEqual(body[0]["requested_by"], "Test User")

    def test_artist_requests_forbidden_for_non_manager(self):
        self.login(self.other_organizer)
        res = self.client.get(f"/api/organizer/artists/{self.artist.user_id}/requests")
        self.assertEqual(res.status_code, 403)

    # -- deciding a request -----------------------------------------------------

    def test_approve_creates_event_performer_and_notifies_both_sides(self):
        self.login(self.manager)
        res = self.client.patch(
            f"/api/organizer/requests/{self.pending_request.request_id}",
            data={"status": "approved"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "approved")

        self.pending_request.refresh_from_db()
        self.assertEqual(self.pending_request.status, "approved")
        self.assertEqual(self.pending_request.decided_by, self.manager)
        self.assertIsNotNone(self.pending_request.decided_at)

        self.assertTrue(
            EventPerformers.objects.filter(event=self.event, performer=self.artist).exists()
        )

        # one in-app notification for the artist, one for the requester
        self.assertEqual(Notifications.objects.filter(appearance_request=self.pending_request).count(), 2)
        self.assertEqual(len(mail.outbox), 2)

    def test_decline_with_reason_does_not_touch_event_performers(self):
        self.login(self.manager)
        res = self.client.patch(
            f"/api/organizer/requests/{self.pending_request.request_id}",
            data={"status": "declined", "reason": "Scheduling conflict"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "declined")
        self.assertEqual(body["decline_reason"], "Scheduling conflict")
        self.assertFalse(
            EventPerformers.objects.filter(event=self.event, performer=self.artist).exists()
        )

    def test_request_changes_status(self):
        self.login(self.manager)
        res = self.client.patch(
            f"/api/organizer/requests/{self.pending_request.request_id}",
            data={"status": "changes_requested", "reason": "Need a later start time"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["status"], "changes_requested")

    def test_only_manager_can_decide(self):
        self.login(self.other_organizer)
        res = self.client.patch(
            f"/api/organizer/requests/{self.pending_request.request_id}",
            data={"status": "approved"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)

    def test_already_decided_request_rejected(self):
        self.login(self.manager)
        self.pending_request.status = "approved"
        self.pending_request.save()
        res = self.client.patch(
            f"/api/organizer/requests/{self.pending_request.request_id}",
            data={"status": "declined"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)

    def test_invalid_status_rejected(self):
        self.login(self.manager)
        res = self.client.patch(
            f"/api/organizer/requests/{self.pending_request.request_id}",
            data={"status": "maybe"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)

    def test_unknown_request_404(self):
        self.login(self.manager)
        res = self.client.patch(
            "/api/organizer/requests/99999",
            data={"status": "approved"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 404)

    # -- performer's own schedule ------------------------------------------------

    def test_performer_sees_own_appearances(self):
        self.login(self.artist)
        res = self.client.get("/api/performer/appearances")
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(len(body), 1)
        self.assertEqual(body[0]["event_name"], "Summer Fest")

    def test_performer_does_not_see_others_appearances(self):
        self.login(self.unmanaged_artist)
        res = self.client.get("/api/performer/appearances")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json(), [])

    # -- event's performer lineup (BKG-2.1: reflected on relevant events) --------

    def test_event_performers_empty_before_approval(self):
        res = self.client.get(f"/api/events/{self.event.event_id}/performers")
        self.assertEqual(res.status_code, 200)
        self.assertEqual(res.json()["performers"], [])

    def test_event_performers_shows_artist_after_approval(self):
        self.login(self.manager)
        self.client.patch(
            f"/api/organizer/requests/{self.pending_request.request_id}",
            data={"status": "approved"},
            content_type="application/json",
        )
        res = self.client.get(f"/api/events/{self.event.event_id}/performers")
        self.assertEqual(res.status_code, 200)
        performers = res.json()["performers"]
        self.assertEqual(len(performers), 1)
        self.assertEqual(performers[0]["artist_id"], self.artist.user_id)

    # -- notifications reach every organizer side, not just the requester --------

    def test_notifies_event_organizer_when_different_from_requester(self):
        # a booking agency (self.requester) sends the request, but the event
        # is actually owned by a different organizer
        event_owner = make_user("owner@x.com", self.organizer_role)
        other_event = UpcomingEvents.objects.create(
            event_name="Owner's Event", event_date="2026-10-01",
            description="d", venue=self.venue, organizer=event_owner, is_active=1,
        )
        req = AppearanceRequests.objects.create(
            event=other_event, performer=self.artist, requested_by=self.requester,
        )
        self.login(self.manager)
        res = self.client.patch(
            f"/api/organizer/requests/{req.request_id}",
            data={"status": "approved"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)

        # performer + requester + distinct event organizer = 3 notified parties
        notified_user_ids = set(
            Notifications.objects.filter(appearance_request=req).values_list("user_id", flat=True)
        )
        self.assertEqual(
            notified_user_ids, {self.artist.user_id, self.requester.user_id, event_owner.user_id}
        )

    # -- resubmitting a changes_requested request ---------------------------------

    def test_resubmit_puts_request_back_to_pending(self):
        self.login(self.manager)
        self.client.patch(
            f"/api/organizer/requests/{self.pending_request.request_id}",
            data={"status": "changes_requested", "reason": "Need a later start time"},
            content_type="application/json",
        )

        self.login(self.requester)
        res = self.client.patch(
            f"/api/requests/{self.pending_request.request_id}/resubmit",
            data={"notes": "Updated: later start time as requested"},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 200)
        body = res.json()
        self.assertEqual(body["status"], "pending")
        self.assertIsNone(body["decline_reason"])
        self.assertEqual(body["notes"], "Updated: later start time as requested")

    def test_resubmit_forbidden_for_non_requester(self):
        self.pending_request.status = "changes_requested"
        self.pending_request.save()
        self.login(self.manager)
        res = self.client.patch(
            f"/api/requests/{self.pending_request.request_id}/resubmit",
            data={},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 403)

    def test_resubmit_rejected_when_not_changes_requested(self):
        self.login(self.requester)
        res = self.client.patch(
            f"/api/requests/{self.pending_request.request_id}/resubmit",
            data={},
            content_type="application/json",
        )
        self.assertEqual(res.status_code, 400)

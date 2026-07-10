"""
BKG-2.1: Approve Performer Appearance

An AppearanceRequest is a performer being asked to appear at an event.
The performer's manager (an organizer linked via authapp.PerformerLinks)
decides on it: approve, decline, or ask for changes. A Notification row is
written for both the artist and the requester whenever that decision lands.
"""
from django.db import models

from authapp.models import UpcomingEvents, Users


class AppearanceRequests(models.Model):
    STATUS_CHOICES = [
        ("pending", "Pending"),
        ("approved", "Approved"),
        ("changes_requested", "Changes requested"),
        ("declined", "Declined"),
    ]

    request_id = models.AutoField(primary_key=True)
    event = models.ForeignKey(UpcomingEvents, models.DO_NOTHING, related_name="appearance_requests")
    performer = models.ForeignKey(Users, models.DO_NOTHING, related_name="appearance_requests")
    requested_by = models.ForeignKey(Users, models.DO_NOTHING, related_name="sent_appearance_requests")

    fee_offer = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)

    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default="pending")
    decision_reason = models.TextField(blank=True, null=True)
    decided_by = models.ForeignKey(
        Users, models.DO_NOTHING, related_name="decided_appearance_requests", blank=True, null=True
    )
    decided_at = models.DateTimeField(blank=True, null=True)

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        managed = True
        db_table = "appearance_requests"

    def __str__(self):
        return f"AppearanceRequest #{self.request_id} ({self.status})"


class Notifications(models.Model):
    notification_id = models.AutoField(primary_key=True)
    user = models.ForeignKey(Users, models.DO_NOTHING, related_name="notifications")
    appearance_request = models.ForeignKey(
        AppearanceRequests, models.DO_NOTHING, related_name="notifications", blank=True, null=True
    )
    message = models.TextField()
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = "notifications"

    def __str__(self):
        return f"Notification #{self.notification_id} -> user {self.user_id}"

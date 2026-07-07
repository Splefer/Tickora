
"""
-------------------------------------------------------
Customer booking routes (browse / detail / search)
-------------------------------------------------------
Maps the customer-facing booking URLs to their views. Plain
Django style, matching authapp. All routes are read-only
browsing; the actual purchase is handled by the existing
checkout endpoint in authapp.

1 - To browse all available events
2 - To look at the specific details of a chosen event
3 - To search for specific events.
-------------------------------------------------------
"""

from django.urls import path

from . import views

urlpatterns = [
    path("booking/events/", views.list_events_view, name="booking-list-events"),
    path("booking/events/<int:event_id>/", views.event_detail_view, name="booking-event-detail"),
    path("booking/search/", views.search_events_view, name="booking-search-events"),
]

"""Customer booking (browse/detail/search) routes, plain-Django style."""
from django.urls import path

from . import views

urlpatterns = [
    path("booking/events/", views.list_events_view, name="booking-list-events"),
    path("booking/events/<int:event_id>/", views.event_detail_view, name="booking-event-detail"),
    path("booking/search/", views.search_events_view, name="booking-search-events"),
]

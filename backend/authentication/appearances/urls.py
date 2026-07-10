from django.urls import path

from . import views

urlpatterns = [
    path("organizer/artists", views.managed_artists_view, name="managed-artists"),
    path("organizer/artists/<int:artist_id>/requests", views.artist_requests_view, name="artist-requests"),
    path("organizer/requests/<int:request_id>", views.respond_request_view, name="respond-request"),
    path("requests/<int:request_id>/resubmit", views.resubmit_request_view, name="resubmit-request"),
    path("performer/appearances", views.performer_appearances_view, name="performer-appearances"),
    path("events/<int:event_id>/performers", views.event_performers_view, name="event-performers"),
]

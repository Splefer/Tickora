"""Explicit URL routes for the events app, matching authapp's style."""
from django.urls import path

from . import views

urlpatterns = [
    path("events/create/", views.create_event_view, name="create-event"),
    path("events/mine/", views.my_events_view, name="my-events"),
    path("events/venues/", views.venues_view, name="event-venues"),
]

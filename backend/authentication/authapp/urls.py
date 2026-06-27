from django.urls import path
from . import views

urlpatterns = [
    path('auth/register/', views.register_view),
    path('auth/login/', views.login_view),
    path('auth/logout/', views.logout_view),

    path('events/', views.events_list_view),
    path('events/create/', views.create_event_view),
    path('events/<int:event_id>/', views.event_detail_view),
    path('events/<int:event_id>/deactivate/', views.deactivate_event_view),

    path('organizer/events/', views.organizer_events_view),
    path('organizer/reports/', views.organizer_reports_view),

    path('bookings/', views.bookings_list_view),
    path('bookings/create/', views.create_booking_view),
    path('bookings/<int:booking_id>/', views.cancel_booking_view),

    path('venues/', views.venues_view),
    path('performer/events/', views.performer_events_view),

    path('payments/checkout/', views.create_checkout_session_view),
    path('payments/verify/', views.verify_payment_view),
    path('payments/webhook/', views.stripe_webhook_view),
]

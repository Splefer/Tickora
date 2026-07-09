from django.db import models


class Roles(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(max_length=63, unique=True)

    class Meta:
        db_table = 'roles'
        managed = False


class Users(models.Model):
    user_id = models.AutoField(primary_key=True)
    surname = models.CharField(max_length=127, blank=True, null=True)
    forename = models.CharField(max_length=127, blank=True, null=True)
    email = models.CharField(max_length=255, unique=True)
    password_hash = models.CharField(max_length=255)
    verified = models.BooleanField(default=False)
    verification_code = models.CharField(max_length=6, blank=True, null=True)
    address = models.CharField(max_length=1000, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    role = models.ForeignKey(Roles, models.DO_NOTHING, db_column='role')

    class Meta:
        db_table = 'users'
        managed = False


class UserTokens(models.Model):
    token = models.CharField(primary_key=True, max_length=64)
    user = models.ForeignKey(Users, models.CASCADE, db_column='user_id')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'user_tokens'
        managed = False


class Venues(models.Model):
    venue_id = models.CharField(primary_key=True, max_length=10)
    venue_name = models.CharField(max_length=255)
    venue_address = models.CharField(max_length=1000)
    province = models.CharField(max_length=2, blank=True, null=True)
    capacity = models.IntegerField()

    class Meta:
        db_table = 'venues'
        managed = False


class UpcomingEvents(models.Model):
    event_id = models.AutoField(primary_key=True)
    event_name = models.CharField(max_length=255)
    event_date = models.DateTimeField()
    is_active = models.BooleanField(default=True)
    cancellation_window_hours = models.IntegerField(default=120)
    description = models.TextField(blank=True, null=True)
    category = models.CharField(max_length=50, blank=True, null=True)
    venue = models.ForeignKey(
        Venues,
        models.DO_NOTHING,
        db_column='venue'
    )
    organizer = models.ForeignKey(
        Users,
        models.DO_NOTHING,
        db_column='organizer_id'
    )

    class Meta:
        db_table = 'upcoming_events'
        managed = False


class PerformerLinks(models.Model):
    link_id = models.AutoField(primary_key=True)
    performer = models.ForeignKey(
        Users,
        models.DO_NOTHING,
        db_column='performer_id'
    )
    manager = models.ForeignKey(
        Users,
        models.DO_NOTHING,
        db_column='manager_id',
        related_name='performer_links_as_manager'
    )
    linked_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'performer_links'
        managed = False
        unique_together = (('performer', 'manager'),)


class EventPerformers(models.Model):
    id = models.AutoField(primary_key=True) # surrogate key for Django only
    event = models.ForeignKey(
        UpcomingEvents,
        models.DO_NOTHING,
        db_column='event_id'
    )
    performer = models.ForeignKey(
        Users,
        models.DO_NOTHING,
        db_column='performer_id'
    )
    status = models.CharField(max_length=20, default='requested')

    class Meta:
        db_table = 'event_performers'
        managed = False
        unique_together = (('event', 'performer'),)

class Bookings(models.Model):
    booking_id = models.AutoField(primary_key=True)
    requested_at = models.DateTimeField(auto_now_add=True)
    attended = models.BooleanField(default=False)
    status = models.CharField(max_length=20, default='pending')
    user = models.ForeignKey(
        Users,
        models.DO_NOTHING,
        db_column='user_id'
    )
    event = models.ForeignKey(
        UpcomingEvents,
        models.DO_NOTHING,
        db_column='event_id'
    )

    class Meta:
        db_table = 'bookings'
        managed = False


class TicketTypes(models.Model):
    type_id = models.AutoField(primary_key=True)
    tier = models.CharField(max_length=20)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    event = models.ForeignKey(
        UpcomingEvents,
        models.DO_NOTHING,
        db_column='event_id'
    )

    class Meta:
        db_table = 'ticket_types'
        managed = False

class Tickets(models.Model):
    id = models.AutoField(primary_key=True) # surrogate key for Django only
    booking = models.ForeignKey(
        Bookings,
        models.DO_NOTHING,
        db_column='booking_id'
    )
    seat_id = models.CharField(max_length=10)
    type = models.ForeignKey(
        TicketTypes,
        models.DO_NOTHING,
        db_column='type_id'
    )

    class Meta:
        db_table = 'tickets'
        managed = False
        unique_together = (('booking', 'seat_id'),)

class Payments(models.Model):
    payment_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey(
        Bookings,
        models.DO_NOTHING,
        db_column='booking_id'
    )
    stripe_session_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_payment_intent = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='cad')
    status = models.CharField(max_length=20, default='pending')
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'payments'
        managed = False
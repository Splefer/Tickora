from django.db import models


class Bookings(models.Model):
    booking_id = models.AutoField(primary_key=True)
    requested_at = models.DateTimeField()
    confirmed = models.IntegerField(blank=True, null=True)
    user = models.ForeignKey('Users', models.DO_NOTHING)
    event = models.ForeignKey('UpcomingEvents', models.DO_NOTHING)

    class Meta:
        managed = True
        db_table = 'bookings'


class EventPerformers(models.Model):
    # The real table has no surrogate id column: its primary key is the
    # (event_id, performer_id) pair. Without this, Django assumes an
    # implicit auto 'id' PK that doesn't exist, and every query 500s.
    pk = models.CompositePrimaryKey('event_id', 'performer_id')
    event = models.ForeignKey('UpcomingEvents', models.DO_NOTHING)
    performer = models.ForeignKey('Users', models.DO_NOTHING)

    class Meta:
        managed = True
        db_table = 'event_performers'


class PerformerLinks(models.Model):
    link_id = models.AutoField(primary_key=True)
    performer = models.ForeignKey('Users', models.DO_NOTHING)
    manager = models.ForeignKey('Users', models.DO_NOTHING, related_name='performerlinks_manager_set')

    class Meta:
        managed = True
        db_table = 'performer_links'
        unique_together = (('performer', 'manager'),)


class Roles(models.Model):
    role_id = models.AutoField(primary_key=True)
    role_name = models.CharField(unique=True, max_length=63)

    class Meta:
        managed = True
        db_table = 'roles'


class TicketTypes(models.Model):
    type_id = models.AutoField(primary_key=True)
    tier = models.CharField(max_length=20)
    price = models.DecimalField(max_digits=8, decimal_places=2)
    event = models.ForeignKey('UpcomingEvents', models.DO_NOTHING)

    class Meta:
        managed = True
        db_table = 'ticket_types'


class Tickets(models.Model):
    booking = models.ForeignKey('Bookings', models.DO_NOTHING)
    seat_id = models.CharField(max_length=10)
    type = models.ForeignKey('TicketTypes', models.DO_NOTHING)

    class Meta:
        managed = True
        db_table = 'tickets'


class Payments(models.Model):
    payment_id = models.AutoField(primary_key=True)
    booking = models.ForeignKey('Bookings', models.DO_NOTHING)
    stripe_session_id = models.CharField(max_length=255, blank=True, null=True)
    stripe_payment_intent = models.CharField(max_length=255, blank=True, null=True)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    currency = models.CharField(max_length=3, default='cad')
    status = models.CharField(max_length=20, default='pending')  # pending | paid | failed
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        managed = True
        db_table = 'payments'


class UpcomingEvents(models.Model):
    event_id = models.AutoField(primary_key=True)
    event_name = models.CharField(max_length=255)
    event_date = models.DateField()
    is_active = models.IntegerField(blank=True, null=True)
    cancellation_window_hours = models.IntegerField(blank=True, null=True)
    description = models.TextField(blank=True, null=True)
    venue = models.ForeignKey('Venues', models.DO_NOTHING, db_column='venue')
    organizer = models.ForeignKey('Users', models.DO_NOTHING)

    class Meta:
        managed = True
        db_table = 'upcoming_events'


class Users(models.Model):
    user_id = models.AutoField(primary_key=True)
    surname = models.CharField(max_length=127)
    forename = models.CharField(max_length=127)
    email = models.CharField(max_length=255, unique=True)
    pass_field = models.CharField(max_length=255, db_column='pass')
    verified = models.BooleanField(default=False)
    verification_code = models.CharField(max_length=6, blank=True, null=True)
    address = models.CharField(max_length=1000, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)
    role = models.ForeignKey('Roles', models.DO_NOTHING, db_column='role')

    class Meta:
        managed = True
        db_table = 'users'


class Venues(models.Model):
    venue_id = models.CharField(primary_key=True, max_length=10)
    venue_name = models.CharField(max_length=255)
    venue_address = models.CharField(max_length=1000)
    province = models.CharField(max_length=2, blank=True, null=True)
    capacity = models.IntegerField()

    class Meta:
        managed = True
        db_table = 'venues'
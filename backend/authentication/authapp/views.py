import json
import secrets
import urllib.parse
from django.conf import settings
from django.http import JsonResponse
from django.views.decorators.csrf import csrf_exempt
from .models import Users, UserTokens, UpcomingEvents, Venues, TicketTypes, Bookings, Tickets, Payments, PerformerLinkRequests
from . import backend as auth_backend


# ── Token helpers ──────────────────────────────────────────────────────────────

def _make_token(user):
    UserTokens.objects.filter(user=user).delete()
    token = secrets.token_hex(32)
    UserTokens.objects.create(token=token, user=user)
    return token

def _get_or_make_token(user):
    obj = UserTokens.objects.filter(user=user).first()
    return obj.token if obj else _make_token(user)

def get_authenticated_user(request):
    auth = request.headers.get('Authorization', '')
    if not auth.startswith('Token '):
        return None
    key = auth[6:].strip()
    try:
        return UserTokens.objects.select_related('user__role').get(token=key).user
    except UserTokens.DoesNotExist:
        return None


# ── Serialisers ────────────────────────────────────────────────────────────────

def _ser_user(user):
    return {
        'user_id': user.user_id,
        'forename': user.forename or '',
        'surname': user.surname or '',
        'email': user.email,
        'verified': user.verified,
        'created_at': user.created_at.isoformat() if user.created_at else None,
        'role': user.role.role_name,
    }

def _ser_venue(venue):
    return {
        'venue_id': venue.venue_id,
        'venue_name': venue.venue_name,
        'venue_address': venue.venue_address,
        'province': venue.province,
        'capacity': venue.capacity,
    }

def _ser_ticket_type(tt):
    return {
        'type_id': tt.type_id,
        'tier': tt.tier,
        'price': float(tt.price),
        'event_id': tt.event_id,
    }

def _ser_event(event, include_ticket_types=True):
    data = {
        'event_id': event.event_id,
        'event_name': event.event_name,
        'event_date': event.event_date.isoformat(),
        'is_active': event.is_active,
        'cancellation_window_hours': event.cancellation_window_hours,
        'description': event.description,
        'category': event.category,
        'organizer_id': event.organizer_id,
        'organizer_name': f"{event.organizer.forename} {event.organizer.surname}".strip()
            if hasattr(event, 'organizer') and event.organizer_id else None,
        'venue': _ser_venue(event.venue),
    }
    if include_ticket_types:
        data['ticket_types'] = [
            _ser_ticket_type(tt)
            for tt in TicketTypes.objects.filter(event=event)
        ]
    return data

def _ser_booking(booking):
    tickets = Tickets.objects.select_related('type').filter(booking=booking)
    return {
        'booking_id': booking.booking_id,
        'requested_at': booking.requested_at.isoformat(),
        'confirmed': 1 if booking.status == 'confirmed' else 0,
        'user_id': booking.user_id,
        'event': _ser_event(booking.event),
        'tickets': [
            {'seat_id': t.seat_id, 'type': _ser_ticket_type(t.type)}
            for t in tickets
        ],
    }

def _ser_manager_request(request):
    performer = request.performer

    return {
        'request_id': request.request_id,
        'status': request.status,
        'requested_at': request.requested_at.isoformat(),
        'performer': {
            'user_id': performer.user_id,
            'forename': performer.forename,
            'surname': performer.surname,
            'email': performer.email
        }
    }

def _ser_performer(performer):
    return {
        'user_id': performer.user_id,
        'forename': performer.forename,
        'surname': performer.surname,
        'email': performer.email,
    }

# ── Auth views ─────────────────────────────────────────────────────────────────

@csrf_exempt
def register_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    body = json.loads(request.body)
    data = {
        'forename': body.get('forename'),
        'surname': body.get('surname'),
        'email': body.get('email'),
        'role': body.get('role', 'customer'),
        'password_hash': body.get('pass_field') or body.get('password'),
        'address': body.get('address'),
    }
    errors = auth_backend.validate_reg(data)
    if errors:
        return JsonResponse({'errors': errors}, status=400)
    user = auth_backend.create_user(data)
    if user is None:
        return JsonResponse({'errors': ['Invalid role']}, status=400)
    user.verified = True
    user.verification_code = None
    user.save()
    user.refresh_from_db()
    token = _make_token(user)
    return JsonResponse({'token': token, 'user': _ser_user(user)}, status=201)


@csrf_exempt
def login_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    body = json.loads(request.body)
    ok, result = auth_backend.authenticate_user(body.get('email', ''), body.get('password', ''))
    if not ok:
        return JsonResponse({'errors': [result]}, status=401)
    user = result
    token = _get_or_make_token(user)
    return JsonResponse({'token': token, 'user': _ser_user(user)})


@csrf_exempt
def logout_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user:
        UserTokens.objects.filter(user=user).delete()
    return JsonResponse({'message': 'Logged out'})

@csrf_exempt
def update_email_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    body = json.loads(request.body)
    ok, result = auth_backend.update_email(user, body.get('password'),body.get('email'))
    if not ok:
        return JsonResponse({'errors': [result]},status=400)

    return JsonResponse({'message': result, 'user': _ser_user(user)})

@csrf_exempt
def change_password_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    body = json.loads(request.body)
    ok, result = auth_backend.change_password(user, body.get('current_password'), body.get('new_password'))
    if not ok:
        return JsonResponse({'errors': [result]}, status=400)

    return JsonResponse({'message': result})

@csrf_exempt
def update_forename_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    body = json.loads(request.body)
    ok, result = auth_backend.update_forename(user, body.get('forename'))
    if not ok:
        return JsonResponse({'errors': [result]},status=400)

    return JsonResponse({'message': 'First name updated.','user': _ser_user(result)})

@csrf_exempt
def update_surname_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    body = json.loads(request.body)
    ok, result = auth_backend.update_surname(user, body.get('surname'))
    if not ok:
        return JsonResponse({'errors': [result]}, status=400)

    return JsonResponse({'message': 'Last name updated.', 'user': _ser_user(result) })

@csrf_exempt
def update_address_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    body = json.loads(request.body)
    ok, result = auth_backend.update_address(user, body.get('address'))
    if not ok:
        return JsonResponse({'errors': [result]},status=400)

    return JsonResponse({'message': 'Address updated.', 'user': _ser_user(result)})

@csrf_exempt
def request_manager_link_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    performer = get_authenticated_user(request)
    if performer is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    body = json.loads(request.body)
    manager_id = body.get('manager_id')
    if manager_id is None:
        return JsonResponse({'errors': ['manager_id is required']}, status=400)
    try:
        manager = Users.objects.select_related('role').get(user_id=manager_id)
    except Users.DoesNotExist:
        return JsonResponse({'errors': ['Manager not found']}, status=404)
    ok, result = auth_backend.request_manager_link(performer, manager)
    if not ok:
        return JsonResponse({'errors': [result]}, status=400)
    return JsonResponse({'message': 'Request submitted.' }, status=201)

@csrf_exempt
def pending_manager_requests_view(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    manager = get_authenticated_user(request)
    if manager is None:
        return JsonResponse( {'error': 'Authentication required'}, status=401)
    requests = auth_backend.get_pending_manager_requests(manager)
    return JsonResponse({'requests': [ _ser_manager_request(r) for r in requests]})

@csrf_exempt
def approve_manager_request_view(request, request_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    manager = get_authenticated_user(request)
    if manager is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    ok, result = auth_backend.approve_manager_request(manager, request_id)
    if not ok:
        return JsonResponse({'errors': [result]}, status=400)
    return JsonResponse({'message': result})

@csrf_exempt
def deny_manager_request_view(request, request_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    manager = get_authenticated_user(request)
    if manager is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    ok, result = auth_backend.deny_manager_request(manager, request_id)
    if not ok:
        return JsonResponse({'errors': [result]}, status=400)
    return JsonResponse({'message': result})

@csrf_exempt
def performer_manager_view(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    performer = get_authenticated_user(request)
    if performer is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    manager = auth_backend.get_manager(performer)
    if manager is None:
        return JsonResponse({'manager': None})
    return JsonResponse({
        'manager': {
            'user_id': manager.user_id,
            'forename': manager.forename,
            'surname': manager.surname,
            'email': manager.email
        }
    })

@csrf_exempt
def linked_performers_view(request):
    if request.method != 'GET':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    manager = get_authenticated_user(request)
    if manager is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    performers = auth_backend.get_linked_performers(manager)

    return JsonResponse({'performers': [_ser_performer(p) for p in performers]})

# ── Events views ───────────────────────────────────────────────────────────────

def events_list_view(request):
    qs = UpcomingEvents.objects.select_related('venue', 'organizer__role').filter(is_active=True)
    category = request.GET.get('category')
    search = request.GET.get('search')
    if category:
        qs = qs.filter(category=category)
    if search:
        qs = qs.filter(event_name__icontains=search)
    return JsonResponse([_ser_event(e) for e in qs], safe=False)


def event_detail_view(request, event_id):
    try:
        event = UpcomingEvents.objects.select_related('venue', 'organizer__role').get(event_id=event_id)
    except UpcomingEvents.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    return JsonResponse(_ser_event(event))


@csrf_exempt
def create_event_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    if user.role.role_name != 'organizer':
        return JsonResponse({'error': 'Only organizers can create events'}, status=403)
    body = json.loads(request.body)

    venue_name = body.get('venue_name', '').strip()
    if not venue_name:
        return JsonResponse({'errors': ['Venue name is required']}, status=400)

    venue = Venues.objects.filter(venue_name=venue_name).first()
    if venue is None:
        venue_id = venue_name.lower().replace(' ', '-')[:10]
        if Venues.objects.filter(venue_id=venue_id).exists():
            venue_id = venue_id[:7] + secrets.token_hex(1)
        venue = Venues.objects.create(
            venue_id=venue_id,
            venue_name=venue_name,
            venue_address='',
            province='ON',
            capacity=1000,
        )

    event = UpcomingEvents.objects.create(
        event_name=body.get('event_name', ''),
        event_date=body.get('event_date'),
        description=body.get('description', ''),
        category=body.get('category', ''),
        venue=venue,
        organizer=user,
    )
    price = float(body.get('price', 0))
    TicketTypes.objects.create(tier='General', price=price, event=event)
    event.refresh_from_db()
    return JsonResponse(_ser_event(event), status=201)


@csrf_exempt
def deactivate_event_view(request, event_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    try:
        event = UpcomingEvents.objects.get(event_id=event_id, organizer=user)
    except UpcomingEvents.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    event.is_active = False
    event.save()
    return JsonResponse({'message': 'Event deactivated'})


def organizer_events_view(request):
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    qs = UpcomingEvents.objects.select_related('venue', 'organizer__role').filter(organizer=user)
    return JsonResponse([_ser_event(e) for e in qs], safe=False)


def organizer_reports_view(request):
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    qs = UpcomingEvents.objects.filter(organizer=user)
    reports = []
    for event in qs:
        tickets_sold = Tickets.objects.filter(booking__event=event).count()
        revenue = sum(
            float(t.type.price)
            for t in Tickets.objects.select_related('type').filter(booking__event=event)
        )
        try:
            capacity = event.venue.capacity
        except Exception:
            capacity = 0
        reports.append({
            'event_id': event.event_id,
            'event_name': event.event_name,
            'event_date': event.event_date.isoformat(),
            'tickets_sold': tickets_sold,
            'capacity': capacity,
            'revenue': revenue,
        })
    return JsonResponse(reports, safe=False)


def venues_view(request):
    venues = Venues.objects.all()
    return JsonResponse([_ser_venue(v) for v in venues], safe=False)


# ── Bookings views ─────────────────────────────────────────────────────────────

def bookings_list_view(request):
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    qs = Bookings.objects.select_related('event__venue', 'event__organizer__role').filter(user=user)
    return JsonResponse([_ser_booking(b) for b in qs], safe=False)


@csrf_exempt
def create_booking_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    body = json.loads(request.body)
    event_id = body.get('event_id')
    tickets_data = body.get('tickets', [])
    try:
        event = UpcomingEvents.objects.select_related('venue', 'organizer__role').get(
            event_id=event_id, is_active=True
        )
    except UpcomingEvents.DoesNotExist:
        return JsonResponse({'error': 'Event not found'}, status=404)
    booking = Bookings.objects.create(user=user, event=event, status='confirmed')
    created_tickets = []
    for t in tickets_data:
        try:
            tt = TicketTypes.objects.get(type_id=t.get('type_id'), event=event)
        except TicketTypes.DoesNotExist:
            continue
        for i in range(int(t.get('quantity', 1))):
            seat_id = f"S{booking.booking_id}{tt.type_id}{i+1:02d}"[:10]
            ticket = Tickets.objects.create(booking=booking, seat_id=seat_id, type=tt)
            created_tickets.append({'seat_id': ticket.seat_id, 'type': _ser_ticket_type(tt)})
    return JsonResponse({
        'booking_id': booking.booking_id,
        'requested_at': booking.requested_at.isoformat(),
        'confirmed': 1,
        'user_id': user.user_id,
        'event': _ser_event(event),
        'tickets': created_tickets,
    }, status=201)


@csrf_exempt
def cancel_booking_view(request, booking_id):
    if request.method != 'DELETE':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    try:
        booking = Bookings.objects.get(booking_id=booking_id, user=user)
    except Bookings.DoesNotExist:
        return JsonResponse({'error': 'Booking not found'}, status=404)
    Tickets.objects.filter(booking=booking).delete()
    booking.delete()
    return JsonResponse({'message': 'Booking cancelled'})


def performer_events_view(request):
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)
    from .models import EventPerformers
    event_ids = EventPerformers.objects.filter(performer=user).values_list('event_id', flat=True)
    qs = UpcomingEvents.objects.select_related('venue', 'organizer__role').filter(event_id__in=event_ids)
    return JsonResponse([_ser_event(e) for e in qs], safe=False)


# ── Payments views ─────────────────────────────────────────────────────────────

@csrf_exempt
def create_checkout_session_view(request):
    if request.method != 'POST':
        return JsonResponse({'error': 'Method not allowed'}, status=405)
    user = get_authenticated_user(request)
    if user is None:
        return JsonResponse({'error': 'Authentication required'}, status=401)

    body = json.loads(request.body)
    event_id = body.get('event_id')
    tickets_data = body.get('tickets', [])
    event_name = body.get('event_name', '')

    from . import payments as pay

    try:
        line_items, total = pay.compute_line_items(event_id, tickets_data)
    except pay.PaymentError as e:
        return JsonResponse({'error': str(e)}, status=400)

    booking = Bookings.objects.create(user=user, event_id=event_id, status='pending')

    for t in tickets_data:
        try:
            tt = TicketTypes.objects.get(type_id=t.get('type_id'), event_id=event_id)
        except TicketTypes.DoesNotExist:
            continue
        for i in range(int(t.get('quantity', 1))):
            seat_id = f"S{booking.booking_id}{tt.type_id}{i+1:02d}"[:10]
            Tickets.objects.create(booking=booking, seat_id=seat_id, type=tt)

    frontend_url = settings.FRONTEND_URL.rstrip('/')
    encoded_name = urllib.parse.quote(event_name)
    try:
        session = pay.create_checkout_session(
            booking,
            line_items,
            total,
            success_url=f"{frontend_url}/checkout?session_id={{CHECKOUT_SESSION_ID}}&event_name={encoded_name}",
            cancel_url=f"{frontend_url}/events/{event_id}",
        )
    except Exception as e:
        Tickets.objects.filter(booking=booking).delete()
        booking.delete()
        return JsonResponse({'error': str(e)}, status=500)

    return JsonResponse({'checkout_url': session.url})


def verify_payment_view(request):
    session_id = request.GET.get('session_id')
    if not session_id:
        return JsonResponse({'error': 'session_id required'}, status=400)
    from . import payments as pay
    try:
        status, booking_id = pay.mark_paid(session_id)
        return JsonResponse({'status': status, 'booking_id': booking_id})
    except pay.PaymentError as e:
        return JsonResponse({'error': str(e)}, status=400)


@csrf_exempt
def stripe_webhook_view(request):
    import stripe
    payload = request.body
    sig_header = request.META.get('HTTP_STRIPE_SIGNATURE', '')
    try:
        event = stripe.Webhook.construct_event(payload, sig_header, settings.STRIPE_WEBHOOK_SECRET)
    except stripe.errors.SignatureVerificationError:
        return JsonResponse({'error': 'Invalid signature'}, status=400)

    if event['type'] == 'checkout.session.completed':
        session_id = event['data']['object']['id']
        from . import payments as pay
        try:
            pay.mark_paid(session_id)
        except pay.PaymentError:
            pass

    return JsonResponse({'received': True})

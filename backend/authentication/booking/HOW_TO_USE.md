# How to use the booking app (EVT-02)

This app is the customer-facing side of event booking. A customer can browse
listed events, view one event's details with its ticket types and prices, and
search for events. The actual purchase (payment) is handled by the existing
Stripe checkout endpoint in `authapp`; this app points the customer at it and
does not duplicate any payment logic.

Built in plain Django (no DRF), matching authapp and the events app.

---

## 1. What this app does (and does not do)

Does:
- List active events for customers to browse.
- Show one event's full details, including its ticket types and prices.
- Search active events by name.

Does NOT (this is the payment stripe code):
- Take payment, create bookings, or talk to Stripe. The event detail response
  hands the frontend everything it needs to start checkout: the ticket
  `type_id`s and the `checkout_endpoint` URL.

So the split is: this app owns discovery (browse / detail / search); the
payments app owns the transaction.

---

## 2. One-time setup

### a. Put the app in place

The `booking` folder lives inside `authentication/`, next to `authapp` and
`events`:

```
backend/authentication/
  authapp/
  events/
  booking/       <- this app
  myproject/
  manage.py
```

### b. Register the app

In `myproject/settings.py`, add `"booking"` to INSTALLED_APPS:

```python
INSTALLED_APPS = [
    # ... existing apps, including authapp and events ...
    "booking",
]
```

### c. Include the routes

In `myproject/urls.py`:

```python
urlpatterns = [
    # ... existing routes ...
    path("api/", include("booking.urls")),
]
```

### d. No migrations needed

This app has no models of its own (it reads authapp's UpcomingEvents, Venues,
and TicketTypes), so there is nothing to migrate.

---

## 3. The API

These browsing endpoints are public: no login is needed to look at what is on
sale. Login/auth only kicks in at the checkout step, which is the payments
app's responsibility.

| Method | Path | Purpose |
| --- | --- | --- |
| GET | `/api/booking/events/` | list active events |
| GET | `/api/booking/events/<event_id>/` | one event's details + ticket types |
| GET | `/api/booking/search/?q=<term>` | search active events by name |

### List events

```
GET /api/booking/events/
```

Returns `{"events": [...]}`, each with event_id, name, date, venue id, and
venue name. Only events with `is_active = 1` are shown.

### Event detail

```
GET /api/booking/events/1/
```

Returns the event, its venue, and its `ticket_types` (each with type_id, tier,
and price), plus a `checkout_endpoint` field. Example:

```json
{
  "event_id": 1,
  "event_name": "Circus Maximus",
  "event_date": "2026-07-17",
  "description": "Travis Scott concert",
  "venue": {
    "venue_id": "V001",
    "venue_name": "Scotiabank Arena",
    "venue_address": "40 Bay St",
    "province": null,
    "capacity": 19000
  },
  "ticket_types": [
    {"type_id": 1, "tier": "GA", "price": "50.00"},
    {"type_id": 2, "tier": "VIP", "price": "120.00"}
  ],
  "checkout_endpoint": "/api/payments/create-checkout-session/"
}
```

Returns `404` if the event does not exist or is not active.

### Search

```
GET /api/booking/search/?q=circus
```

Case-insensitive partial match on event name, active events only. Returns the
same compact shape as the list. Returns `400` if `q` is missing.

---

## 4. How this connects to payment

The purchase is a handoff. This app gets the customer to the point of choosing
tickets; the payments app finishes the sale:

1. Customer browses (`/api/booking/events/`).
2. Customer opens an event and sees its ticket types (`/api/booking/events/1/`).
3. Customer picks tickets. The frontend calls the existing
   `POST /api/payments/create-checkout-session/` (authapp) with the event_id
   and the chosen ticket type_id(s) and quantities, for example:
   `{"event_id": 1, "tickets": [{"type_id": 1, "quantity": 2}]}`.
4. That endpoint recomputes the price from the database, creates a Stripe
   checkout session, and returns a `url`.
5. The frontend redirects the customer to that Stripe `url` to pay.

Steps 3-5 are the stripe payments code job. This app's job ends at step 2, by
handing over the correct ticket `type_id`s.

---

## 5. Running the tests

```bash
python manage.py test booking
```

Eight tests cover: listing active events, hiding inactive events, event detail
with ticket types, 404 for an unknown event, 404 for an inactive event, search
by name, search requiring a term, and search excluding inactive events. You
should see `OK`.

---

## 6. Seeing it work by hand

With the server running (`python manage.py runserver`), open these in a
browser. They return JSON.

- `http://127.0.0.1:8000/api/booking/events/` — the event list
- `http://127.0.0.1:8000/api/booking/events/1/` — one event's detail
- `http://127.0.0.1:8000/api/booking/search/?q=circus` — a search

If the list is empty, there are simply no active events in the database yet.
Events (and their ticket types) are created through the events app. To show
prices on the detail page, the event needs ticket types; those are created when
an organizer makes the event (events app) or, for an existing event, with the
`seed_tickets` helper command in this app:

```bash
python manage.py seed_tickets
```

That lists events and adds demo GA/VIP ticket types to the one you pick, so the
detail endpoint shows tickets with prices.

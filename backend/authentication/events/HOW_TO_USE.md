# How to use the events app (EVT-01)

This app lets an event organizer create a new event with a venue, date, and
description, so it can be listed on the platform for ticket sales. It is built
in plain Django (no DRF) and uses the existing session login from `authapp`.

---

## 1. What this app does

- An organizer creates an event (name, date, description, venue).
- The event is saved as "active", meaning it is listed for ticket sales.
- An organizer can list their own events.
- An organizer can list the venues they can pick from.

It has no models of its own. It reuses `authapp`'s `UpcomingEvents` and
`Venues` tables.

---

## 2. One-time setup

These steps assume the project already runs (you can start the server and the
`authapp` endpoints work).

### a. Put the app in place

The `events` folder lives inside `authentication/`, next to `authapp`:

```
backend/authentication/
  authapp/
  events/        <- this app
  myproject/
  manage.py
```

### b. Register the app

In `myproject/settings.py`, add `"events"` to `INSTALLED_APPS`. You do NOT need
`rest_framework`:

```python
INSTALLED_APPS = [
    # ... existing apps, including authapp ...
    "events",
]
```

### c. Add the routes

In `myproject/urls.py`, include the events URLs:

```python
from django.urls import include, path

urlpatterns = [
    # ... existing routes ...
    path("api/", include("events.urls")),
]
```

### d. No migrations needed

This app defines no models, so there is nothing to migrate.

---

## 3. The API

All endpoints need a logged-in user (the same session cookie `authapp` uses).
From the frontend, `fetch` calls must send `credentials: "include"`.

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| POST | `/api/events/create/` | organizer | create an event |
| GET | `/api/events/mine/` | organizer | list your own events |
| GET | `/api/events/venues/` | any logged-in user | list venues to pick from |

### Create an event

```
POST /api/events/create/
Content-Type: application/json
(session cookie identifies the organizer)

{
  "event_name": "Spring Showcase",
  "event_date": "2026-09-01",
  "description": "Annual showcase event",
  "venue": "V001",
  "ticket_types": [
    {"tier": "GA", "price": "50.00"},
    {"tier": "VIP", "price": "120.00"}
  ]
}
```

`event_date` is `YYYY-MM-DD`. `venue` is an existing venue id (a short string
code like `V001`). Use `GET /api/events/venues/` to see valid ids.

`ticket_types` is required: an organizer must include at least one ticket type
when creating an event. Each needs a `tier` name (max 20 chars) and a `price`
above 0. The event and its ticket types are created together, all or nothing,
so if any ticket type is invalid, nothing is created.

Success returns `201` and the created event with its ticket types:

```json
{
  "event_id": 12,
  "event_name": "Spring Showcase",
  "event_date": "2026-09-01",
  "description": "Annual showcase event",
  "venue": "V001",
  "is_active": 1,
  "organizer_id": 4,
  "ticket_types": [
    {"type_id": 3, "tier": "GA", "price": "50.00"},
    {"type_id": 4, "tier": "VIP", "price": "120.00"}
  ]
}
```

The `type_id` values are what the customer booking flow and the checkout
endpoint use to identify a chosen ticket.

Possible errors:

- `401` not logged in.
- `403` logged in, but not an organizer.
- `400` a required field is missing, no ticket types were given, a ticket price
  is missing or not above 0, the JSON is invalid, or the venue id is unknown.

### List your events

```
GET /api/events/mine/
```

Returns `{"events": [ ... ]}` containing only the logged-in organizer's events.

### List venues

```
GET /api/events/venues/
```

Returns `{"venues": [ ... ]}` with each venue's id, name, address, province,
and capacity.

---

## 4. Running the tests

From the `authentication` folder, with the virtual environment active:

```bash
python manage.py test events
```

Ten tests cover creating an event (with ticket types), requiring a description,
requiring login, restricting creation to organizers, organizers seeing only
their own events, listing venues, rejecting invalid JSON, requiring at least one
ticket type, rejecting a negative price (creating nothing), and rejecting a
missing price. You should see `OK`.

Note: tests need `django.contrib.sessions` in `INSTALLED_APPS` and
`SessionMiddleware` in `MIDDLEWARE`. The real project already has both.

---

## 5. Trying it by hand (dev commands)

Two helper commands make it easy to see event creation work without the
frontend. They talk straight to the database.

### Create a demo organizer and venue

If your database has no users or venues yet (for example a fresh local test
database), seed one of each:

```bash
python manage.py seed_demo
```

This creates an organizer (`des@demo.com`) and a venue (`V001`). On the real
database, where real users and venues already exist, you do not need this.

### Create an event interactively

```bash
python manage.py try_event
```

It asks for an organizer email, shows the available venues, then asks for the
event name, date, description, and venue id, and finally for one or more ticket
tiers and their prices (leave the tier name blank to finish). It creates the
event and its ticket types and prints back what was saved, including each
ticket's `type_id`. Use `des@demo.com` and `V001` if you seeded the demo data.

---

## 6. How login works (for reference)

Each view calls `get_loggedin_user(request)` from `authapp.backend`. That reads
`request.session["user_id"]` (set by `authapp`'s `login_user`) and returns the
`Users` row, or `None`. If `None`, the view returns `401`. This is the same
session-cookie approach the payments views use, so no extra auth setup is
needed.

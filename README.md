# Tickora

A full-stack event ticketing platform built for the Canadian market. Customers browse events and book tickets via Stripe. Organizers create events, manage revenue, and invite performers. Performers track their scheduled appearances through a manager-mediated booking workflow.

---

## Table of Contents

- [Architecture](#architecture)
- [Backend Architecture](#backend-architecture)
- [Database Schema](#database-schema)
- [Quick Start](#quick-start)
- [Docker](#docker)
- [Environment Variables](#environment-variables)
- [Demo Accounts](#demo-accounts)
- [Features by Role](#features-by-role)
- [Pages](#pages)
- [API Reference](#api-reference)
- [Tech Stack](#tech-stack)

---

## Architecture

```
Tickora/
├── frontend/               # Next.js 16 app (TypeScript, Tailwind CSS 4, React 19)
└── backend/
    └── authentication/     # Django 6 REST API — three apps, plain JSON views
        ├── authapp/        # Auth, users, events, bookings, payments, manager links
        ├── events/         # Additional event creation routes
        └── appearances/    # Performer appearance request workflow + notifications
```

**Request flow:**

```
Browser → Next.js :3000 → Django API :8000 → Supabase PostgreSQL
                                  ↓
                             Stripe (payments)
                             Gmail SMTP (notifications)
```

The Django layer owns all auth, business logic, and database access. The frontend never contacts Supabase or Stripe directly — all payment sessions are initiated server-side.

---

## Backend Architecture

Django is split into three apps, all mounted under `/api/` in `myproject/urls.py`.

```
myproject/urls.py
├── api/ → authapp.urls      (auth, users, events, bookings, payments, manager links)
├── api/ → events.urls       (event creation — overlapping routes, events app wins)
└── api/ → appearances.urls  (performer appearance request workflow)
```

### App responsibilities

```
┌─────────────────────────────────────────────────────────────────────────┐
│  authapp                                                                │
│                                                                         │
│  Auth          /api/auth/*           register, login, logout            │
│  Account       /api/account/*        email, password, name, address     │
│  Events        /api/events/*         list, detail, create, deactivate   │
│  Organizer     /api/organizer/*      events list, revenue reports       │
│  Bookings      /api/bookings/*       list, create, cancel               │
│  Performer     /api/performer/*      performer's booked events          │
│  Venues        /api/venues/          list all venues                    │
│  Payments      /api/payments/*       Stripe checkout, verify, webhook   │
│  Manager links /api/manager/*        performer↔organizer link requests  │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  appearances                                                            │
│                                                                         │
│  Organizer inbox  /api/organizer/artists           managed artists      │
│                   /api/organizer/artists/<id>/     that artist's reqs   │
│                   /api/organizer/requests          create request        │
│                   /api/organizer/requests/<id>     decide (PATCH)       │
│  Requester        /api/requests/<id>/resubmit      resubmit (PATCH)     │
│  Performer        /api/performer/appearances        own schedule         │
│  Public           /api/events/<id>/performers      event lineup         │
│  Search           /api/artists/search              find performers      │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────────────┐
│  events  (additional routes mounted alongside authapp)                  │
│                                                                         │
│  /api/events/create/   create event (organizer)                        │
│  /api/events/mine/     organizer's own events                          │
│  /api/events/venues/   list venues                                     │
└─────────────────────────────────────────────────────────────────────────┘
```

### Authentication

All protected endpoints use a custom token scheme. On login or register, Django creates a 64-character hex token in the `user_tokens` table and returns it to the client. Every subsequent request must include:

```
Authorization: Token <hex-token>
```

Tokens are one-per-user and rotated on each login. Demo account tokens (`mock-token-customer`, etc.) are handled entirely client-side and never reach the backend.

### Performer appearance workflow

```
Organizer searches for performer  →  POST /api/organizer/requests  (creates AppearanceRequest, status=pending)
                                            ↓
Manager sees it in their inbox   →  GET /api/organizer/artists/<id>/requests
                                            ↓
Manager decides                  →  PATCH /api/organizer/requests/<id>
                                    {"status": "approved" | "declined" | "changes_requested"}
                                            ↓
  If approved  →  EventPerformers row created  →  performer appears in /api/events/<id>/performers
  If changes_requested  →  requester resubmits  →  PATCH /api/requests/<id>/resubmit
  (back to pending — cycle repeats)
                                            ↓
  Either way  →  Notifications written for performer + all involved organizers
                 + best-effort email via Gmail SMTP
```

### Manager-performer link workflow

Performers are managed by organizers. The link must be established before an organizer can decide on appearance requests for that performer.

```
Performer sends request  →  POST /api/manager/request-link/  {"manager_id": ...}
Organizer sees pending   →  GET /api/manager/pending-requests/
Organizer approves       →  POST /api/manager/approve/<request_id>/
  (creates PerformerLinks row)
Organizer denies         →  POST /api/manager/deny/<request_id>/
```

### Payment flow

```
Customer selects tickets  →  POST /api/payments/checkout/
                                  ↓
Django creates Booking (status=pending) + Tickets, then calls Stripe API
                                  ↓
Returns {checkout_url}  →  Frontend redirects browser to Stripe hosted Checkout
                                  ↓
On payment success  →  Stripe POSTs to /api/payments/webhook/
                        Django marks Booking confirmed + writes Payment record
                                  ↓
Frontend also calls GET /api/payments/verify/?session_id=<id> on return
to confirm status before showing the confirmation page
```

---

## Database Schema

All tables use `managed = False` in Django — schema is owned by Supabase, not Django migrations. The `database.sql` file at `backend/authentication/database.sql` contains the authoritative DDL.

| Table | Description |
|---|---|
| `roles` | Seeded: `customer`, `organizer`, `performer` |
| `users` | Registered accounts — forename, surname, email, hashed password, role FK, verified flag |
| `user_tokens` | Auth tokens — one per user, rotated on login |
| `venues` | Venue records — name, address, province (2-char), capacity; auto-created when organizer names a new venue |
| `upcoming_events` | Events created by organizers — name, date, category, description, is_active, cancellation_window_hours |
| `ticket_types` | Ticket tiers per event (e.g. General, VIP) — tier name and price |
| `bookings` | Booking records — pending or confirmed, linked to user + event |
| `tickets` | Individual seat records per booking — seat_id + ticket_type FK |
| `payments` | Stripe session and payment status per booking — session_id, payment_intent, amount (CAD), status |
| `event_performers` | Links performers to events once an appearance request is approved |
| `performer_links` | Active manager↔performer relationships |
| `performer_link_requests` | Pending/approved/denied requests to establish a manager link |
| `appearance_requests` | Performer appearance requests — fee_offer, notes, status (pending/approved/declined/changes_requested), decision_reason |
| `notifications` | In-app notifications written on appearance request decisions |

### Key relationships

```
roles ←── users ──┬── upcoming_events (as organizer)
                  ├── bookings ──── tickets ──── ticket_types ──── upcoming_events
                  ├── payments ─── bookings
                  ├── performer_links (performer ↔ manager)
                  ├── performer_link_requests
                  ├── event_performers ──── upcoming_events
                  ├── appearance_requests (as performer or requested_by)
                  └── notifications

upcoming_events ──── venues
```

---

## Quick Start

### 1. Backend

```bash
cd backend/authentication
pip install -r requirements.txt
```

Create `backend/.env` (see [Environment Variables](#environment-variables)), then:

```bash
python manage.py runserver
```

API available at `http://localhost:8000`.

#### Migrations

If setting up a fresh database (not using `database.sql`):

```bash
python manage.py migrate
```

If your DB was created from `database.sql` (matches the shared dev DB), fake the EventPerformers migration:

```bash
python manage.py migrate authapp 0003_eventperformers_composite_pk --fake
python manage.py migrate appearances
```

#### Seed demo data

```bash
# Seed appearance requests (interactive — prompts for performer, manager, event)
python manage.py seed_appearance_requests

# Seed ticket data
python manage.py seed_tickets

# Seed demo events
python manage.py seed_demo
```

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`.

---

## Docker

The project includes a `docker-compose.yml` at the root that runs both services.

```bash
docker compose up --build
```

| Service | Port |
|---|---|
| backend (Django) | 8000 |
| frontend (Next.js) | 3000 |

The backend image is built from `backend/authentication/Dockerfile`. The frontend image is built from `frontend/Dockerfile`. Both read environment variables from `backend/.env` (backend) and `frontend/.env.local` (frontend).

---

## Environment Variables

### `backend/.env`

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000
```

- `DATABASE_URL` — use the Supabase **session pooler** host (port 5432), not the direct host (IPv6 only, incompatible with psycopg2 on Windows)
- `STRIPE_SECRET_KEY` / `STRIPE_WEBHOOK_SECRET` — from [dashboard.stripe.com → Developers → API keys](https://dashboard.stripe.com/test/apikeys)
- `STRIPE_WEBHOOK_SECRET` is only needed when forwarding Stripe webhooks locally via the Stripe CLI

### `frontend/.env.local`

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

---

## Demo Accounts

These accounts are handled entirely client-side and work without the backend running.

| Role | Email | Password |
|---|---|---|
| Customer | customer@demo.com | demo1234 |
| Organizer | organizer@demo.com | demo1234 |
| Performer | performer@demo.com | demo1234 |

Real accounts can be registered at `/register`. All registered users are stored in Supabase. Demo tokens (`mock-token-customer`, etc.) are never sent to the backend.

---

## Features by Role

### Customer
- Browse all active events with search and category filtering (Music, Sports, Arts, Comedy)
- View event detail pages with ticket tiers and pricing
- Book tickets via **Stripe hosted Checkout** (test card: `4242 4242 4242 4242`, any future expiry, any CVC)
- Dashboard showing upcoming and past bookings, total spent, and individual seat IDs
- Cancel upcoming bookings
- Calendar view of all upcoming events by date
- My Events page showing their own booked events in a schedule calendar view

### Organizer
- Create events (name, date, venue, category, description, base ticket price)
  - Venues are auto-created if they don't exist yet
  - A default "General" ticket type is created at the specified price
- View all their events with live ticket sales and capacity bar
- Revenue reports with fill rate, tickets sold, and per-event revenue breakdown
- Deactivate events (removes them from the public listing)
- Search for performers by name across the entire platform
- Send appearance requests to performers (with fee offer and notes)
- Manage appearance requests for artists they represent: approve, decline, or request changes
- Approve/deny incoming performer-to-manager link requests

### Performer
- View upcoming and past events they are booked to perform at
- See audience size, venue capacity fill rate, and organizer info per event
- View their own appearance request history and status
- Request to be linked to an organizer as their manager

### Profile (all roles)
- Update display name (forename / surname)
- Update email address (requires current password)
- Change password
- Update address
- View linked manager (performers) or linked performers (organizers)

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with featured events and category links |
| `/events` | Browse all active events from the database with search + category filter |
| `/events/[id]` | Event detail page with ticket tier selection |
| `/checkout` | Order summary + redirect to Stripe Checkout; shows confirmation on return |
| `/dashboard` | Customer booking history (upcoming / past tabs) |
| `/calendar` | All upcoming events displayed in a monthly calendar view |
| `/my-events` | Logged-in customer's own bookings in a schedule calendar |
| `/organizer` | Organizer portal — events table, revenue reports, create event form |
| `/organizer/artists/[artistId]` | Inbox of appearance requests for one managed artist |
| `/performer` | Performer portal — booked performances with attendance stats |
| `/profile` | Account settings — name, email, password, address, manager link management |
| `/login` | Email + password login |
| `/register` | Registration with first name, last name, email, password, and role picker |

---

## API Reference

All endpoints are mounted at `/api/`. Auth endpoints and public event/performer routes require no token. All other endpoints require `Authorization: Token <hex>`.

### Auth

| Method | Path | Auth |
|---|---|---|
| POST | `/api/auth/register/` | No |
| POST | `/api/auth/login/` | No |
| POST | `/api/auth/logout/` | Yes |

### Account

| Method | Path | Auth |
|---|---|---|
| POST | `/api/account/email/` | Yes |
| POST | `/api/account/password/` | Yes |
| POST | `/api/account/forename/` | Yes |
| POST | `/api/account/surname/` | Yes |
| POST | `/api/account/address/` | Yes |

### Events

| Method | Path | Auth |
|---|---|---|
| GET | `/api/events/` | No |
| GET | `/api/events/<id>/` | No |
| POST | `/api/events/create/` | Yes (organizer) |
| POST | `/api/events/<id>/deactivate/` | Yes (organizer, own events only) |
| GET | `/api/events/<id>/performers` | No (public lineup) |

### Bookings

| Method | Path | Auth |
|---|---|---|
| GET | `/api/bookings/` | Yes |
| POST | `/api/bookings/create/` | Yes |
| DELETE | `/api/bookings/<id>/` | Yes (own bookings only) |

### Organizer

| Method | Path | Auth |
|---|---|---|
| GET | `/api/organizer/events/` | Yes (organizer) |
| GET | `/api/organizer/reports/` | Yes (organizer) |
| GET | `/api/organizer/artists` | Yes (organizer — managed artists) |
| GET | `/api/organizer/artists/<artist_id>/requests` | Yes (that artist's manager only) |
| POST | `/api/organizer/requests` | Yes (organizer — invite performer to event) |
| PATCH | `/api/organizer/requests/<request_id>` | Yes (artist's manager — approve/decline/request changes) |

#### Deciding an appearance request

```
PATCH /api/organizer/requests/<request_id>
{"status": "approved" | "declined" | "changes_requested", "reason": "optional text"}
```

On `approved`, an `EventPerformers` row is created and the performer appears in the event's public lineup.

### Performer

| Method | Path | Auth |
|---|---|---|
| GET | `/api/performer/events/` | Yes |
| GET | `/api/performer/appearances` | Yes (own appearance requests) |
| GET | `/api/performer/manager/` | Yes |

### Appearance Requests

| Method | Path | Auth |
|---|---|---|
| PATCH | `/api/requests/<request_id>/resubmit` | Yes (original requester — after changes_requested) |

### Manager Links

| Method | Path | Auth |
|---|---|---|
| POST | `/api/manager/request-link/` | Yes (performer) |
| GET | `/api/manager/pending-requests/` | Yes (organizer) |
| POST | `/api/manager/approve/<request_id>/` | Yes (organizer) |
| POST | `/api/manager/deny/<request_id>/` | Yes (organizer) |
| GET | `/api/manager/performers/` | Yes (organizer — all linked performers) |

### Venues

| Method | Path | Auth |
|---|---|---|
| GET | `/api/venues/` | Yes |

### Payments

| Method | Path | Auth |
|---|---|---|
| POST | `/api/payments/checkout/` | Yes |
| GET | `/api/payments/verify/` | No |
| POST | `/api/payments/webhook/` | No (Stripe signature) |

### Artist Search

| Method | Path | Auth |
|---|---|---|
| GET | `/api/artists/search?q=<query>` | Yes |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.9, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Django 6.0.6, psycopg2-binary, django-cors-headers, dj-database-url, python-dotenv |
| Database | Supabase (PostgreSQL), schema owned by Supabase (`managed = False`) |
| Payments | Stripe hosted Checkout, CAD currency, test mode |
| Notifications | In-app (`notifications` table) + Gmail SMTP email (`tickora2026@gmail.com`) |
| Auth | Custom hex token, `Authorization: Token <hex>`, stored in `user_tokens` |
| Containerization | Docker + docker-compose (backend + frontend services) |

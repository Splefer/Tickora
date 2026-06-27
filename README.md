# Tickora

A full-stack event ticketing platform built for the Canadian market. Users can browse events, book tickets via Stripe, and manage their bookings. Organizers can create events and view revenue reports. Performers can track their scheduled appearances.

## Architecture

```
Tickora/
├── frontend/          # Next.js 16 app (TypeScript, Tailwind CSS 4, React 19)
└── backend/
    └── authentication/  # Django 6 REST API (plain JSON views, no DRF)
```

**Request flow:** Browser → Next.js (port 3000) → Django API (port 8000) → Supabase PostgreSQL

The Django layer handles all auth, business logic, and database access. The frontend never talks to Supabase directly.

---

## Quick Start

### 1. Backend

```bash
cd backend/authentication
pip install -r requirements.txt
```

Create `backend/.env` (see [Environment Variables](#environment-variables) below), then:

```bash
python manage.py runserver
```

API available at `http://localhost:8000`.

### 2. Frontend

```bash
cd frontend
npm install
npm run dev
```

App available at `http://localhost:3000`.

---

## Environment Variables

Create `backend/.env` with the following:

```env
DATABASE_URL=postgresql://<user>:<password>@<host>:5432/postgres

STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...
FRONTEND_URL=http://localhost:3000

NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

- `DATABASE_URL` — use the Supabase **session pooler** host (port 5432), not the direct host (IPv6 only, incompatible with psycopg2 on Windows)
- Stripe keys are available from [dashboard.stripe.com → Developers → API keys](https://dashboard.stripe.com/test/apikeys)
- `STRIPE_WEBHOOK_SECRET` is only needed when running the Stripe webhook endpoint locally via the Stripe CLI

---

## Demo Accounts

These accounts bypass the backend and work without the server running.

| Role       | Email               | Password  |
|------------|---------------------|-----------|
| Customer   | customer@demo.com   | demo1234  |
| Organizer  | organizer@demo.com  | demo1234  |
| Performer  | performer@demo.com  | demo1234  |

Real accounts can be registered at `/register`. All registered users are stored in Supabase.

---

## Features by Role

### Customer
- Browse all active events with search and category filtering (Music, Sports, Arts, Comedy)
- View event detail pages with ticket tiers and pricing
- Book tickets via **Stripe hosted Checkout** (test card: `4242 4242 4242 4242`)
- Dashboard showing upcoming and past bookings, total spent, and individual seat IDs
- Cancel upcoming bookings

### Organizer
- Create events (name, date, venue, category, description, base ticket price)
  - Venues are auto-created if they don't exist yet
  - A default "General" ticket type is created at the specified price
- View all their events with live ticket sales and capacity bar
- Revenue reports table with fill rate, tickets sold, and per-event revenue breakdown
- Deactivate events (removes them from the public listing)

### Performer
- View upcoming and past events they are booked to perform at
- See audience size, venue capacity fill rate, and organizer info per event

---

## Pages

| Route | Description |
|---|---|
| `/` | Landing page with featured events (from mock data) and category links |
| `/events` | Browse all active events from the database with search + category filter |
| `/events/[id]` | Event detail page with ticket selection |
| `/checkout` | Order summary + redirect to Stripe Checkout; shows confirmation on return |
| `/dashboard` | Customer booking history (upcoming / past tabs) |
| `/organizer` | Organizer portal — events table, reports, and create event form |
| `/performer` | Performer portal — booked performances with attendance stats |
| `/login` | Email + password login |
| `/register` | Registration with first name, last name, email, password, and role picker |

---

## API Endpoints

All endpoints are mounted at `/api/`.

### Auth
| Method | Path | Auth required |
|--------|------|---------------|
| POST | `/api/auth/register/` | No |
| POST | `/api/auth/login/` | No |
| POST | `/api/auth/logout/` | Yes |

### Events
| Method | Path | Auth required |
|--------|------|---------------|
| GET | `/api/events/` | No |
| GET | `/api/events/<id>/` | No |
| POST | `/api/events/create/` | Yes (organizer) |
| POST | `/api/events/<id>/deactivate/` | Yes (organizer) |

### Bookings
| Method | Path | Auth required |
|--------|------|---------------|
| GET | `/api/bookings/` | Yes |
| POST | `/api/bookings/create/` | Yes |
| DELETE | `/api/bookings/<id>/` | Yes |

### Organizer
| Method | Path | Auth required |
|--------|------|---------------|
| GET | `/api/organizer/events/` | Yes |
| GET | `/api/organizer/reports/` | Yes |

### Performer
| Method | Path | Auth required |
|--------|------|---------------|
| GET | `/api/performer/events/` | Yes |

### Payments
| Method | Path | Auth required |
|--------|------|---------------|
| POST | `/api/payments/checkout/` | Yes |
| GET | `/api/payments/verify/` | No |
| POST | `/api/payments/webhook/` | No (Stripe signature) |

Authentication uses a custom token in the `Authorization: Token <hex>` header. Tokens are stored in the `user_tokens` table in Supabase.

---

## Database (Supabase PostgreSQL)

All tables use `managed = False` in Django — schema is owned by Supabase, not Django migrations.

| Table | Description |
|---|---|
| `roles` | Seeded with customer, organizer, performer |
| `users` | Registered accounts with hashed passwords |
| `user_tokens` | Auth tokens (one per user, rotated on login) |
| `venues` | Venue records (auto-created when an organizer names a new venue) |
| `upcoming_events` | Events created by organizers |
| `ticket_types` | Ticket tiers per event (e.g. General, VIP) |
| `bookings` | Booking records with pending/confirmed status |
| `tickets` | Individual seat records per booking |
| `payments` | Stripe session and payment status per booking |
| `event_performers` | Links performers to events |
| `performer_links` | Links performers to their managers |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 16.2.9, React 19, TypeScript, Tailwind CSS 4 |
| Backend | Django 6.0.6, psycopg2-binary, django-cors-headers |
| Database | Supabase (PostgreSQL), connected via dj-database-url |
| Payments | Stripe hosted Checkout (test mode) |
| Auth | Custom token auth (hex token in `user_tokens` table) |

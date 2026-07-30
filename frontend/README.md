# Tickora — Frontend

Next.js 16 app (TypeScript, Tailwind CSS 4, React 19).

See the root [`README.md`](../README.md) for full setup, environment variables, demo accounts, API reference, and backend architecture.

## Development

```bash
npm install
npm run dev   # http://localhost:3000
```

Requires the Django backend at `http://localhost:8000`. Demo accounts (`customer@demo.com`, `organizer@demo.com`, `performer@demo.com` / `demo1234`) work without the backend.

## Structure

```
frontend/
├── app/                   # Next.js App Router pages
│   ├── page.tsx           # Landing page
│   ├── events/            # Browse events + detail page
│   ├── checkout/          # Stripe Checkout return + confirmation
│   ├── dashboard/         # Customer booking history
│   ├── calendar/          # Monthly calendar of all events
│   ├── my-events/         # Schedule calendar of own bookings
│   ├── organizer/         # Organizer portal + artist inbox
│   ├── performer/         # Performer portal
│   ├── profile/           # Account settings
│   ├── login/
│   └── register/
├── components/            # Shared UI components
│   ├── Navbar.tsx
│   ├── Footer.tsx
│   ├── EventCard.tsx
│   ├── EventCalendar.tsx
│   ├── ScheduleCalendar.tsx
│   └── StatCard.tsx
├── context/
│   └── AuthContext.tsx    # Auth state + token storage
└── lib/
    ├── api.ts             # All backend API calls
    ├── types.ts           # Shared TypeScript types
    └── mock-data.ts       # Demo data for offline mode
```

## Environment

Create `frontend/.env.local`:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_...
```

# Tickora

A full-stack event ticketing platform — Next.js frontend with a Django/Supabase backend (backend integration in progress; frontend runs fully on mock data).

## Project Structure

```
Tickora/
├── frontend/   # Next.js app (TypeScript + Tailwind)
└── backend/    # Django REST API (Supabase DB — integration pending)
```

## Quick Start (Frontend)

```bash
cd frontend
npm install
npm run dev
```

Runs at `http://localhost:3000`.

## Demo Accounts

Use these credentials on the login page to test the app. No registration needed.

| Role       | Email                  | Password   |
|------------|------------------------|------------|
| Customer   | customer@demo.com      | demo1234   |
| Organizer  | organizer@demo.com     | demo1234   |
| Performer  | performer@demo.com     | demo1234   |

### What you can test

- **Customer** — Browse events, select ticket tiers, go through checkout, view bookings on the dashboard
- **Organizer** — View organizer dashboard, see event reports
- **Performer** — View performer schedule

> All data is mocked in the frontend. No backend or database setup is required to run the demo.

# How to use the appearances app (BKG-2.1)

This app is the backend for approving performer appearance requests. A
performer's manager (an organizer, linked via `authapp.PerformerLinks`)
approves, declines, or asks for changes on a request; the requester can
resubmit after changes are requested, cycling it back to pending; everyone
on the organizer side plus the performer gets notified whenever a decision
is made; and an approval is written to `authapp.EventPerformers` so both
the event's performer lineup and the performer's own schedule reflect it.

Built in plain Django (no DRF), matching authapp/events/booking.

---

## 1. What this app does (and does not do)

Does:
- Let an artist's manager see their managed artists and pending request counts.
- Let the manager see every appearance request sent in for one of their artists.
- Let the manager approve / decline / request changes on a pending request.
- Let the original requester resubmit a request that had changes requested,
  putting it back to `pending` so the manager can decide again — without
  this, "request changes" would be a dead end instead of a workflow step.
- Write an in-app `Notifications` row (+ best-effort email) to the performer
  and to every organizer with a stake in the request (whoever sent it, and
  the event's own organizer if that's a different account) whenever a
  decision is made.
- On approval, add the performer to the event via `EventPerformers`, and
  expose that both on the event side (`GET /api/events/<id>/performers`)
  and the performer's own side (`GET /api/performer/appearances`).

Does NOT (a separate ticket's job):
- Create the initial appearance request — there is no "submit a request"
  endpoint yet, only the approve/decline/request-changes/resubmit steps.
  Use the `seed_appearance_requests` management command below to create
  test data.

---

## 2. One-time setup

Already wired in for you (both edits already made):
- `appearances` is in `INSTALLED_APPS` (`myproject/settings.py`).
- `path("api/", include("appearances.urls"))` is in `myproject/urls.py`.

### Migrations

```bash
python manage.py migrate appearances
```

This also required a fix to `authapp.EventPerformers`, which was missing a
correct primary key (the real `event_performers` table has a composite
`(event_id, performer_id)` PK, not a surrogate `id` — every ORM query
against it, from any app, was silently 500ing before this). If your local
DB was built by hand-running `database.sql` (matches the team's shared dev
DB) rather than purely through `migrate`, that table already has the right
columns and you must fake this one migration instead of running it for
real:

```bash
python manage.py migrate authapp 0003_eventperformers_composite_pk --fake
```

If your DB was created purely via `python manage.py migrate` from scratch
(no `database.sql`), just run `python manage.py migrate authapp` normally —
no `--fake` needed there.

### Seeding a request to test with

There's no creation endpoint yet, so use the management command to make a
pending request by hand:

```bash
python manage.py seed_appearance_requests
```

It walks you through picking a performer, their manager (organizer), an
optional separate requester, and an event, and creates one `pending`
`AppearanceRequests` row. It also creates the `PerformerLinks` row linking
the performer to the manager if one doesn't already exist.

---

## 3. The API

All endpoints require a logged-in session (same `get_loggedin_user` cookie
auth as the rest of the backend), except the event performer lineup, which
is public. No trailing slash on any of these, to match the frontend's
already-written `fetchJson` calls in `lib/api.ts`.

| Method | Path | Who | Purpose |
| --- | --- | --- | --- |
| GET | `/api/organizer/artists` | manager | list managed artists + pending/upcoming counts |
| GET | `/api/organizer/artists/<artist_id>/requests` | manager of that artist | list that artist's appearance requests |
| PATCH | `/api/organizer/requests/<request_id>` | manager of that artist | approve / decline / request changes |
| PATCH | `/api/requests/<request_id>/resubmit` | the original requester | resubmit after changes requested, back to `pending` |
| GET | `/api/performer/appearances` | the performer | the logged-in performer's own requests (their schedule) |
| GET | `/api/events/<event_id>/performers` | anyone (public) | the event's approved performer lineup |

### Deciding a request

```
PATCH /api/organizer/requests/7
{"status": "approved", "reason": ""}
```

`status` must be `"approved"`, `"declined"`, or `"changes_requested"`.
`reason` is optional and is returned back as `decline_reason` on the
request (used for any of the three decision types, e.g. "needs a later
start time" for changes_requested). Only the artist's manager can decide,
and only while the request is still `pending` — a second decision on the
same request returns `400`.

Response is the updated request:

```json
{
  "request_id": 7,
  "artist_id": 4,
  "event_id": 2,
  "event_name": "Summer Nights Festival",
  "event_date": "2026-08-14",
  "venue": {"venue_name": "Riverside Amphitheatre", "venue_address": "400 River Rd"},
  "requested_by": "Blue Horizon Events",
  "fee_offer": 8000.0,
  "notes": "Headline slot, 45 min set.",
  "status": "approved",
  "decline_reason": null
}
```

On `approved`, an `authapp.EventPerformers` row for
`(event, performer)` is created (idempotent — `get_or_create`), so the
event's performer list and the performer's own schedule both reflect it
immediately.

### Resubmitting after changes are requested

```
PATCH /api/requests/7/resubmit
{"fee_offer": 6000, "notes": "Moved to a later start time as requested."}
```

Both fields are optional — only the ones sent are updated. Only works when
the request is currently `changes_requested`, and only the account that
originally sent it (`requested_by`) can do it. On success the status flips
back to `pending`, and `decided_by` / `decided_at` / `decision_reason` are
cleared, so it shows up in the manager's inbox again as a normal pending
decision.

### Event performer lineup

```
GET /api/events/2/performers
```

```json
{"event_id": 2, "performers": [{"artist_id": 4, "artist_name": "Nova Aria"}]}
```

Public and unauthenticated, same as the booking app's discovery endpoints —
this is what actually makes "approved status reflected on relevant events"
observable, rather than only inferable from the request's own status field.

### Note on the frontend's TypeScript type

`frontend/lib/types.ts`'s `AppearanceRequest.status` now includes
`'changes_requested'` (updated as part of this work), but the Artist Inbox
page (`frontend/app/organizer/artists/[artistId]/page.tsx`) still only has
Approve/Decline buttons — it needs a "Request changes" button, and
somewhere for the requester to see + act on a changes-requested request
(call `respondToAppearanceRequest` with `'changes_requested'`, and a new
`resubmitAppearanceRequest` helper hitting the resubmit endpoint above).
Neither of those exist in `lib/api.ts` yet.

---

## 4. Notifications

Every decision writes one `appearances.Notifications` row for the performer
and one for each distinct organizer with a stake in the request — the
account that sent it, plus the event's own organizer if that's a different
account (e.g. a booking agency requesting on the event owner's behalf) —
and best-effort emails all of them via the same `send_mail` pattern
`authapp.backend.verification_email` uses. Email is `fail_silently=True`
here on purpose — a decision must persist even if SMTP is down; the in-app
row is the source of truth.

---

## 5. Running the tests

```bash
python manage.py test appearances
```

20 tests cover: listing managed artists (and requiring login), listing one
artist's requests (and rejecting a non-manager), approve (creates
`EventPerformers`, writes notifications + emails), decline with a reason
(does not touch `EventPerformers`), request-changes, rejecting a
non-manager's decision, rejecting a second decision on an already-decided
request, rejecting an invalid status, 404 on an unknown request, the
performer-schedule endpoint (sees only their own requests), the event
performer lineup (empty before approval, shows the artist after), resubmit
(puts a changes_requested request back to pending, rejects a non-requester,
rejects a request that isn't in changes_requested), and that notifications
reach the performer, the requester, and a distinct event organizer as three
separate parties.

Note: on this machine, `python manage.py test` (for *any* app, including
pre-existing ones like `events`) currently fails with
`Unknown column 'pass' in 'field list'` when building the test database —
this is a pre-existing mismatch between `authapp`'s migrations and the
`database.sql` schema, unrelated to this feature. Verified this app's
behavior instead by exercising the endpoints directly against the real dev
DB — every endpoint, including the full request-changes → resubmit →
approve cycle, round tripped correctly end-to-end.

---

## 6. Seeing it work by hand

With the server running (`python manage.py runserver`):

1. Log in as an organizer who manages at least one performer (or run
   `seed_appearance_requests` to set that link up), then log in as a
   performer to confirm they see nothing yet:
   `GET http://127.0.0.1:8000/api/performer/appearances`
2. As the manager: `GET /api/organizer/artists` — see the artist with a
   `pending_request_count` of 1.
3. `GET /api/organizer/artists/<artist_id>/requests` — see the pending request.
4. `PATCH /api/organizer/requests/<request_id>` with
   `{"status": "changes_requested", "reason": "..."}` — see it flip.
5. As the requester: `PATCH /api/requests/<request_id>/resubmit` — see it
   flip back to `pending`.
6. As the manager again: `PATCH /api/organizer/requests/<request_id>` with
   `{"status": "approved"}`.
7. `GET /api/events/<event_id>/performers` (no login needed) — the artist
   now shows up in the lineup.
8. As the performer: `GET /api/performer/appearances` — the same request
   now shows `status: "approved"`.
9. Check `appearances.Notifications` in the admin (`/admin/`) — one row per
   decision for the performer, and one per distinct organizer involved.

# Stripe payments — setup & usage

Hosted Stripe Checkout (redirect) for ticket purchases. Everything runs in
Stripe **Test Mode** — no real money.

## 1. One-time setup

1. Create a free account at https://stripe.com and stay in **Test Mode**.
2. Developers → API keys: copy the **Secret key** (`sk_test_...`) and
   **Publishable key** (`pk_test_...`).
3. Install deps: `pip install -r requirements.txt`
4. Put your keys in the environment (or your local `.env`) — see `backend/.env.example`:
   - `STRIPE_SECRET_KEY=sk_test_...`
   - `FRONTEND_URL=http://localhost:3000`
   - `STRIPE_WEBHOOK_SECRET=whsec_...` (only if you run the webhook)

## 2. Add to your local `myproject/settings.py`

`settings.py` is not committed, so each dev adds this:

```python
import os

STRIPE_SECRET_KEY = os.environ.get("STRIPE_SECRET_KEY", "")
STRIPE_WEBHOOK_SECRET = os.environ.get("STRIPE_WEBHOOK_SECRET", "")
FRONTEND_URL = os.environ.get("FRONTEND_URL", "http://localhost:3000")
```

Make sure `'authapp'` is in `INSTALLED_APPS` (it already is if models work).

If the Next.js frontend (port 3000) gets CORS errors calling the API (port 8000),
install and configure `django-cors-headers` and allow `http://localhost:3000`.

## 3. Run the migration (creates the `payments` table)

```bash
python manage.py migrate
```

## 4. API contract (for the frontend teammate)

All endpoints are under `/api/payments/`. Auth uses the existing Django session
cookie, so fetch calls must send `credentials: 'include'`.

- `POST /api/payments/create-checkout-session/`
  - Body: `{ "event_id": 12, "tickets": [ { "type_id": 3, "quantity": 2 } ] }`
  - Returns: `{ "url", "session_id", "booking_id" }` — then do `window.location.href = url`.
  - Price is recomputed server-side from `ticket_types`; client amounts are ignored.
- `GET /api/payments/verify/?session_id=cs_test_...`
  - Call on the success page. Returns `{ "status": "paid", "booking_id": ... }` and
    marks the booking confirmed.
- `POST /api/payments/webhook/` — Stripe calls this directly (optional, more reliable).

Stripe redirects to:
- success: `${FRONTEND_URL}/checkout/success?session_id={CHECKOUT_SESSION_ID}`
- cancel: `${FRONTEND_URL}/checkout?canceled=1`

## 5. Testing

- Test card: `4242 4242 4242 4242`, any future expiry, any CVC, any postal code.
- Optional webhook testing with the Stripe CLI:
  `stripe listen --forward-to localhost:8000/api/payments/webhook/`
  (copy the `whsec_...` it prints into `STRIPE_WEBHOOK_SECRET`).

'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createBooking } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';

interface SelectedTicket {
  type_id: number;
  quantity: number;
  tier: string;
  price: number;
}

function CheckoutContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, token } = useAuth();

  const eventId = Number(searchParams.get('event_id'));
  const eventName = searchParams.get('event_name') ?? '';
  const ticketsRaw = searchParams.get('tickets');
  const tickets: SelectedTicket[] = ticketsRaw ? (JSON.parse(ticketsRaw) as SelectedTicket[]) : [];

  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [expiry, setExpiry] = useState('');
  const [cvv, setCvv] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!user) router.push('/login');
  }, [user, router]);

  const subtotal = tickets.reduce((sum, t) => sum + t.price * t.quantity, 0);
  const serviceFee = 0;
  const total = subtotal + serviceFee;

  function formatCard(val: string) {
    return val
      .replace(/\D/g, '')
      .slice(0, 16)
      .replace(/(.{4})/g, '$1 ')
      .trim();
  }

  function formatExpiry(val: string) {
    const digits = val.replace(/\D/g, '').slice(0, 4);
    if (digits.length >= 3) return `${digits.slice(0, 2)}/${digits.slice(2)}`;
    return digits;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await createBooking(
        token ?? '',
        eventId,
        tickets.map((t) => ({ type_id: t.type_id, quantity: t.quantity })),
      );
      setSuccess(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-green-900/40 text-4xl">
            ✅
          </div>
          <h1 className="mt-6 text-2xl font-bold text-white">Booking confirmed!</h1>
          <p className="mt-3 text-gray-400">
            Your tickets for <span className="text-white font-medium">{eventName}</span> have been
            booked. Check your email for confirmation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            <Link
              href="/dashboard"
              className="rounded-xl bg-indigo-600 px-6 py-3 text-sm font-semibold text-white hover:bg-indigo-500"
            >
              View my bookings
            </Link>
            <Link
              href="/events"
              className="rounded-xl border border-gray-700 px-6 py-3 text-sm font-semibold text-gray-300 hover:border-gray-500 hover:text-white"
            >
              Browse more events
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      <Link href="/events" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
        ← Back to events
      </Link>

      <h1 className="mt-6 text-2xl font-bold text-white">Checkout</h1>

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        {/* Payment form */}
        <div className="lg:col-span-3">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-base font-semibold text-white">Payment details</h2>
              <p className="mt-1 text-xs text-gray-500">
                Your payment is processed securely. Card details are never stored.
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}

              <div className="mt-5 space-y-4">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Cardholder name
                  </label>
                  <input
                    type="text"
                    required
                    value={cardName}
                    onChange={(e) => setCardName(e.target.value)}
                    placeholder="Alex Thompson"
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Card number
                  </label>
                  <input
                    type="text"
                    required
                    value={cardNumber}
                    onChange={(e) => setCardNumber(formatCard(e.target.value))}
                    placeholder="1234 5678 9012 3456"
                    maxLength={19}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 font-mono text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">
                      Expiry
                    </label>
                    <input
                      type="text"
                      required
                      value={expiry}
                      onChange={(e) => setExpiry(formatExpiry(e.target.value))}
                      placeholder="MM/YY"
                      maxLength={5}
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 font-mono text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">CVV</label>
                    <input
                      type="text"
                      required
                      value={cvv}
                      onChange={(e) => setCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      placeholder="123"
                      maxLength={4}
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 font-mono text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || tickets.length === 0}
              className="w-full rounded-xl bg-indigo-600 py-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Processing…' : `Pay $${total.toFixed(2)}`}
            </button>

            <div className="flex items-center justify-center gap-4 text-xs text-gray-500">
              <span>🔒 SSL encrypted</span>
              <span>·</span>
              <span>💳 Secure payment</span>
              <span>·</span>
              <span>$0 hidden fees</span>
            </div>
          </form>
        </div>

        {/* Order summary */}
        <div className="lg:col-span-2">
          <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
            <h2 className="text-base font-semibold text-white">Order summary</h2>
            <p className="mt-1 text-sm font-medium text-gray-300">{eventName}</p>

            <div className="mt-5 space-y-3">
              {tickets.map((t) => (
                <div key={t.type_id} className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">
                    {t.tier} × {t.quantity}
                  </span>
                  <span className="text-white">${(t.price * t.quantity).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="mt-5 border-t border-gray-800 pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal</span>
                <span className="text-white">${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Service fee</span>
                <span className="text-green-400">$0.00</span>
              </div>
              <div className="flex justify-between border-t border-gray-800 pt-2 text-base font-bold">
                <span className="text-white">Total</span>
                <span className="text-white">${total.toFixed(2)}</span>
              </div>
            </div>

            <div className="mt-4 rounded-xl bg-indigo-900/20 px-4 py-3 text-xs text-indigo-300">
              🎟 Tickets will be emailed to {user?.email}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    }>
      <CheckoutContent />
    </Suspense>
  );
}

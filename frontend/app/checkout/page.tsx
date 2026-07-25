'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { createCheckoutSession, verifyPayment } from '@/lib/api';
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
  const { user, token, loading: authLoading } = useAuth();

  const sessionId = searchParams.get('session_id');
  const eventId = Number(searchParams.get('event_id'));
  const eventName = searchParams.get('event_name') ?? '';
  const ticketsRaw = searchParams.get('tickets');
  const tickets: SelectedTicket[] = ticketsRaw ? (JSON.parse(ticketsRaw) as SelectedTicket[]) : [];

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
  }, [user, router, authLoading]);

  // Came back from Stripe — verify and show confirmation
  useEffect(() => {
    if (!sessionId) return;
    verifyPayment(sessionId)
      .then(({ status }) => {
        if (status === 'paid') setSuccess(true);
        else setError('Payment not completed. Please try again.');
      })
      .catch(() => setError('Could not verify payment. Please contact support.'));
  }, [sessionId]);

  const subtotal = tickets.reduce((sum, t) => sum + t.price * t.quantity, 0);
  const total = subtotal;

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!token) { router.push('/login'); return; }
    setError('');
    setLoading(true);
    try {
      const { checkout_url } = await createCheckoutSession(token, eventId, eventName, tickets.map((t) => ({ type_id: t.type_id, quantity: t.quantity })));
      window.location.href = checkout_url;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start checkout. Please try again.');
      setLoading(false);
    }
  }

  if (success || sessionId) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        <div className="max-w-md text-center">
          {success ? (
            <>
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
            </>
          ) : error ? (
            <>
              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-900/40 text-4xl">
                ❌
              </div>
              <h1 className="mt-6 text-2xl font-bold text-white">Payment issue</h1>
              <p className="mt-3 text-sm text-red-400">{error}</p>
              <Link href="/events" className="mt-6 inline-block text-sm text-indigo-400 hover:underline">
                Back to events
              </Link>
            </>
          ) : (
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent mx-auto" />
          )}
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
        {/* Pay button */}
        <div className="lg:col-span-3">
          <form onSubmit={handlePay} className="space-y-5">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h2 className="text-base font-semibold text-white">Secure payment via Stripe</h2>
              <p className="mt-1 text-xs text-gray-500">
                You'll be redirected to Stripe's hosted checkout to complete your payment safely.
              </p>

              {error && (
                <div className="mt-4 rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading || tickets.length === 0}
              className="w-full rounded-xl bg-indigo-600 py-4 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Redirecting to Stripe…' : `Pay $${total.toFixed(2)} with Stripe`}
            </button>

            <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-xs text-gray-500">
              <span>🔒 SSL encrypted</span>
              <span>·</span>
              <span>💳 Powered by Stripe</span>
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

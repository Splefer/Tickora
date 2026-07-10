'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getMyBookings, cancelBooking } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Booking } from '@/lib/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr + 'T00:00:00') >= new Date();
}

export default function DashboardPage() {
  const { user, token } = useAuth();
  const router = useRouter();

  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');
  const [cancelling, setCancelling] = useState<number | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    getMyBookings(token ?? '')
      .then(setBookings)
      .finally(() => setLoading(false));
  }, [user, token, router]);

  async function handleCancel(bookingId: number) {
    setCancelling(bookingId);
    try {
      await cancelBooking(token ?? '', bookingId);
      setBookings((prev) => prev.filter((b) => b.booking_id !== bookingId));
    } finally {
      setCancelling(null);
    }
  }

  const filtered = bookings.filter((b) =>
    tab === 'upcoming' ? isUpcoming(b.event.event_date) : !isUpcoming(b.event.event_date),
  );

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">
            Welcome back, {user?.forename} 👋
          </h1>
          <p className="mt-1 text-sm text-gray-400">{user?.email}</p>
        </div>
        <Link
          href="/events"
          className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
        >
          Browse events
        </Link>
      </div>

      {/* Stats row */}
      <div className="mt-8 grid grid-cols-2 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 text-center">
          <div className="text-2xl font-bold text-white">{bookings.length}</div>
          <div className="mt-1 text-xs text-gray-400">Total bookings</div>
        </div>
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-5 text-center">
          <div className="text-2xl font-bold text-white">
            {bookings.filter((b) => isUpcoming(b.event.event_date)).length}
          </div>
          <div className="mt-1 text-xs text-gray-400">Upcoming events</div>
        </div>
        <div className="col-span-2 rounded-2xl border border-gray-800 bg-gray-900 p-5 text-center sm:col-span-1">
          <div className="text-2xl font-bold text-white">
            $
            {bookings
              .reduce((sum, b) => {
                const ticketTotal = (b.tickets ?? []).reduce((s, t) => s + t.type.price, 0);
                return sum + ticketTotal;
              }, 0)
              .toFixed(2)}
          </div>
          <div className="mt-1 text-xs text-gray-400">Total spent</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mt-10 flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 rounded-lg py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'upcoming' ? '🎟 Upcoming' : '⏳ Past'}
          </button>
        ))}
      </div>

      {/* Bookings list */}
      <div className="mt-6 space-y-4">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-2xl bg-gray-800" />
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl">🎟</div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              {tab === 'upcoming' ? 'No upcoming events' : 'No past events'}
            </h3>
            {tab === 'upcoming' && (
              <Link
                href="/events"
                className="mt-4 inline-block rounded-full bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
              >
                Find events to attend
              </Link>
            )}
          </div>
        ) : (
          filtered.map((booking) => (
            <div
              key={booking.booking_id}
              className="rounded-2xl border border-gray-800 bg-gray-900 p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-indigo-900/40 text-xl">
                    🎟
                  </div>
                  <div>
                    <h3 className="font-semibold text-white">{booking.event.event_name}</h3>
                    <p className="mt-0.5 text-sm text-gray-400">
                      {formatDate(booking.event.event_date)} · {booking.event.venue.venue_name}
                    </p>
                    {booking.tickets && booking.tickets.length > 0 && (
                      <div className="mt-1.5 flex flex-wrap gap-2">
                        {booking.tickets.map((t, i) => (
                          <span
                            key={i}
                            className="rounded-full border border-gray-700 px-2.5 py-0.5 text-xs text-gray-400"
                          >
                            {t.type.tier} · {t.seat_id}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-medium ${
                      booking.confirmed
                        ? 'bg-green-900/40 text-green-400'
                        : 'bg-yellow-900/40 text-yellow-400'
                    }`}
                  >
                    {booking.confirmed ? 'Confirmed' : 'Pending'}
                  </span>
                  {tab === 'upcoming' && (
                    <button
                      onClick={() => handleCancel(booking.booking_id)}
                      disabled={cancelling === booking.booking_id}
                      className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-medium text-gray-400 transition-colors hover:border-red-700 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      {cancelling === booking.booking_id ? 'Cancelling…' : 'Cancel'}
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

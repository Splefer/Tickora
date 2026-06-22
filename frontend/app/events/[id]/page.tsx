'use client';

import { useState, useEffect, use } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getEvent } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Event, TicketType } from '@/lib/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

const CATEGORY_GRADIENTS: Record<string, string> = {
  Music: 'from-purple-900 via-indigo-900 to-[#0a0a0f]',
  Sports: 'from-green-900 via-emerald-900 to-[#0a0a0f]',
  Arts: 'from-pink-900 via-rose-900 to-[#0a0a0f]',
  Comedy: 'from-yellow-900 via-orange-900 to-[#0a0a0f]',
};

export default function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { user } = useAuth();
  const router = useRouter();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(true);
  const [quantities, setQuantities] = useState<Record<number, number>>({});

  useEffect(() => {
    getEvent(Number(id))
      .then((e) => {
        if (e) {
          setEvent(e);
          const init: Record<number, number> = {};
          e.ticket_types?.forEach((t) => (init[t.type_id] = 0));
          setQuantities(init);
        }
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-500 border-t-transparent" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4">
        <div className="text-5xl">🎟</div>
        <h1 className="text-xl font-bold text-white">Event not found</h1>
        <Link href="/events" className="text-sm text-indigo-400 hover:text-indigo-300">
          ← Back to events
        </Link>
      </div>
    );
  }

  const cat = event.category ?? 'Music';
  const gradient = CATEGORY_GRADIENTS[cat] ?? 'from-indigo-900 via-purple-900 to-[#0a0a0f]';

  const totalTickets = Object.values(quantities).reduce((a, b) => a + b, 0);
  const totalPrice = (event.ticket_types ?? []).reduce((sum, t) => {
    return sum + (quantities[t.type_id] ?? 0) * t.price;
  }, 0);

  function changeQty(typeId: number, delta: number) {
    setQuantities((prev) => ({
      ...prev,
      [typeId]: Math.max(0, Math.min(4, (prev[typeId] ?? 0) + delta)),
    }));
  }

  function handleCheckout() {
    if (!user) {
      router.push('/login');
      return;
    }
    const selected = (event?.ticket_types ?? [])
      .filter((t) => (quantities[t.type_id] ?? 0) > 0)
      .map((t) => ({ type_id: t.type_id, quantity: quantities[t.type_id]!, tier: t.tier, price: t.price }));

    const params = new URLSearchParams({
      event_id: String(event?.event_id),
      event_name: event?.event_name ?? '',
      tickets: JSON.stringify(selected),
    });
    router.push(`/checkout?${params}`);
  }

  const soldPct = event.tickets_sold && event.venue.capacity
    ? Math.round((event.tickets_sold / event.venue.capacity) * 100)
    : null;

  return (
    <div>
      {/* Hero */}
      <div className={`relative bg-gradient-to-b ${gradient} pb-0 pt-16`}>
        <div className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
          <Link href="/events" className="inline-flex items-center gap-1 text-sm text-gray-400 hover:text-white">
            ← Back to events
          </Link>

          <div className="mt-6 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              {event.category && (
                <span className="inline-block rounded-full border border-indigo-500/30 bg-indigo-900/30 px-3 py-1 text-xs font-medium text-indigo-300">
                  {event.category}
                </span>
              )}
              <h1 className="mt-3 text-4xl font-extrabold text-white sm:text-5xl">
                {event.event_name}
              </h1>
              <p className="mt-2 text-lg text-gray-300">
                by {event.organizer_name}
              </p>
            </div>

            {soldPct !== null && (
              <div className="shrink-0 rounded-2xl border border-gray-700 bg-black/30 p-4 text-center backdrop-blur-sm lg:w-48">
                <div className="text-2xl font-bold text-white">{soldPct}%</div>
                <div className="text-xs text-gray-400">capacity filled</div>
                <div className="mt-2 h-1.5 w-full rounded-full bg-gray-700">
                  <div
                    className="h-1.5 rounded-full bg-indigo-500"
                    style={{ width: `${Math.min(soldPct, 100)}%` }}
                  />
                </div>
                <div className="mt-1 text-xs text-gray-500">
                  {event.tickets_sold?.toLocaleString()} / {event.venue.capacity.toLocaleString()} tickets
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid gap-10 lg:grid-cols-3">
          {/* Left: details */}
          <div className="lg:col-span-2 space-y-8">
            {/* Info cards */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Date</div>
                <div className="mt-1 text-sm font-semibold text-white">{formatDate(event.event_date)}</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Venue</div>
                <div className="mt-1 text-sm font-semibold text-white">{event.venue.venue_name}</div>
                <div className="mt-0.5 text-xs text-gray-400">{event.venue.venue_address}</div>
              </div>
              <div className="rounded-xl border border-gray-800 bg-gray-900 p-5">
                <div className="text-xs font-medium uppercase tracking-wider text-gray-500">Cancellation</div>
                <div className="mt-1 text-sm font-semibold text-white">
                  {event.cancellation_window_hours
                    ? `Up to ${event.cancellation_window_hours}h before`
                    : 'No cancellations'}
                </div>
              </div>
            </div>

            {/* Description */}
            {event.description && (
              <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
                <h2 className="text-base font-semibold text-white">About this event</h2>
                <p className="mt-3 text-sm leading-relaxed text-gray-400">{event.description}</p>
              </div>
            )}

            {/* Ticket types — mobile */}
            <div className="lg:hidden">
              <TicketSelector
                ticketTypes={event.ticket_types ?? []}
                quantities={quantities}
                onChangeQty={changeQty}
                totalTickets={totalTickets}
                totalPrice={totalPrice}
                onCheckout={handleCheckout}
              />
            </div>
          </div>

          {/* Right: ticket selector — desktop */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <TicketSelector
                ticketTypes={event.ticket_types ?? []}
                quantities={quantities}
                onChangeQty={changeQty}
                totalTickets={totalTickets}
                totalPrice={totalPrice}
                onCheckout={handleCheckout}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function TicketSelector({
  ticketTypes,
  quantities,
  onChangeQty,
  totalTickets,
  totalPrice,
  onCheckout,
}: {
  ticketTypes: TicketType[];
  quantities: Record<number, number>;
  onChangeQty: (typeId: number, delta: number) => void;
  totalTickets: number;
  totalPrice: number;
  onCheckout: () => void;
}) {
  return (
    <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
      <h2 className="text-base font-semibold text-white">Select tickets</h2>
      <p className="mt-1 text-xs text-gray-500">Maximum 4 tickets per type</p>

      <div className="mt-5 space-y-3">
        {ticketTypes.map((t) => (
          <div
            key={t.type_id}
            className="flex items-center justify-between rounded-xl border border-gray-700 bg-gray-800 px-4 py-3"
          >
            <div>
              <div className="text-sm font-medium text-white">{t.tier}</div>
              <div className="text-xs text-indigo-400">${t.price.toFixed(2)} each</div>
            </div>
            <div className="flex items-center gap-3">
              <button
                onClick={() => onChangeQty(t.type_id, -1)}
                disabled={(quantities[t.type_id] ?? 0) === 0}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-600 text-gray-300 transition-colors hover:border-indigo-500 hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                −
              </button>
              <span className="w-4 text-center text-sm font-semibold text-white">
                {quantities[t.type_id] ?? 0}
              </span>
              <button
                onClick={() => onChangeQty(t.type_id, 1)}
                disabled={(quantities[t.type_id] ?? 0) >= 4}
                className="flex h-7 w-7 items-center justify-center rounded-lg border border-gray-600 text-gray-300 transition-colors hover:border-indigo-500 hover:text-indigo-400 disabled:cursor-not-allowed disabled:opacity-30"
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>

      {totalTickets > 0 && (
        <div className="mt-4 flex items-center justify-between rounded-xl bg-gray-800/50 px-4 py-3">
          <span className="text-sm text-gray-400">
            {totalTickets} ticket{totalTickets !== 1 ? 's' : ''}
          </span>
          <span className="text-base font-bold text-white">${totalPrice.toFixed(2)}</span>
        </div>
      )}

      <button
        onClick={onCheckout}
        disabled={totalTickets === 0}
        className="mt-4 w-full rounded-xl bg-indigo-600 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {totalTickets === 0 ? 'Select tickets to continue' : 'Proceed to checkout →'}
      </button>

      <p className="mt-3 text-center text-xs text-gray-500">
        No hidden fees · Secure checkout
      </p>
    </div>
  );
}

'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getPerformerEvents, getPerformerAppearances, getPerformerManager, respondToAppearanceRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { Event, AppearanceRequest } from '@/lib/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
  return d.toLocaleDateString('en-CA', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function isUpcoming(dateStr: string) {
  return new Date(dateStr.split('T')[0] + 'T00:00:00') >= new Date();
}

const CATEGORY_ICONS: Record<string, string> = {
  Music: '🎵',
  Sports: '🏀',
  Arts: '🎭',
  Comedy: '😄',
};

export default function PerformerPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<'upcoming' | 'past'>('upcoming');

  const [pendingRequests, setPendingRequests] = useState<AppearanceRequest[]>([]);
  const [isUnmanaged, setIsUnmanaged] = useState(false);
  const [decidingId, setDecidingId] = useState<number | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    getPerformerEvents(token ?? '')
      .then(setEvents)
      .finally(() => setLoading(false));

    getPerformerManager(token ?? '').then((res) => setIsUnmanaged(res.manager === null));
    getPerformerAppearances(token ?? '')
      .then((reqs) => setPendingRequests(reqs.filter((r) => r.status === 'pending')))
      .catch(() => setPendingRequests([]));
  }, [user, token, router, authLoading]);

  async function handleDecide(requestId: number, status: 'approved' | 'declined') {
    setDecidingId(requestId);
    try {
      await respondToAppearanceRequest(token ?? '', requestId, status);
      setPendingRequests((prev) => prev.filter((r) => r.request_id !== requestId));
      if (status === 'approved') {
        getPerformerEvents(token ?? '').then(setEvents);
      }
    } finally {
      setDecidingId(null);
    }
  }

  const filtered = events.filter((e) =>
    tab === 'upcoming' ? isUpcoming(e.event_date) : !isUpcoming(e.event_date),
  );

  const upcomingCount = events.filter((e) => isUpcoming(e.event_date)).length;
    const totalEvents = events.length;

    const futureSignups = events
      .filter((e) => isUpcoming(e.event_date))
      .reduce((sum, e) => sum + (e.tickets_sold ?? 0), 0);

    const pastAttendance = events
      .filter((e) => !isUpcoming(e.event_date))
      .reduce((sum, e) => sum + (e.tickets_sold ?? 0), 0);

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
          Performance Summary
        </p>

        <h1 className="mt-1 text-2xl font-bold text-white">
          {user?.forename} {user?.surname}
        </h1>

        <p className="mt-1 text-sm text-gray-400">
          Track your upcoming performances, attendance, and event engagement.
        </p>

        <p className="mt-1 text-sm text-gray-500">
          {user?.email}
        </p>
      </div>

      {/* Stats */}
      <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
          <div className="text-3xl font-bold text-white">{totalEvents}</div>
          <div className="mt-1 text-sm text-gray-400">Total Events</div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
          <div className="text-3xl font-bold text-white">{upcomingCount}</div>
          <div className="mt-1 text-sm text-gray-400">Upcoming Events</div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
          <div className="text-3xl font-bold text-white">
            {futureSignups.toLocaleString()}
          </div>
          <div className="mt-1 text-sm text-gray-400">Future Signups</div>
        </div>

        <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 text-center">
          <div className="text-3xl font-bold text-white">
            {pastAttendance.toLocaleString()}
          </div>
          <div className="mt-1 text-sm text-gray-400">Past Attendance</div>
        </div>
      </div>

      {/* Pending appearance requests — only actionable here when the
          performer has no manager to decide on their behalf */}
      {isUnmanaged && pendingRequests.length > 0 && (
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-white">Pending Requests</h2>
          <p className="mt-1 text-sm text-gray-400">
            You don't have a manager on file, so you can approve or decline these yourself.
          </p>
          <div className="mt-4 space-y-3">
            {pendingRequests.map((r) => (
              <div
                key={r.request_id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-5 sm:flex sm:items-center sm:justify-between"
              >
                <div>
                  <h3 className="text-base font-semibold text-white">{r.event_name}</h3>
                  <p className="mt-0.5 text-sm text-gray-400">{formatDate(r.event_date)}</p>
                  <p className="mt-0.5 text-sm text-gray-500">
                    {r.venue.venue_name} · {r.venue.venue_address}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">
                    Requested by {r.requested_by}
                    {r.fee_offer != null && ` · Fee offer $${r.fee_offer.toLocaleString()}`}
                  </p>
                  {r.notes && <p className="mt-1 text-xs text-gray-500">"{r.notes}"</p>}
                </div>
                <div className="mt-4 flex gap-2 sm:mt-0">
                  <button
                    onClick={() => handleDecide(r.request_id, 'declined')}
                    disabled={decidingId === r.request_id}
                    className="rounded-lg border border-gray-700 px-4 py-2 text-sm font-medium text-gray-300 hover:border-red-700 hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Decline
                  </button>
                  <button
                    onClick={() => handleDecide(r.request_id, 'approved')}
                    disabled={decidingId === r.request_id}
                    className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    Approve
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="mt-10 flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1 w-fit">
        {(['upcoming', 'past'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${
              tab === t ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
            }`}
          >
            {t === 'upcoming' ? '🎤 Upcoming' : '⏳ Past'}
          </button>
        ))}
      </div>

      {/* Events */}
      <div className="mt-6 space-y-4">
        {loading ? (
          [1, 2].map((i) => (
            <div key={i} className="h-36 animate-pulse rounded-2xl bg-gray-800" />
          ))
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl">🎤</div>
            <h3 className="mt-4 text-lg font-semibold text-white">
              {tab === 'upcoming' ? 'No upcoming performances' : 'No past performances'}
            </h3>
            <p className="mt-2 text-sm text-gray-400">
              Your upcoming booked performances will appear here.
            </p>
          </div>
        ) : (
          filtered.map((event) => {
            const soldPct = event.tickets_sold
              ? Math.round((event.tickets_sold / event.venue.capacity) * 100)
              : 0;
            const icon = CATEGORY_ICONS[event.category ?? 'Music'] ?? '🎟';

            return (
              <div
                key={event.event_id}
                className="rounded-2xl border border-gray-800 bg-gray-900 p-6"
              >
                <div className="flex flex-col gap-6 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex gap-4">
                    <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-indigo-900/40 text-2xl">
                      {icon}
                    </div>
                    <div>
                      <h3 className="text-base font-semibold text-white">{event.event_name}</h3>
                      <p className="mt-0.5 text-sm text-gray-400">{formatDate(event.event_date)}</p>
                      <p className="mt-0.5 text-sm text-gray-500">
                        {event.venue.venue_name} · {event.venue.venue_address}
                      </p>

                      {event.category && (
                        <span className="mt-2 inline-block rounded-full border border-indigo-500/30 bg-indigo-900/20 px-2.5 py-0.5 text-xs font-medium text-indigo-300">
                          {event.category}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Attendance info */}
                  <div className="shrink-0 rounded-xl border border-gray-800 bg-gray-800/50 p-4 sm:text-right">
                    <div className="text-xs font-medium uppercase tracking-wider text-gray-500">
                      {tab === 'upcoming'
                        ? 'Current Signups'
                        : 'Final Attendance'}
                    </div>
                    <div className="mt-1 text-2xl font-bold text-white">
                      {event.tickets_sold?.toLocaleString() ?? '—'}
                    </div>
                    <div className="text-xs text-gray-400">
                      {tab === 'upcoming'
                        ? `${event.venue.capacity.toLocaleString()} seats available`
                        : `${event.venue.capacity.toLocaleString()} venue capacity`}
                    </div>
                    <div className="mt-2 h-1.5 w-full rounded-full bg-gray-700">
                      <div
                        className={`h-1.5 rounded-full ${soldPct >= 80 ? 'bg-green-500' : soldPct >= 50 ? 'bg-yellow-500' : 'bg-indigo-500'}`}
                        style={{ width: `${soldPct}%` }}
                      />
                    </div>
                      <div className="mt-1 text-xs text-gray-500">
                        {tab === 'upcoming'
                          ? `${soldPct}% reserved`
                          : `${soldPct}% attendance`}
                      </div>
                  </div>
                </div>

                <div className="mt-4 border-t border-gray-800 pt-4 flex items-center justify-between">
                  <div className="text-xs text-gray-500">
                    Organized by <span className="text-gray-300">{event.organizer_name}</span>
                  </div>
                  <Link
                    href={`/events/${event.event_id}`}
                    className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                  >
                    View event page →
                  </Link>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

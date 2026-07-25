'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { getOrganizerEvents, getOrganizerReports, deactivateEvent, createEvent, getVenues, getManagedArtists, searchArtists, sendAppearanceRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import StatCard from '@/components/StatCard';
import type { Event, OrganizerReport, Venue, ManagedArtist, ArtistSearchResult } from '@/lib/types';

function formatDate(dateStr: string) {
  const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { month: 'short', day: 'numeric', year: 'numeric' });
}

type OrgTab = 'events' | 'reports' | 'create' | 'artists';

interface PendingInvite {
  artist: ArtistSearchResult;
  fee_offer: string;
  notes: string;
}

export default function OrganizerPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();

  const [events, setEvents] = useState<Event[]>([]);
  const [reports, setReports] = useState<OrganizerReport[]>([]);
  const [venues, setVenues] = useState<Venue[]>([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<OrgTab>('events');
  const [deactivating, setDeactivating] = useState<number | null>(null);
  const [artists, setArtists] = useState<ManagedArtist[]>([]);


  // Create event form state
  const [newEvent, setNewEvent] = useState({
    name: '',
    date: '',
    venueId: '',
    description: '',
    category: 'Music',
  });
  const [ticketTypes, setTicketTypes] = useState<{ tier: string; price: string }[]>([
    { tier: 'General', price: '' },
  ]);
  const [createSuccess, setCreateSuccess] = useState(false);
  const [createError, setCreateError] = useState('');
  const [creating, setCreating] = useState(false);

  const [artistQuery, setArtistQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ArtistSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<PendingInvite[]>([]);
  const [sendingInvites, setSendingInvites] = useState(false);

  useEffect(() => {
  if (authLoading) return;
  if (!user) {
    router.push('/login');
    return;
  }

  getOrganizerEvents(token ?? '').then(setEvents).catch(() => setEvents([]));
  getOrganizerReports(token ?? '').then(setReports).catch(() => setReports([]));
  getVenues(token ?? '').then(setVenues).catch(() => setVenues([]));
  getManagedArtists(token ?? '').then(setArtists).catch(() => setArtists([]));
  setLoading(false);
}, [user, token, router, authLoading]);

  useEffect(() => {
    if (!artistQuery.trim()) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const timeout = setTimeout(() => {
      searchArtists(token ?? '', artistQuery)
        .then(setSearchResults)
        .finally(() => setSearching(false));
    }, 300);

    return () => clearTimeout(timeout);
  }, [artistQuery, token]);

  async function handleDeactivate(eventId: number) {
    setDeactivating(eventId);
    try {
      await deactivateEvent(token ?? '', eventId);
      setEvents((prev) =>
        prev.map((e) => (e.event_id === eventId ? { ...e, is_active: false } : e)),
      );
    } finally {
      setDeactivating(null);
    }
  }

  const totalRevenue = reports.reduce((s, r) => s + r.revenue, 0);
  const totalSold = reports.reduce((s, r) => s + r.tickets_sold, 0);
  const activeCount = events.filter((e) => e.is_active).length;

  function updateTicketType(i: number, field: 'tier' | 'price', value: string) {
    setTicketTypes((prev) => prev.map((tt, idx) => (idx === i ? { ...tt, [field]: value } : tt)));
  }

  function addTicketType() {
    setTicketTypes((prev) => [...prev, { tier: '', price: '' }]);
  }

  function removeTicketType(i: number) {
    setTicketTypes((prev) => prev.filter((_, idx) => idx !== i));
  }

  function addInvite(artist: ArtistSearchResult) {
    if (pendingInvites.some((inv) => inv.artist.artist_id === artist.artist_id)) return;
    setPendingInvites((prev) => [...prev, { artist, fee_offer: '', notes: '' }]);
    setArtistQuery('');
    setSearchResults([]);
  }

  function removeInvite(artistId: number) {
    setPendingInvites((prev) => prev.filter((inv) => inv.artist.artist_id !== artistId));
  }

  function updateInviteField(artistId: number, field: 'fee_offer' | 'notes', value: string) {
    setPendingInvites((prev) =>
      prev.map((inv) =>
        inv.artist.artist_id === artistId ? { ...inv, [field]: value } : inv,
      ),
    );
  }

  async function handleCreateSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCreateError('');
    setCreating(true);
    try {
      const created = await createEvent(token ?? '', {
        event_name: newEvent.name,
        event_date: newEvent.date,
        category: newEvent.category,
        description: newEvent.description,
        venue: newEvent.venueId,
        ticket_types: ticketTypes.map((tt) => ({
          tier: tt.tier,
          price: parseFloat(tt.price) || 0,
        })),
      });
      setEvents((prev) => [created, ...prev]);

      if (pendingInvites.length > 0) {
        setSendingInvites(true);
        try {
          await Promise.all(
            pendingInvites.map((inv) =>
              sendAppearanceRequest(token ?? '', {
                event_id: created.event_id,
                artist_id: inv.artist.artist_id,
                fee_offer: inv.fee_offer ? Number(inv.fee_offer) : undefined,
                notes: inv.notes || undefined,
              }),
            ),
          );
        } finally {
          setSendingInvites(false);
        }
      }

      setCreateSuccess(true);
      setTimeout(() => setCreateSuccess(false), 3000);
      setNewEvent({ name: '', date: '', venueId: '', description: '', category: 'Music' });
      setTicketTypes([{ tier: 'General', price: '' }]);
      setPendingInvites([]);
      setTab('events');
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create event');
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Organizer Portal
            </p>
            <h1 className="mt-1 text-2xl font-bold text-white">
              Welcome, {user?.forename}
            </h1>
          </div>
          <button
            onClick={() => setTab('create')}
            className="rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-indigo-500"
          >
            + Create event
          </button>
        </div>
      </div>

      {/* Stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Total Revenue"
          value={`$${(totalRevenue / 1000000).toFixed(2)}M`}
          icon="💰"
          trend="vs last month"
          trendUp
          accent="green"
        />
        <StatCard
          label="Tickets Sold"
          value={totalSold.toLocaleString()}
          icon="🎟"
          trend="across all events"
          trendUp
          accent="indigo"
        />
        <StatCard
          label="Active Events"
          value={String(activeCount)}
          icon="📅"
          accent="purple"
        />
        <StatCard
          label="Avg. Attendance"
          value={reports.length ? `${Math.round(reports.reduce((s, r) => s + (r.tickets_sold / r.capacity) * 100, 0) / reports.length)}%` : '—'}
          icon="📊"
          accent="orange"
        />
      </div>

      {/* Tabs */}
      <div className="mt-10 flex gap-1 rounded-xl border border-gray-800 bg-gray-900 p-1 w-fit">
        {([
          { key: 'events', label: '📋 My Events' },
          { key: 'reports', label: '📊 Reports' },
          { key: 'create', label: '➕ Create Event' },
          { key: 'artists', label: '🎤 Artists' }, // NEW
        ] as { key: OrgTab; label: string }[]).map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-lg px-5 py-2 text-sm font-medium transition-colors ${tab === t.key ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white'
              }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-8">
        {/* Events tab */}
        {tab === 'events' && (
          <div>
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-800" />
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto rounded-2xl border border-gray-800">
                <table className="w-full min-w-[640px] text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-900">
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Event</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Date</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Venue</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Sold / Cap</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Status</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                    {events.map((event) => {
                      const pct = event.tickets_sold
                        ? Math.round((event.tickets_sold / event.venue.capacity) * 100)
                        : 0;
                      return (
                        <tr key={event.event_id} className="hover:bg-gray-800/40">
                          <td className="px-6 py-4">
                            <span className="font-medium text-white">{event.event_name}</span>
                          </td>
                          <td className="px-6 py-4 text-gray-400">{formatDate(event.event_date)}</td>
                          <td className="px-6 py-4 text-gray-400">{event.venue.venue_name}</td>
                          <td className="px-6 py-4">
                            <div className="flex items-center gap-2">
                              <div className="h-1.5 w-24 rounded-full bg-gray-700">
                                <div
                                  className="h-1.5 rounded-full bg-indigo-500"
                                  style={{ width: `${pct}%` }}
                                />
                              </div>
                              <span className="text-gray-400 text-xs">
                                {event.tickets_sold?.toLocaleString() ?? 0} / {event.venue.capacity.toLocaleString()}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span
                              className={`rounded-full px-2.5 py-1 text-xs font-medium ${event.is_active
                                  ? 'bg-green-900/40 text-green-400'
                                  : 'bg-gray-800 text-gray-500'
                                }`}
                            >
                              {event.is_active ? 'Active' : 'Inactive'}
                            </span>
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <Link
                                href={`/events/${event.event_id}`}
                                className="text-xs text-indigo-400 hover:text-indigo-300"
                              >
                                View
                              </Link>
                              {event.is_active && (
                                <button
                                  onClick={() => handleDeactivate(event.event_id)}
                                  disabled={deactivating === event.event_id}
                                  className="text-xs text-red-400 hover:text-red-300 disabled:opacity-50"
                                >
                                  {deactivating === event.event_id ? '…' : 'Deactivate'}
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Reports tab */}
        {tab === 'reports' && (
          <div className="space-y-6">
            <div className="overflow-x-auto rounded-2xl border border-gray-800">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-gray-800 bg-gray-900">
                    <th className="px-6 py-4 text-left font-medium text-gray-400">Event</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">Date</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">Tickets Sold</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">Capacity</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">Fill Rate</th>
                    <th className="px-6 py-4 text-left font-medium text-gray-400">Revenue</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                  {reports.map((r) => {
                    const fillRate = Math.round((r.tickets_sold / r.capacity) * 100);
                    return (
                      <tr key={r.event_id} className="hover:bg-gray-800/40">
                        <td className="px-6 py-4 font-medium text-white">{r.event_name}</td>
                        <td className="px-6 py-4 text-gray-400">{formatDate(r.event_date)}</td>
                        <td className="px-6 py-4 text-gray-300">{r.tickets_sold.toLocaleString()}</td>
                        <td className="px-6 py-4 text-gray-300">{r.capacity.toLocaleString()}</td>
                        <td className="px-6 py-4">
                          <div className="flex items-center gap-2">
                            <div className="h-1.5 w-20 rounded-full bg-gray-700">
                              <div
                                className={`h-1.5 rounded-full ${fillRate >= 80 ? 'bg-green-500' : fillRate >= 50 ? 'bg-yellow-500' : 'bg-red-500'}`}
                                style={{ width: `${fillRate}%` }}
                              />
                            </div>
                            <span className="text-gray-400 text-xs">{fillRate}%</span>
                          </div>
                        </td>
                        <td className="px-6 py-4 font-semibold text-green-400">
                          ${r.revenue.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Revenue summary */}
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6">
              <h3 className="text-sm font-semibold text-white">Revenue breakdown</h3>
              <div className="mt-4 space-y-3">
                {reports.map((r) => {
                  const pct = Math.round((r.revenue / totalRevenue) * 100);
                  return (
                    <div key={r.event_id}>
                      <div className="mb-1 flex justify-between text-xs">
                        <span className="text-gray-400 truncate max-w-48">{r.event_name}</span>
                        <span className="text-white ml-2">${(r.revenue / 1000).toFixed(0)}K</span>
                      </div>
                      <div className="h-2 w-full rounded-full bg-gray-800">
                        <div
                          className="h-2 rounded-full bg-indigo-500"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* Create event tab */}
        {tab === 'create' && (
          <div className="max-w-2xl">
            <div className="rounded-2xl border border-gray-800 bg-gray-900 p-8">
              <h2 className="text-lg font-semibold text-white">Create a new event</h2>
              <p className="mt-1 text-sm text-gray-400">
                Fill in the details below. The event will be listed for ticket sales once published.
              </p>

              {createSuccess && (
                <div className="mt-4 rounded-xl border border-green-800 bg-green-900/20 px-4 py-3 text-sm text-green-400">
                  ✅ Event created successfully!
                </div>
              )}
              {createError && (
                <div className="mt-4 rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                  {createError}
                </div>
              )}

              <form onSubmit={handleCreateSubmit} className="mt-6 space-y-5">
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Event name</label>
                  <input
                    type="text"
                    required
                    value={newEvent.name}
                    onChange={(e) => setNewEvent({ ...newEvent, name: e.target.value })}
                    placeholder="e.g. Summer Music Festival 2026"
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">Date</label>
                    <input
                      type="date"
                      required
                      value={newEvent.date}
                      onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="mb-1.5 block text-sm font-medium text-gray-300">Category</label>
                    <select
                      value={newEvent.category}
                      onChange={(e) => setNewEvent({ ...newEvent, category: e.target.value })}
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500"
                    >
                      {['Music', 'Sports', 'Arts', 'Comedy'].map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Venue</label>
                  <select
                    required
                    value={newEvent.venueId}
                    onChange={(e) => setNewEvent({ ...newEvent, venueId: e.target.value })}
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">Select a venue…</option>
                    {venues.map((v) => (
                      <option key={v.venue_id} value={v.venue_id}>
                        {v.venue_name} — {v.venue_address} (cap. {v.capacity.toLocaleString()})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-sm font-medium text-gray-300">Ticket types</label>
                    <button
                      type="button"
                      onClick={addTicketType}
                      className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                    >
                      + Add tier
                    </button>
                  </div>
                  <div className="space-y-2">
                    {ticketTypes.map((tt, i) => (
                      <div key={i} className="flex gap-2">
                        <input
                          type="text"
                          required
                          placeholder="Tier name (e.g. VIP)"
                          value={tt.tier}
                          onChange={(e) => updateTicketType(i, 'tier', e.target.value)}
                          className="flex-1 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        <input
                          type="number"
                          required
                          min="0.01"
                          step="0.01"
                          placeholder="Price"
                          value={tt.price}
                          onChange={(e) => updateTicketType(i, 'price', e.target.value)}
                          className="w-28 rounded-xl border border-gray-700 bg-gray-800 px-4 py-2.5 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                        />
                        {ticketTypes.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeTicketType(i)}
                            className="rounded-xl border border-gray-700 px-3 text-gray-500 hover:border-red-700 hover:text-red-400"
                          >
                            ✕
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">Description</label>
                  <textarea
                    rows={4}
                    value={newEvent.description}
                    onChange={(e) => setNewEvent({ ...newEvent, description: e.target.value })}
                    placeholder="Describe the event…"
                    className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Invite artists section */}
                <div className="border-t border-gray-800 pt-5">
                  <label className="mb-1.5 block text-sm font-medium text-gray-300">
                    Invite artists to perform
                  </label>
                  <p className="mb-3 text-xs text-gray-500">
                    Search for artists and send them an appearance request for this event.
                  </p>

                  <div className="relative">
                    <input
                      type="text"
                      value={artistQuery}
                      onChange={(e) => setArtistQuery(e.target.value)}
                      placeholder="Search artists by name…"
                      className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    />

                    {artistQuery && (
                      <div className="absolute z-10 mt-1 w-full overflow-hidden rounded-xl border border-gray-700 bg-gray-800 shadow-lg">
                        {searching ? (
                          <div className="px-4 py-3 text-sm text-gray-400">Searching…</div>
                        ) : searchResults.length === 0 ? (
                          <div className="px-4 py-3 text-sm text-gray-500">No artists found</div>
                        ) : (
                          searchResults.map((artist) => (
                            <button
                              key={artist.artist_id}
                              type="button"
                              onClick={() => addInvite(artist)}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-left text-sm text-white hover:bg-gray-700"
                            >
                              <span>{artist.artist_name}</span>
                              {artist.genre && <span className="text-xs text-gray-400">{artist.genre}</span>}
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>

                  {pendingInvites.length > 0 && (
                    <div className="mt-4 space-y-3">
                      {pendingInvites.map((inv) => (
                        <div
                          key={inv.artist.artist_id}
                          className="rounded-xl border border-gray-700 bg-gray-800/50 p-4"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-white">{inv.artist.artist_name}</span>
                            <button
                              type="button"
                              onClick={() => removeInvite(inv.artist.artist_id)}
                              className="text-xs text-red-400 hover:text-red-300"
                            >
                              Remove
                            </button>
                          </div>

                          <div className="mt-3 grid grid-cols-2 gap-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={inv.fee_offer}
                              onChange={(e) => updateInviteField(inv.artist.artist_id, 'fee_offer', e.target.value)}
                              placeholder="Fee offer ($)"
                              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                            />
                            <input
                              type="text"
                              value={inv.notes}
                              onChange={(e) => updateInviteField(inv.artist.artist_id, 'notes', e.target.value)}
                              placeholder="Note (optional)"
                              className="rounded-lg border border-gray-700 bg-gray-800 px-3 py-2 text-xs text-white placeholder-gray-500 outline-none focus:border-indigo-500"
                            />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={creating || sendingInvites}
                  className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {creating ? 'Publishing…' : sendingInvites ? 'Sending invites…' : 'Publish event'}
                </button>
              </form>
            </div>
          </div>
        )}

        {/* Artists tab */}
        {tab === 'artists' && (
          <div>
            {loading ? (
              // Same skeleton pattern used by the Events tab while data loads
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="h-20 animate-pulse rounded-2xl bg-gray-800" />
                ))}
              </div>
            ) : artists.length === 0 ? (
              // Empty state, matching the style used elsewhere (e.g. dashboard bookings)
              <div className="py-16 text-center">
                <div className="text-5xl">🎤</div>
                <h3 className="mt-4 text-lg font-semibold text-white">No artists under management</h3>
                <p className="mt-2 text-sm text-gray-400">
                  Artists you manage will appear here once added.
                </p>
              </div>
            ) : (
              <div className="overflow-hidden rounded-2xl border border-gray-800">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-gray-800 bg-gray-900">
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Artist</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Genre</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Upcoming</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Pending requests</th>
                      <th className="px-6 py-4 text-left font-medium text-gray-400">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800 bg-gray-900/50">
                    {artists.map((artist) => (
                      <tr key={artist.artist_id} className="hover:bg-gray-800/40">
                        <td className="px-6 py-4">
                          <span className="font-medium text-white">{artist.artist_name}</span>
                        </td>
                        <td className="px-6 py-4 text-gray-400">{artist.genre ?? '—'}</td>
                        <td className="px-6 py-4 text-gray-400">{artist.upcoming_appearance_count}</td>
                        <td className="px-6 py-4">
                          {/* Badge only shows color/emphasis when there's something to act on */}
                          {artist.pending_request_count > 0 ? (
                            <span className="rounded-full bg-yellow-900/40 px-2.5 py-1 text-xs font-medium text-yellow-400">
                              {artist.pending_request_count} pending
                            </span>
                          ) : (
                            <span className="rounded-full bg-gray-800 px-2.5 py-1 text-xs font-medium text-gray-500">
                              Up to date
                            </span>
                          )}
                        </td>
                        <td className="px-6 py-4">
                          <Link
                            href={`/organizer/artists/${artist.artist_id}`}
                            className="text-xs font-medium text-indigo-400 hover:text-indigo-300"
                          >
                            View inbox →
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>

  );
}

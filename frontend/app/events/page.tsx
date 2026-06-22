'use client';

import { useState, useEffect } from 'react';
import EventCard from '@/components/EventCard';
import { getEvents } from '@/lib/api';
import type { Event } from '@/lib/types';

const CATEGORIES = ['All', 'Music', 'Sports', 'Arts', 'Comedy'];

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('All');

  useEffect(() => {
    setLoading(true);
    getEvents({ category: category === 'All' ? undefined : category, search: search || undefined })
      .then(setEvents)
      .finally(() => setLoading(false));
  }, [category, search]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white">Browse Events</h1>
        <p className="mt-2 text-gray-400">Discover live events across Canada</p>
      </div>

      {/* Search */}
      <div className="mt-8 flex flex-col gap-4 sm:flex-row">
        <div className="relative flex-1">
          <svg
            className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
            />
          </svg>
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search events, artists, venues…"
            className="w-full rounded-xl border border-gray-700 bg-gray-900 py-3 pl-11 pr-4 text-sm text-white placeholder-gray-500 outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Category tabs */}
      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className={`shrink-0 rounded-full px-5 py-2 text-sm font-medium transition-colors ${
              category === cat
                ? 'bg-indigo-600 text-white'
                : 'border border-gray-700 text-gray-400 hover:border-gray-500 hover:text-white'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* Results */}
      <div className="mt-8">
        {loading ? (
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-72 animate-pulse rounded-2xl bg-gray-800" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="py-24 text-center">
            <div className="text-5xl">🎟</div>
            <h3 className="mt-4 text-lg font-semibold text-white">No events found</h3>
            <p className="mt-2 text-sm text-gray-400">
              Try a different search term or category.
            </p>
          </div>
        ) : (
          <>
            <p className="mb-6 text-sm text-gray-500">
              {events.length} event{events.length !== 1 ? 's' : ''} found
            </p>
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {events.map((event) => (
                <EventCard key={event.event_id} event={event} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

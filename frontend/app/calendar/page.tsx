'use client';

import { useState, useEffect } from 'react';
import EventCalendar from '@/components/EventCalendar';
import { getEvents } from '@/lib/api';
import type { Event } from '@/lib/types';

export default function CalendarPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getEvents()
      .then(setEvents)
      .finally(() => setLoading(false));
  }, []);

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-6 py-10">
      <div className="mx-auto max-w-7xl">
        <h1 className="mb-2 text-4xl font-bold text-white">Event Calendar</h1>
        <p className="mb-8 text-gray-400">Browse all upcoming Tickora events by date.</p>

        {loading ? (
          <div className="h-[600px] animate-pulse rounded-2xl bg-gray-800" />
        ) : (
          <EventCalendar events={events} />
        )}
      </div>
    </main>
  );
}

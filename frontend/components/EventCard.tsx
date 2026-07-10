import Link from 'next/link';
import type { Event } from '@/lib/types';

const CATEGORY_COLORS: Record<string, string> = {
  Music: 'bg-purple-900/50 text-purple-300 border-purple-800/50',
  Sports: 'bg-green-900/50 text-green-300 border-green-800/50',
  Arts: 'bg-pink-900/50 text-pink-300 border-pink-800/50',
  Comedy: 'bg-yellow-900/50 text-yellow-300 border-yellow-800/50',
};

const CATEGORY_GRADIENTS: Record<string, string> = {
  Music: 'from-purple-900 to-indigo-900',
  Sports: 'from-green-900 to-emerald-900',
  Arts: 'from-pink-900 to-rose-900',
  Comedy: 'from-yellow-900 to-orange-900',
};

const CATEGORY_ICONS: Record<string, string> = {
  Music: '🎵',
  Sports: '🏀',
  Arts: '🎭',
  Comedy: '😄',
};

function formatDate(dateStr: string) {
  const d = new Date(dateStr.split('T')[0] + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function minPrice(event: Event) {
  if (!event.ticket_types?.length) return null;
  return Math.min(...event.ticket_types.map((t) => t.price));
}

export default function EventCard({ event }: { event: Event }) {
  const cat = event.category ?? 'Music';
  const gradient = CATEGORY_GRADIENTS[cat] ?? 'from-gray-900 to-gray-800';
  const icon = CATEGORY_ICONS[cat] ?? '🎟';
  const badgeClass = CATEGORY_COLORS[cat] ?? 'bg-gray-800 text-gray-300 border-gray-700';
  const price = minPrice(event);
  const soldPct = event.tickets_sold && event.venue.capacity
    ? Math.round((event.tickets_sold / event.venue.capacity) * 100)
    : null;

  return (
    <Link href={`/events/${event.event_id}`} className="group block">
      <div className="overflow-hidden rounded-2xl border border-gray-800 bg-gray-900 transition-all duration-300 hover:-translate-y-1 hover:border-indigo-500/50 hover:shadow-xl hover:shadow-indigo-900/20">
        {/* Image / gradient area */}
        <div className={`relative flex h-44 items-center justify-center bg-gradient-to-br ${gradient}`}>
          <span className="text-5xl opacity-60 transition-transform duration-300 group-hover:scale-110">
            {icon}
          </span>
          <div className="absolute inset-0 bg-black/20" />
          <span
            className={`absolute right-3 top-3 rounded-full border px-2.5 py-0.5 text-xs font-medium ${badgeClass}`}
          >
            {cat}
          </span>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="line-clamp-1 text-base font-semibold text-white transition-colors group-hover:text-indigo-300">
            {event.event_name}
          </h3>

          <div className="mt-3 space-y-1.5">
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              {formatDate(event.event_date)}
            </div>
            <div className="flex items-center gap-2 text-sm text-gray-400">
              <svg className="h-3.5 w-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              <span className="line-clamp-1">{event.venue.venue_name}</span>
            </div>
          </div>

          {soldPct !== null && (
            <div className="mt-3">
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{event.tickets_sold?.toLocaleString()} sold</span>
                <span>{soldPct}% full</span>
              </div>
              <div className="h-1 w-full rounded-full bg-gray-800">
                <div
                  className="h-1 rounded-full bg-indigo-500"
                  style={{ width: `${Math.min(soldPct, 100)}%` }}
                />
              </div>
            </div>
          )}

          <div className="mt-4 flex items-center justify-between">
            {price !== null ? (
              <span className="text-sm text-gray-400">
                From <span className="font-semibold text-white">${price.toFixed(2)}</span>
              </span>
            ) : (
              <span className="text-sm text-gray-500">—</span>
            )}
            <span className="rounded-full bg-indigo-600/20 px-3 py-1 text-xs font-medium text-indigo-400 transition-colors group-hover:bg-indigo-600 group-hover:text-white">
              Get tickets →
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

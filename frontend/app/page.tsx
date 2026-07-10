import Link from 'next/link';
import EventCard from '@/components/EventCard';
import { mockEvents } from '@/lib/mock-data';

const CATEGORIES = [
  { name: 'Music', icon: '🎵', href: '/events?category=Music' },
  { name: 'Sports', icon: '🏀', href: '/events?category=Sports' },
  { name: 'Arts', icon: '🎭', href: '/events?category=Arts' },
  { name: 'Comedy', icon: '😄', href: '/events?category=Comedy' },
];

const WHY_TICKORA = [
  {
    icon: '💸',
    title: 'Transparent Pricing',
    desc: 'No hidden fees. The price you see is the price you pay. Always.',
  },
  {
    icon: '⚡',
    title: 'Real-Time Inventory',
    desc: 'Live seat availability so you always know exactly how many tickets remain.',
  },
  {
    icon: '🔒',
    title: 'Secure Checkout',
    desc: 'Payment handled by trusted third-party processors. Your card data never touches our servers.',
  },
];

export default function HomePage() {
  const featured = mockEvents.slice(0, 3);

  return (
    <div>
      {/* Hero */}
      <section className="relative overflow-hidden bg-[#0a0a0f] px-4 pb-24 pt-20 sm:px-6 lg:px-8">
        <div className="absolute inset-0 -z-10">
          <div className="absolute left-1/2 top-0 -translate-x-1/2 h-[600px] w-[900px] rounded-full bg-indigo-900/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-4xl text-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-900/20 px-4 py-1.5 text-sm font-medium text-indigo-300">
            🎟 Canada's fairest ticketing platform
          </span>

          <h1 className="mt-6 text-5xl font-extrabold leading-tight tracking-tight text-white sm:text-6xl lg:text-7xl">
            Experience live events{' '}
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              like never before
            </span>
          </h1>

          <p className="mx-auto mt-6 max-w-2xl text-lg leading-relaxed text-gray-400">
            Fair prices. Real-time inventory. Zero hidden fees. Discover concerts, sports, arts,
            comedy — and book in seconds.
          </p>

          <div className="mt-10 flex flex-col items-center gap-4 sm:flex-row sm:justify-center">
            <Link
              href="/events"
              className="w-full rounded-full bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-indigo-900/50 transition-all hover:bg-indigo-500 hover:shadow-indigo-700/50 sm:w-auto"
            >
              Browse events →
            </Link>
            <Link
              href="/register"
              className="w-full rounded-full border border-gray-700 px-8 py-3.5 text-base font-semibold text-gray-300 transition-colors hover:border-gray-500 hover:text-white sm:w-auto"
            >
              Create account
            </Link>
          </div>

          {/* Stats */}
          <div className="mt-14 flex flex-wrap justify-center gap-8">
            {[
              { value: '50K+', label: 'Events annually' },
              { value: '$0', label: 'Hidden fees' },
              { value: '100%', label: 'Secure checkout' },
            ].map((s) => (
              <div key={s.label} className="text-center">
                <div className="text-3xl font-extrabold text-white">{s.value}</div>
                <div className="mt-1 text-sm text-gray-500">{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Categories */}
      <section className="border-t border-gray-800/50 bg-[#0d0d16] px-4 py-12 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {CATEGORIES.map((cat) => (
              <Link
                key={cat.name}
                href={cat.href}
                className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-800 bg-gray-900/50 py-8 transition-all hover:border-indigo-500/50 hover:bg-gray-900"
              >
                <span className="text-3xl transition-transform group-hover:scale-110">{cat.icon}</span>
                <span className="text-sm font-medium text-gray-300 group-hover:text-white">
                  {cat.name}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Featured events */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="flex items-end justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
                On sale now
              </p>
              <h2 className="mt-1 text-2xl font-bold text-white">Featured Events</h2>
            </div>
            <Link href="/events" className="text-sm font-medium text-indigo-400 hover:text-indigo-300">
              View all →
            </Link>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featured.map((event) => (
              <EventCard key={event.event_id} event={event} />
            ))}
          </div>
        </div>
      </section>

      {/* Why Tickora */}
      <section className="border-t border-gray-800/50 bg-[#0d0d16] px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <div className="text-center">
            <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">
              Our promise
            </p>
            <h2 className="mt-2 text-2xl font-bold text-white">Why choose Tickora?</h2>
          </div>

          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            {WHY_TICKORA.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-gray-800 bg-gray-900/40 p-8 text-center"
              >
                <div className="text-4xl">{item.icon}</div>
                <h3 className="mt-4 text-base font-semibold text-white">{item.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-400">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="px-4 py-16 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-3xl overflow-hidden rounded-3xl border border-indigo-500/20 bg-gradient-to-br from-indigo-900/30 via-purple-900/20 to-pink-900/10 px-8 py-16 text-center">
          <h2 className="text-3xl font-bold text-white">Ready to find your next event?</h2>
          <p className="mt-4 text-gray-400">
            Join thousands of Canadians who book smarter with Tickora.
          </p>
          <Link
            href="/events"
            className="mt-8 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-8 py-3.5 text-base font-semibold text-white shadow-lg transition-all hover:bg-indigo-500"
          >
            Explore all events →
          </Link>
        </div>
      </section>
    </div>
  );
}

import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="border-t border-gray-800 bg-[#0a0a0f]">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <span className="text-xl font-bold tracking-tight text-white">
              tick<span className="text-indigo-400">ora</span>
            </span>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-gray-400">
              Fair event ticketing with transparent pricing and zero hidden fees. Your experience
              comes first.
            </p>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Explore
            </h3>
            <ul className="mt-4 space-y-3">
              {[
                { label: 'Browse Events', href: '/events' },
                { label: 'Music', href: '/events?category=Music' },
                { label: 'Sports', href: '/events?category=Sports' },
                { label: 'Arts & Theatre', href: '/events?category=Arts' },
                { label: 'Comedy', href: '/events?category=Comedy' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-500">
              Account
            </h3>
            <ul className="mt-4 space-y-3">
              {[
                { label: 'Sign In', href: '/login' },
                { label: 'Create Account', href: '/register' },
                { label: 'My Bookings', href: '/dashboard' },
                { label: 'Organizer Portal', href: '/organizer' },
              ].map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-sm text-gray-400 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="mt-10 flex flex-col items-start justify-between gap-4 border-t border-gray-800 pt-8 sm:flex-row sm:items-center">
          <p className="text-sm text-gray-500">
            © {new Date().getFullYear()} Tickora. All rights reserved.
          </p>
          <div className="flex gap-6">
            <span className="cursor-pointer text-sm text-gray-500 hover:text-gray-300">
              Privacy Policy
            </span>
            <span className="cursor-pointer text-sm text-gray-500 hover:text-gray-300">
              Terms of Service
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}

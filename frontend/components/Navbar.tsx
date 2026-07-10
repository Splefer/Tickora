'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  function handleLogout() {
    logout();
    setUserMenuOpen(false);
    router.push('/');
  }

  const dashboardHref =
    user?.role === 'organizer'
      ? '/organizer'
      : user?.role === 'performer'
        ? '/performer'
        : '/dashboard';

  return (
    <header className="sticky top-0 z-50 border-b border-gray-800 bg-[#0a0a0f]/95 backdrop-blur-sm">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2">
            <span className="text-xl font-bold tracking-tight text-white">
              tick<span className="text-indigo-400">ora</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden items-center gap-8 md:flex">
            <Link
              href="/events"
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Browse Events
            </Link>

            <Link
              href="/calendar"
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              Calendar
            </Link>

            {/* NEW: My Events */}
            <Link
              href="/my-events"
              className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
            >
              My Events
            </Link>

            {user?.role === 'organizer' && (
              <Link
                href="/organizer"
                className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                My Events
              </Link>
            )}

            {user?.role === 'performer' && (
              <Link
                href="/performer"
                className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
              >
                My Performances
              </Link>
            )}
          </nav>

          {/* Desktop auth */}
          <div className="hidden items-center gap-3 md:flex">
            {user ? (
              <div className="relative">
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center gap-2 rounded-full bg-gray-800 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-gray-700"
                >
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold uppercase">
                    {(user.forename?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                  </span>
                  {user.forename ?? user.email ?? 'User'}
                  <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>

                {userMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 rounded-xl border border-gray-800 bg-gray-900 py-1 shadow-2xl">
                    <Link
                      href={dashboardHref}
                      onClick={() => setUserMenuOpen(false)}
                      className="block px-4 py-2 text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Dashboard
                    </Link>

                    <button
                      onClick={handleLogout}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-800 hover:text-white"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-sm font-medium text-gray-400 transition-colors hover:text-white"
                >
                  Sign in
                </Link>

                <Link
                  href="/register"
                  className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500"
                >
                  Get tickets
                </Link>
              </>
            )}
          </div>

          {/* Mobile hamburger */}
          <button
            className="rounded-lg p-2 text-gray-400 hover:bg-gray-800 hover:text-white md:hidden"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label="Toggle menu"
          >
            {menuOpen ? (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            ) : (
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            )}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="border-t border-gray-800 bg-[#0a0a0f] px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-4">
            <Link
              href="/events"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              Browse Events
            </Link>

            <Link
              href="/calendar"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              Calendar
            </Link>

            {/* NEW: My Events */}
            <Link
              href="/my-events"
              onClick={() => setMenuOpen(false)}
              className="text-sm font-medium text-gray-300 hover:text-white"
            >
              My Events
            </Link>

            {user ? (
              <>
                <Link
                  href={dashboardHref}
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium text-gray-300 hover:text-white"
                >
                  Dashboard
                </Link>

                <button
                  onClick={handleLogout}
                  className="text-left text-sm font-medium text-gray-300 hover:text-white"
                >
                  Sign out
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  onClick={() => setMenuOpen(false)}
                  className="text-sm font-medium text-gray-300 hover:text-white"
                >
                  Sign in
                </Link>

                <Link
                  href="/register"
                  onClick={() => setMenuOpen(false)}
                  className="w-fit rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white"
                >
                  Get tickets
                </Link>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
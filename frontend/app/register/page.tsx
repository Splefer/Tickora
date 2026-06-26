'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import type { Role } from '@/lib/types';

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await register({
        // Temporary default values until the wireframe/backend requirements are finalized.
        forename: 'John',
        surname: 'Smith',
        email,
        password,
        role: 'customer' as Role,
      });

      router.push('/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-[calc(100vh-64px)] justify-center px-4 py-24">
      <div className="w-full max-w-sm">
        <div className="text-center">
          <span className="text-3xl font-bold tracking-tight text-white">
            tick<span className="text-indigo-400">ora</span>
          </span>

          <h1 className="mt-6 text-2xl font-bold text-white">Create your account</h1>

          <p className="mt-2 text-sm text-gray-400">
            Sign up to start using Tickora
          </p>
        </div>

        <div className="relative mt-20">
          <Link
            href="/login"
            className="absolute -top-14 right-0 rounded-full bg-gray-200 px-5 py-2 text-sm font-medium text-gray-900 transition-colors hover:bg-white"
          >
            Login
          </Link>

          <form
            onSubmit={handleSubmit}
            className="space-y-5 rounded-2xl border border-gray-800 bg-gray-900 p-8"
          >
            {error && (
              <div className="rounded-xl border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                {error}
              </div>
            )}

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Email
              </label>

              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm font-medium text-gray-300">
                Password
              </label>

              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-white placeholder-gray-500 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-xl bg-indigo-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? 'Creating account…' : 'Sign up'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
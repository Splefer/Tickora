'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { getArtistRequests, getManagedArtists, respondToAppearanceRequest } from '@/lib/api';
import { useAuth } from '@/context/AuthContext';
import type { AppearanceRequest, ManagedArtist } from '@/lib/types';

// Same date formatting convention used across dashboard/performer pages
function formatDate(dateStr: string) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString('en-CA', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

export default function ArtistInboxPage() {
  const { user, token, loading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const artistId = Number(params.artistId);

  const [artist, setArtist] = useState<ManagedArtist | null>(null);
  const [requests, setRequests] = useState<AppearanceRequest[]>([]);
  const [loading, setLoading] = useState(true);

  // Tracks which request is mid-approve/decline, so only that row shows a spinner/disabled state
  const [actingOn, setActingOn] = useState<number | null>(null);

  // Tracks which request currently has its decline-reason box open
  const [decliningId, setDecliningId] = useState<number | null>(null);
  const [declineReason, setDeclineReason] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    // Fetch the artist's own info (for the header) and their requests in parallel
    Promise.all([
      getManagedArtists(token ?? ''),
      getArtistRequests(token ?? '', artistId),
    ]).then(([artists, reqs]) => {
      setArtist(artists.find((a) => a.artist_id === artistId) ?? null);
      setRequests(reqs);
    }).finally(() => setLoading(false));
  }, [user, token, router, artistId, authLoading]);

  async function handleApprove(requestId: number) {
    setActingOn(requestId);
    try {
      const updated = await respondToAppearanceRequest(token ?? '', requestId, 'approved');
      setRequests((prev) => prev.map((r) => (r.request_id === requestId ? updated : r)));
    } finally {
      setActingOn(null);
    }
  }

  function openDeclineBox(requestId: number) {
    setDecliningId(requestId);
    setDeclineReason('');
  }

  async function confirmDecline(requestId: number) {
    setActingOn(requestId);
    try {
      const updated = await respondToAppearanceRequest(token ?? '', requestId, 'declined', declineReason);
      setRequests((prev) => prev.map((r) => (r.request_id === requestId ? updated : r)));
      setDecliningId(null);
    } finally {
      setActingOn(null);
    }
  }

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 lg:px-8">
      {/* Back link + header */}
      <Link href="/organizer" className="text-xs font-medium text-indigo-400 hover:text-indigo-300">
        ← Back to Artists
      </Link>
      <div className="mt-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-indigo-400">Artist Inbox</p>
        <h1 className="mt-1 text-2xl font-bold text-white">
          {artist?.artist_name ?? 'Loading…'}
        </h1>
        {artist?.genre && <p className="mt-1 text-sm text-gray-400">{artist.genre}</p>}
      </div>
    <div className="mt-8 space-y-4">
        {loading ? (
          [1, 2].map((i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-gray-800" />)
        ) : requests.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-5xl">📭</div>
            <h3 className="mt-4 text-lg font-semibold text-white">No appearance requests</h3>
            <p className="mt-2 text-sm text-gray-400">
              Requests from other organizers will show up here.
            </p>
          </div>
        ) : (
          requests.map((req) => (
            <div key={req.request_id} className="rounded-2xl border border-gray-800 bg-gray-900 p-5">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h3 className="font-semibold text-white">{req.event_name}</h3>
                  <p className="mt-0.5 text-sm text-gray-400">
                    {formatDate(req.event_date)} · {req.venue.venue_name}
                  </p>
                  <p className="mt-1 text-xs text-gray-500">Requested by {req.requested_by}</p>
                  {req.fee_offer !== undefined && (
                    <p className="mt-1 text-xs text-gray-500">Offer: ${req.fee_offer.toLocaleString()}</p>
                  )}
                  {req.notes && <p className="mt-2 text-sm text-gray-400">{req.notes}</p>}
                </div>

                {/* Status badge — matches the pending/approved/declined color pattern used elsewhere */}
                <span
                  className={`shrink-0 rounded-full px-3 py-1 text-xs font-medium ${
                    req.status === 'approved'
                      ? 'bg-green-900/40 text-green-400'
                      : req.status === 'declined'
                      ? 'bg-red-900/40 text-red-400'
                      : 'bg-yellow-900/40 text-yellow-400'
                  }`}
                >
                  {req.status[0].toUpperCase() + req.status.slice(1)}
                </span>
              </div>

              {/* Actions only show while the request is still pending */}
              {req.status === 'pending' && (
                <div className="mt-4 border-t border-gray-800 pt-4">
                  {decliningId === req.request_id ? (
                    <div className="space-y-2">
                      <textarea
                        rows={2}
                        value={declineReason}
                        onChange={(e) => setDeclineReason(e.target.value)}
                        placeholder="Reason for declining (optional)"
                        className="w-full rounded-xl border border-gray-700 bg-gray-800 px-3 py-2 text-sm text-white placeholder-gray-500 outline-none resize-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => confirmDecline(req.request_id)}
                          disabled={actingOn === req.request_id}
                          className="rounded-xl bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-500 disabled:opacity-50"
                        >
                          {actingOn === req.request_id ? 'Declining…' : 'Confirm decline'}
                        </button>
                        <button
                          onClick={() => setDecliningId(null)}
                          className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-medium text-gray-400 hover:text-white"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApprove(req.request_id)}
                        disabled={actingOn === req.request_id}
                        className="rounded-xl bg-indigo-600 px-4 py-2 text-xs font-medium text-white hover:bg-indigo-500 disabled:opacity-50"
                      >
                        {actingOn === req.request_id ? 'Approving…' : 'Approve'}
                      </button>
                      <button
                        onClick={() => openDeclineBox(req.request_id)}
                        disabled={actingOn === req.request_id}
                        className="rounded-xl border border-gray-700 px-4 py-2 text-xs font-medium text-gray-400 hover:border-red-700 hover:text-red-400 disabled:opacity-50"
                      >
                        Decline
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Show the reason after the fact, once declined */}
              {req.status === 'declined' && req.decline_reason && (
                <p className="mt-3 text-xs text-gray-500 italic">Reason: {req.decline_reason}</p>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
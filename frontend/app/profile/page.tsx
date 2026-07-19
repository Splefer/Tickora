'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  updateEmail,
  changePassword,
  updateForename,
  updateSurname,
  updateAddress,
  requestManagerLink,
  getPendingManagerRequests,
  approveManagerRequest,
  denyManagerRequest,
  getPerformerManager,
  getLinkedPerformers,
  type ManagerRequestInfo,
  type LinkedManager,
} from '@/lib/api';

export default function ProfilePage() {
  const { user, token, loading: authLoading, updateUser } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (authLoading) return;
    if (!user) router.push('/login');
  }, [user, authLoading, router]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-400 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
      <h1 className="mb-8 text-2xl font-bold text-white">Account Settings</h1>

      <div className="space-y-6">
        <NameSection />
        <EmailSection />
        <PasswordSection />
        <AddressSection />

        {user.role === 'performer' && <PerformerSection />}
        {user.role === 'manager' && <ManagerSection />}
      </div>
    </div>
  );

  // ── Name Section ──────────────────────────────────────────────────────────

  function NameSection() {
    const [forename, setForename] = useState(user!.forename);
    const [surname, setSurname] = useState(user!.surname);
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function handleSave() {
      setSaving(true);
      setError('');
      setMessage('');
      try {
        let updatedUser = user!;
        if (forename !== user!.forename) {
          const res = await updateForename(token!, forename);
          updatedUser = res.user;
        }
        if (surname !== user!.surname) {
          const res = await updateSurname(token!, surname);
          updatedUser = res.user;
        }
        updateUser(updatedUser);
        setMessage('Name updated.');
      } catch (e: any) {
        setError(e.message || 'Failed to update name.');
      } finally {
        setSaving(false);
      }
    }

    const changed = forename !== user!.forename || surname !== user!.surname;

    return (
      <SectionCard title="Name">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-sm text-gray-400">First Name</label>
            <input
              type="text"
              value={forename}
              onChange={(e) => setForename(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Last Name</label>
            <input
              type="text"
              value={surname}
              onChange={(e) => setSurname(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-400">{message}</p>}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!changed || saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </SectionCard>
    );
  }

  // ── Email Section ─────────────────────────────────────────────────────────

  function EmailSection() {
    const [email, setEmail] = useState(user!.email);
    const [password, setPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function handleSave() {
      setSaving(true);
      setError('');
      setMessage('');
      try {
        const res = await updateEmail(token!, password, email);
        updateUser(res.user);
        setMessage('Email updated.');
        setPassword('');
      } catch (e: any) {
        setError(e.message || 'Failed to update email.');
      } finally {
        setSaving(false);
      }
    }

    const changed = email !== user!.email;

    return (
      <SectionCard title="Email">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">New Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          {changed && (
            <div>
              <label className="mb-1 block text-sm text-gray-400">Current Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Required to change email"
                className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          )}
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-400">{message}</p>}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!changed || !password || saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Update Email'}
          </button>
        </div>
      </SectionCard>
    );
  }

  // ── Password Section ──────────────────────────────────────────────────────

  function PasswordSection() {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function handleSave() {
      if (newPassword !== confirmPassword) {
        setError('Passwords do not match.');
        return;
      }
      setSaving(true);
      setError('');
      setMessage('');
      try {
        await changePassword(token!, currentPassword, newPassword);
        setMessage('Password updated.');
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      } catch (e: any) {
        setError(e.message || 'Failed to update password.');
      } finally {
        setSaving(false);
      }
    }

    const valid = currentPassword && newPassword && confirmPassword;

    return (
      <SectionCard title="Password">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm text-gray-400">Current Password</label>
            <input
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">New Password</label>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Minimum 8 characters"
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-gray-400">Confirm New Password</label>
            <input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-400">{message}</p>}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!valid || saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Change Password'}
          </button>
        </div>
      </SectionCard>
    );
  }

  // ── Address Section ───────────────────────────────────────────────────────

  function AddressSection() {
    const [address, setAddress] = useState(user!.address || '');
    const [saving, setSaving] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    async function handleSave() {
      setSaving(true);
      setError('');
      setMessage('');
      try {
        const res = await updateAddress(token!, address);
        updateUser({ ...res.user, address });
        setMessage('Address updated.');
      } catch (e: any) {
        setError(e.message || 'Failed to update address.');
      } finally {
        setSaving(false);
      }
    }

    const changed = address !== (user!.address || '');

    return (
      <SectionCard title="Address">
        <div>
          <label className="mb-1 block text-sm text-gray-400">Address</label>
          <input
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter your address"
            className="w-full rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
        {message && <p className="mt-2 text-sm text-green-400">{message}</p>}
        <div className="mt-4 flex justify-end">
          <button
            onClick={handleSave}
            disabled={!changed || saving}
            className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? 'Saving...' : 'Save'}
          </button>
        </div>
      </SectionCard>
    );
  }

  // ── Performer Section ─────────────────────────────────────────────────────

  function PerformerSection() {
    const [managerId, setManagerId] = useState('');
    const [linkedManager, setLinkedManager] = useState<LinkedManager | null>(null);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [message, setMessage] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
      getPerformerManager(token!)
        .then((res) => setLinkedManager(res.manager))
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []);

    async function handleSubmit() {
      const id = parseInt(managerId, 10);
      if (!id) {
        setError('Please enter a valid manager ID.');
        return;
      }
      setSending(true);
      setError('');
      setMessage('');
      try {
        await requestManagerLink(token!, id);
        setMessage('Request sent successfully.');
        setManagerId('');
      } catch (e: any) {
        setError(e.message || 'Failed to send request.');
      } finally {
        setSending(false);
      }
    }

    return (
      <SectionCard title="Manager Link">
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : linkedManager ? (
          <div className="rounded-lg border border-gray-700 bg-gray-900/50 p-4">
            <p className="text-sm text-gray-400">You are linked to:</p>
            <p className="mt-1 font-medium text-white">
              {linkedManager.forename} {linkedManager.surname}
            </p>
            <p className="text-sm text-gray-500">{linkedManager.email}</p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Send a link request to a manager. Enter their user ID below.
            </p>
            <div className="flex gap-3">
              <input
                type="number"
                value={managerId}
                onChange={(e) => setManagerId(e.target.value)}
                placeholder="Manager ID"
                className="flex-1 rounded-lg border border-gray-700 bg-gray-900 px-3 py-2 text-white placeholder-gray-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
              <button
                onClick={handleSubmit}
                disabled={!managerId || sending}
                className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {sending ? 'Sending...' : 'Send Request'}
              </button>
            </div>
            {error && <p className="text-sm text-red-400">{error}</p>}
            {message && <p className="text-sm text-green-400">{message}</p>}
          </div>
        )}
      </SectionCard>
    );
  }

  // ── Manager Section ───────────────────────────────────────────────────────

  function ManagerSection() {
    const [requests, setRequests] = useState<ManagerRequestInfo[]>([]);
    const [performers, setPerformers] = useState<{ user_id: number; forename: string; surname: string; email: string }[]>([]);
    const [loading, setLoading] = useState(true);
    const [processing, setProcessing] = useState<number | null>(null);

    useEffect(() => {
      Promise.all([
        getPendingManagerRequests(token!).then((res) => setRequests(res.requests)),
        getLinkedPerformers(token!).then((res) => setPerformers(res.performers)),
      ])
        .catch(() => {})
        .finally(() => setLoading(false));
    }, []);

    async function handleApprove(requestId: number) {
      setProcessing(requestId);
      try {
        await approveManagerRequest(token!, requestId);
        setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
        // Refresh linked performers
        const res = await getLinkedPerformers(token!);
        setPerformers(res.performers);
      } catch {
      } finally {
        setProcessing(null);
      }
    }

    async function handleDeny(requestId: number) {
      setProcessing(requestId);
      try {
        await denyManagerRequest(token!, requestId);
        setRequests((prev) => prev.filter((r) => r.request_id !== requestId));
      } catch {
      } finally {
        setProcessing(null);
      }
    }

    return (
      <SectionCard title="Performer Requests">
        {loading ? (
          <p className="text-sm text-gray-400">Loading...</p>
        ) : (
          <div className="space-y-6">
            {/* Pending Requests */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-300">
                Pending Requests ({requests.length})
              </h3>
              {requests.length === 0 ? (
                <p className="text-sm text-gray-500">No pending requests.</p>
              ) : (
                <div className="space-y-3">
                  {requests.map((req) => (
                    <div
                      key={req.request_id}
                      className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 p-4"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {req.performer.forename} {req.performer.surname}
                        </p>
                        <p className="text-sm text-gray-500">{req.performer.email}</p>
                      </div>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleApprove(req.request_id)}
                          disabled={processing === req.request_id}
                          className="rounded-lg bg-green-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-green-500 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleDeny(req.request_id)}
                          disabled={processing === req.request_id}
                          className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-red-500 disabled:opacity-50"
                        >
                          Deny
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Linked Performers */}
            <div>
              <h3 className="mb-3 text-sm font-medium text-gray-300">
                Linked Performers ({performers.length})
              </h3>
              {performers.length === 0 ? (
                <p className="text-sm text-gray-500">No linked performers yet.</p>
              ) : (
                <div className="space-y-2">
                  {performers.map((p) => (
                    <div
                      key={p.user_id}
                      className="flex items-center justify-between rounded-lg border border-gray-700 bg-gray-900/50 p-3"
                    >
                      <div>
                        <p className="font-medium text-white">
                          {p.forename} {p.surname}
                        </p>
                        <p className="text-sm text-gray-500">{p.email}</p>
                      </div>
                      <span className="rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-400">
                        Linked
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}
      </SectionCard>
    );
  }
}

// ── Shared Card Component ───────────────────────────────────────────────────

function SectionCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-gray-800 bg-[#111827] p-6">
      <h2 className="mb-4 text-lg font-semibold text-white">{title}</h2>
      {children}
    </div>
  );
}

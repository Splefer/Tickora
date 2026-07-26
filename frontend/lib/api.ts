import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  Event,
  Venue,
  Booking,
  OrganizerReport,
  ManagedArtist,
  AppearanceRequest,
  ArtistSearchResult,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

async function request<T>(path: string, options?: RequestInit, token?: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Token ${token}` } : {}),
      ...(options?.headers ?? {}),
    },
  });
  if (!res.ok) throw new Error(`API error: ${res.status}`);
  return res.json() as Promise<T>;
}

function getApiErrorMessage(data: unknown, fallback: string): string {
  if (
    typeof data === 'object' &&
    data !== null &&
    'errors' in data &&
    Array.isArray((data as { errors?: unknown }).errors)
  ) {
    return (data as { errors: string[] }).errors.join(' ');
  }

  if (
    typeof data === 'object' &&
    data !== null &&
    'message' in data &&
    typeof (data as { message?: unknown }).message === 'string'
  ) {
    return (data as { message: string }).message;
  }

  return fallback;
}

function normalizeUser(rawUser: any): User {
  return {
    user_id: rawUser.user_id ?? rawUser.id ?? 0,
    forename: rawUser.forename ?? '',
    surname: rawUser.surname ?? '',
    email: rawUser.email ?? '',
    verified: rawUser.verified ?? false,
    created_at: rawUser.created_at ?? new Date().toISOString(),
    role: rawUser.role ?? 'customer',
    address: rawUser.address,
  };
}

function normalizeAuthResponse(data: any): AuthResponse {
  return {
    token: data.token ?? 'django-session',
    user: normalizeUser(data.user),
  };
}

// ── Auth ──────────────────────────────────────────────────────────────────────

const DEMO_USERS: Record<string, { password: string; user_id: number; forename: string; surname: string; role: string; token: string }> = {
  'customer@demo.com': {
    password: 'demo1234',
    user_id: 1,
    forename: 'Alex',
    surname: 'Thompson',
    role: 'customer',
    token: 'mock-token-customer',
  },
  'organizer@demo.com': {
    password: 'demo1234',
    user_id: 2,
    forename: 'Des',
    surname: 'Ryan',
    role: 'organizer',
    token: 'mock-token-organizer',
  },
  'performer@demo.com': {
    password: 'demo1234',
    user_id: 3,
    forename: 'Jamie',
    surname: 'Doe',
    role: 'performer',
    token: 'mock-token-performer',
  },
};

export async function login(creds: LoginCredentials): Promise<AuthResponse> {
  const demo = DEMO_USERS[creds.email.toLowerCase().trim()];
  if (demo && creds.password === demo.password) {
    return {
      token: demo.token,
      user: {
        user_id: demo.user_id,
        forename: demo.forename,
        surname: demo.surname,
        email: creds.email,
        verified: true,
        created_at: new Date().toISOString(),
        role: demo.role as User['role'],
      },
    };
  }

  const res = await fetch(`${API_URL}/api/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({ email: creds.email, password: creds.password }),
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(data, 'Login failed'));
  }

  return normalizeAuthResponse(data);
}

export async function loginAsOrganizer(creds: LoginCredentials): Promise<AuthResponse> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      const demo = DEMO_USERS[creds.email.toLowerCase().trim()];
      if (demo && creds.password === demo.password && demo.role === 'organizer') {
        resolve({
          token: demo.token,
          user: {
            user_id: demo.user_id,
            forename: demo.forename,
            surname: demo.surname,
            email: creds.email,
            verified: true,
            created_at: new Date().toISOString(),
            role: demo.role,
          },
        });
      } else {
        reject(new Error('Invalid organizer credentials'));
      }
    }, 600);
  });
}

export async function register(data: RegisterData): Promise<AuthResponse> {
  const res = await fetch(`${API_URL}/api/auth/register/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    credentials: 'include',
    body: JSON.stringify({
      forename: data.forename,
      surname: data.surname,
      email: data.email,
      role: data.role,
      pass_field: data.password,
    }),
  });

  const result = await res.json().catch(() => null);

  if (!res.ok) {
    throw new Error(getApiErrorMessage(result, 'Registration failed'));
  }

  return normalizeAuthResponse(result);
}

// ── Events ────────────────────────────────────────────────────────────────────

export async function getEvents(params?: {
  category?: string;
  search?: string;
}): Promise<Event[]> {
  const query: Record<string, string> = {};
  if (params?.category && params.category !== 'All') query.category = params.category;
  if (params?.search) query.search = params.search;
  const qs = Object.keys(query).length ? '?' + new URLSearchParams(query) : '';

  try {
    return await request<Event[]>(`/api/events/${qs}`);
  } catch {
    const { mockEvents } = await import('./mock-data');
    let results = mockEvents;
    if (params?.category && params.category !== 'All') {
      results = results.filter((e) => e.category === params.category);
    }
    if (params?.search) {
      const q = params.search.toLowerCase();
      results = results.filter(
        (e) =>
          e.event_name.toLowerCase().includes(q) ||
          e.venue.venue_name.toLowerCase().includes(q),
      );
    }
    return results;
  }
}

export async function getEvent(id: number): Promise<Event | undefined> {
  return request<Event>(`/api/events/${id}/`);
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function getMyBookings(token: string): Promise<Booking[]> {
  return request<Booking[]>('/api/bookings/', undefined, token);
}

export async function createBooking(
  token: string,
  eventId: number,
  tickets: { type_id: number; quantity: number }[],
): Promise<Booking> {
  return request<Booking>(
    '/api/bookings/create/',
    { method: 'POST', body: JSON.stringify({ event_id: eventId, tickets }) },
    token,
  );
}

export async function cancelBooking(token: string, bookingId: number): Promise<void> {
  return request<void>(`/api/bookings/${bookingId}/`, { method: 'DELETE' }, token);
}

// ── Organizer ─────────────────────────────────────────────────────────────────

export async function getOrganizerEvents(token: string): Promise<Event[]> {
  return request<Event[]>('/api/organizer/events/', undefined, token);
}

export async function getOrganizerReports(token: string): Promise<OrganizerReport[]> {
  return request<OrganizerReport[]>('/api/organizer/reports/', undefined, token);
}

export async function getVenues(token: string): Promise<Venue[]> {
  return request<Venue[]>('/api/venues/', undefined, token);
}

export async function createEvent(
  token: string,
  data: {
    event_name: string;
    event_date: string;
    description?: string;
    category?: string;
    venue: string | number;
    ticket_types: { tier: string; price: number }[];
  },
): Promise<Event> {
  return request<Event>('/api/events/create/', { method: 'POST', body: JSON.stringify(data) }, token);
}

export async function updateEvent(
  _token: string,
  _id: number,
  _data: Partial<Event>,
): Promise<Event> {
  throw new Error('Not yet implemented');
}

export async function deactivateEvent(token: string, id: number): Promise<void> {
  return request<void>(`/api/events/${id}/deactivate/`, { method: 'POST' }, token);
}

// Fetches every artist managed by the currently logged-in organizer.
export async function getManagedArtists(token: string): Promise<ManagedArtist[]> {
  return request<ManagedArtist[]>(`/api/organizer/artists`, undefined, token);
}

// Fetches all appearance requests sent in for a specific artist.
export async function getArtistRequests(
  token: string,
  artistId: number,
): Promise<AppearanceRequest[]> {
  return request<AppearanceRequest[]>(`/api/organizer/artists/${artistId}/requests`, undefined, token);
}

// Approves, declines, or requests changes on a single appearance request.
export async function respondToAppearanceRequest(
  token: string,
  requestId: number,
  status: 'approved' | 'declined' | 'changes_requested',
  reason?: string,
): Promise<AppearanceRequest> {
  return request<AppearanceRequest>(`/api/organizer/requests/${requestId}`, {method: 'PATCH', body: JSON.stringify({status, reason})}, token);
}

// Searches every performer in the system by name — not just artists the
// logged-in organizer already manages — so they can be invited to an event.
export async function searchArtists(
  token: string,
  query: string,
): Promise<ArtistSearchResult[]> {
  return request<ArtistSearchResult[]>(`/api/artists/search?q=${encodeURIComponent(query)}`, undefined, token);
}

// Invites an artist (any performer, not just a managed one) to appear at
// one of the logged-in organizer's own events.
export async function sendAppearanceRequest(
  token: string,
  data: {
    event_id: number;
    artist_id: number;
    fee_offer?: number;
    notes?: string;
  },
): Promise<AppearanceRequest> {
  return request<AppearanceRequest>(
	'/api/organizer/requests',
	{method: 'POST', body: JSON.stringify(data)},
	token,
  );
}

// ── Performer ─────────────────────────────────────────────────────────────────

export async function getPerformerEvents(token: string): Promise<Event[]> {
  return request<Event[]>('/api/performer/events/', undefined, token);
}

// All of the logged-in performer's own appearance requests, any status —
// used to surface pending ones they can decide on themselves when unmanaged.
export async function getPerformerAppearances(token: string): Promise<AppearanceRequest[]> {
  return request<AppearanceRequest[]>('/api/performer/appearances', undefined, token);
}

// ── Account / Profile ─────────────────────────────────────────────────────────

export async function updateEmail(
  token: string,
  password: string,
  email: string,
): Promise<{ message: string; user: User }> {
  return request<{ message: string; user: User }>(
    '/api/account/email/',
    { method: 'POST', body: JSON.stringify({ password, email }) },
    token,
  );
}

export async function changePassword(
  token: string,
  currentPassword: string,
  newPassword: string,
): Promise<{ message: string }> {
  return request<{ message: string }>(
    '/api/account/password/',
    { method: 'POST', body: JSON.stringify({ current_password: currentPassword, new_password: newPassword }) },
    token,
  );
}

export async function updateForename(
  token: string,
  forename: string,
): Promise<{ message: string; user: User }> {
  return request<{ message: string; user: User }>(
    '/api/account/forename/',
    { method: 'POST', body: JSON.stringify({ forename }) },
    token,
  );
}

export async function updateSurname(
  token: string,
  surname: string,
): Promise<{ message: string; user: User }> {
  return request<{ message: string; user: User }>(
    '/api/account/surname/',
    { method: 'POST', body: JSON.stringify({ surname }) },
    token,
  );
}

export async function updateAddress(
  token: string,
  address: string,
): Promise<{ message: string; user: User }> {
  return request<{ message: string; user: User }>(
    '/api/account/address/',
    { method: 'POST', body: JSON.stringify({ address }) },
    token,
  );
}

// ── Manager Link Requests ─────────────────────────────────────────────────────

export interface ManagerRequestInfo {
  request_id: number;
  status: string;
  requested_at: string;
  performer: {
    user_id: number;
    forename: string;
    surname: string;
    email: string;
  };
}

export interface LinkedManager {
  user_id: number;
  forename: string;
  surname: string;
  email: string;
}

export async function requestManagerLink(
  token: string,
  managerId: number,
): Promise<{ message: string }> {
  return request<{ message: string }>(
    '/api/manager/request-link/',
    { method: 'POST', body: JSON.stringify({ manager_id: managerId }) },
    token,
  );
}

export async function getPendingManagerRequests(
  token: string,
): Promise<{ requests: ManagerRequestInfo[] }> {
  return request<{ requests: ManagerRequestInfo[] }>(
    '/api/manager/pending-requests/',
    undefined,
    token,
  );
}

export async function approveManagerRequest(
  token: string,
  requestId: number,
): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/manager/approve/${requestId}/`,
    { method: 'POST' },
    token,
  );
}

export async function denyManagerRequest(
  token: string,
  requestId: number,
): Promise<{ message: string }> {
  return request<{ message: string }>(
    `/api/manager/deny/${requestId}/`,
    { method: 'POST' },
    token,
  );
}

export async function getPerformerManager(
  token: string,
): Promise<{ manager: LinkedManager | null }> {
  return request<{ manager: LinkedManager | null }>(
    '/api/performer/manager/',
    undefined,
    token,
  );
}

export async function getLinkedPerformers(
  token: string,
): Promise<{ performers: { user_id: number; forename: string; surname: string; email: string }[] }> {
  return request<{ performers: { user_id: number; forename: string; surname: string; email: string }[] }>(
    '/api/manager/performers/',
    undefined,
    token,
  );
}

// ── Payments ──────────────────────────────────────────────────────────────────

export async function createCheckoutSession(
  token: string,
  eventId: number,
  eventName: string,
  tickets: { type_id: number; quantity: number }[],
): Promise<{ checkout_url: string }> {
  return request<{ checkout_url: string }>(
    '/api/payments/checkout/',
    { method: 'POST', body: JSON.stringify({ event_id: eventId, event_name: eventName, tickets }) },
    token,
  );
}

export async function verifyPayment(sessionId: string): Promise<{ status: string; booking_id: number }> {
  return request<{ status: string; booking_id: number }>(`/api/payments/verify/?session_id=${sessionId}`);
}

import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  Event,
  Booking,
  OrganizerReport,
} from './types';
import type { ManagedArtist, AppearanceRequest } from '@/lib/types';
import {
  mockEvents,
  mockBookings,
  mockOrganizerEvents,
  mockReports,
  mockPerformerEvents,
} from './mock-data';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000';

const sessionBookings: Booking[] = [];

const MOCK_ARTISTS: ManagedArtist[] = [
  {
    artist_id: 1,
    artist_name: 'Nova Aria',
    genre: 'Pop',
    pending_request_count: 2,
    upcoming_appearance_count: 3,
  },
  {
    artist_id: 2,
    artist_name: 'The Low Keys',
    genre: 'Indie Rock',
    pending_request_count: 0,
    upcoming_appearance_count: 1,
  },
];

const MOCK_REQUESTS: Record<number, AppearanceRequest[]> = {
  1: [
    {
      request_id: 101,
      artist_id: 1,
      event_id: 501,
      event_name: 'Summer Nights Festival',
      event_date: '2026-08-14',
      venue: { venue_name: 'Riverside Amphitheatre', venue_address: '400 River Rd' },
      requested_by: 'Blue Horizon Events',
      fee_offer: 8000,
      notes: 'Headline slot, 45 min set.',
      status: 'pending',
    },
    {
      request_id: 102,
      artist_id: 1,
      event_id: 502,
      event_name: 'Downtown Music Crawl',
      event_date: '2026-09-02',
      venue: { venue_name: 'Union Square Stage', venue_address: '12 Union Sq' },
      requested_by: 'CityPulse Presents',
      fee_offer: 3000,
      status: 'pending',
    },
  ],
  2: [],
};

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
  };
}

function normalizeAuthResponse(data: any): AuthResponse {
  return {
    // Django session auth may not return a real token.
    // This placeholder keeps the current AuthContext working for now.
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
  // SWAPPED: mock Promise auth → real Django fetch call
  const res = await fetch(`${API_URL}/api/auth/register/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    credentials: 'include',
    body: JSON.stringify({
      forename: data.forename,
      surname: data.surname,
      email: data.email,
      role: data.role,

      // Backend register validator expects pass_field, not password
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
  // TODO: return request<Event[]>(`/api/events/${params ? '?' + new URLSearchParams(params as Record<string, string>) : ''}`);
  return new Promise((resolve) => {
    setTimeout(() => {
      let events = [...mockEvents];
      if (params?.category && params.category !== 'All') {
        events = events.filter((e) => e.category === params.category);
      }
      if (params?.search) {
        const q = params.search.toLowerCase();
        events = events.filter(
          (e) =>
            e.event_name.toLowerCase().includes(q) ||
            e.venue.venue_name.toLowerCase().includes(q) ||
            (e.category ?? '').toLowerCase().includes(q),
        );
      }
      resolve(events);
    }, 300);
  });
}

export async function getEvent(id: number): Promise<Event | undefined> {
  // TODO: return request<Event>(`/api/events/${id}/`);
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockEvents.find((e) => e.event_id === id)), 200);
  });
}

// ── Bookings ──────────────────────────────────────────────────────────────────

export async function getMyBookings(_token: string): Promise<Booking[]> {
  // TODO: return request<Booking[]>('/api/bookings/', undefined, token);
  return new Promise((resolve) => setTimeout(() => resolve([...mockBookings, ...sessionBookings]), 300));
}

export async function createBooking(
  _token: string,
  eventId: number,
  tickets: { type_id: number; quantity: number }[],
): Promise<Booking> {
  // TODO: return request<Booking>('/api/bookings/', { method: 'POST', body: JSON.stringify({ event_id: eventId, tickets }) }, token);
  return new Promise((resolve) => {
    setTimeout(() => {
      const event = mockEvents.find((e) => e.event_id === eventId)!;
      const bookingId = Math.floor(Math.random() * 9000) + 1000;

      let seatNum = 1;
      const ticketItems = tickets.flatMap(({ type_id, quantity }) => {
        const ticketType = event.ticket_types?.find((tt) => tt.type_id === type_id);
        if (!ticketType) return [];
        return Array.from({ length: quantity }, () => ({
          seat_id: `T${bookingId}${String(seatNum++).padStart(2, '0')}`,
          type: ticketType,
        }));
      });

      const booking: Booking = {
        booking_id: bookingId,
        requested_at: new Date().toISOString(),
        confirmed: 1,
        user_id: 1,
        event,
        tickets: ticketItems,
      };

      sessionBookings.push(booking);
      resolve(booking);
    }, 700);
  });
}

export async function cancelBooking(_token: string, bookingId: number): Promise<void> {
  // TODO: return request<void>(`/api/bookings/${bookingId}/`, { method: 'DELETE' }, token);
  return new Promise((resolve) => setTimeout(resolve, 400));
}

// ── Organizer ─────────────────────────────────────────────────────────────────

export async function getOrganizerEvents(_token: string): Promise<Event[]> {
  // TODO: return request<Event[]>('/api/organizer/events/', undefined, token);
  return new Promise((resolve) => setTimeout(() => resolve(mockOrganizerEvents), 300));
}

export async function getOrganizerReports(_token: string): Promise<OrganizerReport[]> {
  // TODO: return request<OrganizerReport[]>('/api/organizer/reports/', undefined, token);
  return new Promise((resolve) => setTimeout(() => resolve(mockReports), 300));
}

export async function createEvent(_token: string, _data: Partial<Event>): Promise<Event> {
  // TODO: return request<Event>('/api/events/', { method: 'POST', body: JSON.stringify(data) }, token);
  throw new Error('Not yet implemented — backend endpoint pending');
}

export async function updateEvent(
  _token: string,
  id: number,
  _data: Partial<Event>,
): Promise<Event> {
  // TODO: return request<Event>(`/api/events/${id}/`, { method: 'PUT', body: JSON.stringify(data) }, token);
  throw new Error('Not yet implemented — backend endpoint pending');
}

export async function deactivateEvent(_token: string, id: number): Promise<void> {
  // TODO: return request<void>(`/api/events/${id}/deactivate/`, { method: 'POST' }, token);
  return new Promise((resolve) => setTimeout(resolve, 300));
}

// Fetches every artist managed by the currently logged-in organizer.
export async function getManagedArtists(token: string): Promise<ManagedArtist[]> {
  // TODO: replace with real request once backend route exists
  // return fetchJson('/api/organizer/artists', token);
  return Promise.resolve(MOCK_ARTISTS);
}

// Fetches all appearance requests sent in for a specific artist.
export async function getArtistRequests(
  token: string,
  artistId: number,
): Promise<AppearanceRequest[]> {
  // TODO: replace with real request once backend route exists
  // return fetchJson(`/api/organizer/artists/${artistId}/requests`, token);
  return Promise.resolve(MOCK_REQUESTS[artistId] ?? []);
}

// Approves or declines a single appearance request.
export async function respondToAppearanceRequest(
  token: string,
  requestId: number,
  status: 'approved' | 'declined',
  reason?: string,
): Promise<AppearanceRequest> {
  // TODO: replace with real PATCH request once backend route exists
  // return fetchJson(`/api/organizer/requests/${requestId}`, token, {
  //   method: 'PATCH',
  //   body: JSON.stringify({ status, reason }),
  // });
  const all = Object.values(MOCK_REQUESTS).flat();
  const found = all.find((r) => r.request_id === requestId);
  if (!found) throw new Error('Request not found');
  found.status = status;
  found.decline_reason = reason;
  return Promise.resolve(found);
}

// ── Performer ─────────────────────────────────────────────────────────────────

export async function getPerformerEvents(_token: string): Promise<Event[]> {
  // TODO: return request<Event[]>('/api/performer/events/', undefined, token);
  return new Promise((resolve) => setTimeout(() => resolve(mockPerformerEvents), 300));
}

import type {
  AuthResponse,
  LoginCredentials,
  RegisterData,
  User,
  Event,
  Booking,
  OrganizerReport,
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
  return request<Event[]>(`/api/events/${qs}`);
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

export async function createEvent(
  token: string,
  data: Partial<Event> & { venue_name?: string; price?: number },
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

// ── Performer ─────────────────────────────────────────────────────────────────

export async function getPerformerEvents(token: string): Promise<Event[]> {
  return request<Event[]>('/api/performer/events/', undefined, token);
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

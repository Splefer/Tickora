export type Role = 'customer' | 'organizer' | 'performer' | 'admin';

export interface Venue {
  venue_id: string;
  venue_name: string;
  venue_address: string;
  province?: string;
  capacity: number;
}

export interface TicketType {
  type_id: number;
  tier: string;
  price: number;
  event_id: number;
}

export interface Event {
  event_id: number;
  event_name: string;
  event_date: string;
  is_active: boolean;
  cancellation_window_hours?: number;
  description?: string;
  venue: Venue;
  organizer_id: number;
  organizer_name?: string;
  ticket_types?: TicketType[];
  tickets_sold?: number;
  category?: string;
}

export interface User {
  user_id: number;
  surname: string;
  forename: string;
  email: string;
  verified: boolean;
  address?: string;
  created_at: string;
  role: Role;
}

export interface Ticket {
  seat_id: string;
  type: TicketType;
}

export interface Booking {
  booking_id: number;
  requested_at: string;
  confirmed: number;
  user_id: number;
  event: Event;
  tickets?: Ticket[];
}

export interface AuthResponse {
  token: string;
  user: User;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface RegisterData {
  forename: string;
  surname: string;
  email: string;
  password: string;
  role: Role;
}

export interface OrganizerReport {
  event_id: number;
  event_name: string;
  tickets_sold: number;
  capacity: number;
  revenue: number;
  event_date: string;
}

export interface ManagedArtist {
  artist_id: number;
  artist_name: string;
  genre?: string;
  avatar_url?: string;
  pending_request_count: number;
  upcoming_appearance_count: number;
}

// A single appearance request sent by another organizer/promoter
// for one of the artists this organizer manages.
export interface AppearanceRequest {
  request_id: number;
  artist_id: number;
  event_id: number;
  event_name: string;
  event_date: string; // 'YYYY-MM-DD'
  venue: {
    venue_name: string;
    venue_address: string;
  };
  requested_by: string;   // name of the organizer/promoter sending the request
  fee_offer?: number;
  notes?: string;
  status: 'pending' | 'approved' | 'declined' | 'changes_requested';
  decline_reason?: string;
}

export interface ArtistSearchResult {
  artist_id: number;
  artist_name: string;
  genre?: string;
}
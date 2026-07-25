import type { Event, Booking, Venue, OrganizerReport } from './types';

export const mockVenues: Venue[] = [
  {
    venue_id: 'VEN001',
    venue_name: 'Scotiabank Arena',
    venue_address: '40 Bay St, Toronto, ON',
    province: 'ON',
    capacity: 19800,
  },
  {
    venue_id: 'VEN002',
    venue_name: 'Rogers Centre',
    venue_address: '1 Blue Jays Way, Toronto, ON',
    province: 'ON',
    capacity: 53000,
  },
  {
    venue_id: 'VEN003',
    venue_name: 'Bell Centre',
    venue_address: '1909 Ave des Canadiens-de-Montréal, Montréal, QC',
    province: 'QC',
    capacity: 21302,
  },
  {
    venue_id: 'VEN004',
    venue_name: 'BC Place',
    venue_address: '777 Pacific Blvd, Vancouver, BC',
    province: 'BC',
    capacity: 54500,
  },
];

export const mockEvents: Event[] = [
  {
    event_id: 1,
    event_name: 'The Weeknd: After Hours Til Dawn',
    event_date: '2026-08-15',
    is_active: true,
    cancellation_window_hours: 48,
    description:
      'Experience the ultimate After Hours Til Dawn world tour. Abel Tesfaye brings his signature dark pop sound and stunning visuals to Scotiabank Arena for one unforgettable night.',
    venue: mockVenues[0],
    organizer_id: 2,
    organizer_name: 'Live Nation Canada',
    category: 'Music',
    ticket_types: [
      { type_id: 1, tier: 'General Admission', price: 89.99, event_id: 1 },
      { type_id: 2, tier: 'VIP Floor', price: 249.99, event_id: 1 },
      { type_id: 3, tier: 'Platinum', price: 499.99, event_id: 1 },
    ],
    tickets_sold: 14500,
  },
  {
    event_id: 2,
    event_name: 'Taylor Swift: The Eras Tour',
    event_date: '2026-09-03',
    is_active: true,
    cancellation_window_hours: 72,
    description:
      'Join Taylor Swift on a journey through all her musical eras — from debut to Midnights. Three hours of pure magic at Rogers Centre.',
    venue: mockVenues[1],
    organizer_id: 2,
    organizer_name: 'Live Nation Canada',
    category: 'Music',
    ticket_types: [
      { type_id: 4, tier: 'Upper Bowl', price: 99.99, event_id: 2 },
      { type_id: 5, tier: 'Lower Bowl', price: 219.99, event_id: 2 },
      { type_id: 6, tier: 'Floor', price: 349.99, event_id: 2 },
      { type_id: 7, tier: 'VIP', price: 599.99, event_id: 2 },
    ],
    tickets_sold: 47000,
  },
  {
    event_id: 3,
    event_name: 'Toronto Raptors vs. Boston Celtics',
    event_date: '2026-07-20',
    is_active: true,
    cancellation_window_hours: 24,
    description:
      'NBA Eastern Conference clash between the Toronto Raptors and Boston Celtics. High-intensity basketball at its finest — right here at Scotiabank Arena.',
    venue: mockVenues[0],
    organizer_id: 3,
    organizer_name: 'MLSE',
    category: 'Sports',
    ticket_types: [
      { type_id: 8, tier: 'Upper Bowl', price: 45.0, event_id: 3 },
      { type_id: 9, tier: 'Lower Bowl', price: 120.0, event_id: 3 },
      { type_id: 10, tier: 'Courtside', price: 750.0, event_id: 3 },
    ],
    tickets_sold: 12000,
  },
  {
    event_id: 4,
    event_name: 'Cirque du Soleil: ALEGRÍA',
    event_date: '2026-10-10',
    is_active: true,
    cancellation_window_hours: 48,
    description:
      'ALEGRÍA is a timeless story of hope and the powers that turn the wheel of history. A breathtaking display of acrobatics, music, and theatrical wonder.',
    venue: mockVenues[3],
    organizer_id: 4,
    organizer_name: 'Cirque du Soleil',
    category: 'Arts',
    ticket_types: [
      { type_id: 11, tier: 'Standard', price: 75.0, event_id: 4 },
      { type_id: 12, tier: 'Premium', price: 145.0, event_id: 4 },
    ],
    tickets_sold: 8000,
  },
  {
    event_id: 5,
    event_name: "Drake: It's All a Blur Tour",
    event_date: '2026-11-22',
    is_active: true,
    cancellation_window_hours: 48,
    description:
      "Drake returns to Canada for the highly anticipated It's All a Blur world tour. Expect hits from across his entire discography at Bell Centre, Montréal.",
    venue: mockVenues[2],
    organizer_id: 2,
    organizer_name: 'Live Nation Canada',
    category: 'Music',
    ticket_types: [
      { type_id: 13, tier: 'General', price: 99.99, event_id: 5 },
      { type_id: 14, tier: 'VIP', price: 349.99, event_id: 5 },
    ],
    tickets_sold: 18900,
  },
  {
    event_id: 6,
    event_name: 'Vancouver Comedy Festival',
    event_date: '2026-07-04',
    is_active: true,
    cancellation_window_hours: 24,
    description:
      "Canada's biggest comedy festival featuring top stand-up performers from across North America. A full night of laughs at BC Place.",
    venue: mockVenues[3],
    organizer_id: 5,
    organizer_name: 'Van Comedy Inc',
    category: 'Comedy',
    ticket_types: [
      { type_id: 15, tier: 'General', price: 39.99, event_id: 6 },
      { type_id: 16, tier: 'Premium', price: 89.99, event_id: 6 },
    ],
    tickets_sold: 3200,
  },
];

export const mockBookings: Booking[] = [
  {
    booking_id: 101,
    requested_at: '2026-05-10T14:32:00Z',
    confirmed: 1,
    user_id: 1,
    event: mockEvents[0],
    tickets: [{ seat_id: 'GA-A14', type: mockEvents[0].ticket_types![0] }],
  },
  {
    booking_id: 102,
    requested_at: '2026-04-22T09:15:00Z',
    confirmed: 1,
    user_id: 1,
    event: mockEvents[2],
    tickets: [
      { seat_id: 'UB-B22', type: mockEvents[2].ticket_types![0] },
      { seat_id: 'UB-B23', type: mockEvents[2].ticket_types![0] },
    ],
  },
  {
    booking_id: 103,
    requested_at: '2026-03-01T18:00:00Z',
    confirmed: 1,
    user_id: 1,
    event: mockEvents[4],
    tickets: [{ seat_id: 'VIP-01', type: mockEvents[4].ticket_types![1] }],
  },
];

export const mockOrganizerEvents: Event[] = mockEvents.slice(0, 3);

export const mockReports: OrganizerReport[] = [
  {
    event_id: 1,
    event_name: 'The Weeknd: After Hours Til Dawn',
    tickets_sold: 14500,
    capacity: 19800,
    revenue: 1632000,
    event_date: '2026-08-15',
  },
  {
    event_id: 2,
    event_name: 'Taylor Swift: The Eras Tour',
    tickets_sold: 47000,
    capacity: 53000,
    revenue: 7820000,
    event_date: '2026-09-03',
  },
  {
    event_id: 3,
    event_name: 'Toronto Raptors vs. Boston Celtics',
    tickets_sold: 12000,
    capacity: 19800,
    revenue: 820000,
    event_date: '2026-07-20',
  },
];

export const mockPerformerEvents: Event[] = [mockEvents[0], mockEvents[4]];

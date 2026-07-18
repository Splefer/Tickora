import { mockBookings } from "@/lib/mock-data";
import ScheduleCalendar from "@/components/ScheduleCalendar";

export default function MyEventsPage() {
  const today = new Date();

  const upcomingBookings = mockBookings.filter(
    (booking) => new Date(booking.event.event_date) >= today
  );

  const pastBookings = mockBookings.filter(
    (booking) => new Date(booking.event.event_date) < today
  );

  return (
    <main className="min-h-screen bg-[#0a0a0f] px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <h1 className="text-4xl font-bold text-white">
          My Events
        </h1>

        <p className="mt-3 text-gray-400">
          You have {mockBookings.length} booked events.
        </p>

        <div className="mt-10">
          <ScheduleCalendar bookings={mockBookings} />
        </div>

        <section className="mt-10">
          <h2 className="mb-5 text-2xl font-bold text-white">
            Upcoming Events
          </h2>

          {upcomingBookings.length === 0 ? (
            <p className="text-gray-500">
              No upcoming bookings.
            </p>
          ) : (
            <div className="space-y-4">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.booking_id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-5"
                >
                  <h3 className="text-xl font-semibold text-white">
                    {booking.event.event_name}
                  </h3>

                  <p className="mt-2 text-gray-400">
                    📅 {booking.event.event_date}
                  </p>

                  <p className="text-gray-500">
                    📍 {booking.event.venue.venue_name}
                  </p>

                  <p className="mt-2 text-indigo-400">
                    Booking #{booking.booking_id}
                  </p>

                  <div className="mt-4 border-t border-gray-800 pt-4">
                    <p className="text-sm font-semibold text-gray-300">
                      Ticket Details
                    </p>

                    <div className="mt-2 space-y-1">
                      {booking.tickets?.map((ticket) => (
                        <p
                          key={ticket.seat_id}
                          className="text-sm text-gray-400"
                        >
                          🎟 {ticket.type.tier} • Seat {ticket.seat_id}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="mt-12">
          <h2 className="mb-5 text-2xl font-bold text-white">
            Past Events
          </h2>

          {pastBookings.length === 0 ? (
            <p className="text-gray-500">
              No past bookings.
            </p>
          ) : (
            <div className="space-y-4">
              {pastBookings.map((booking) => (
                <div
                  key={booking.booking_id}
                  className="rounded-xl border border-gray-800 bg-gray-900 p-5"
                >
                  <h3 className="text-xl font-semibold text-white">
                    {booking.event.event_name}
                  </h3>

                  <p className="mt-2 text-gray-400">
                    📅 {booking.event.event_date}
                  </p>

                  <p className="text-gray-500">
                    📍 {booking.event.venue.venue_name}
                  </p>

                  <p className="mt-2 text-green-400 font-medium">
                    ✓ Attended
                  </p>

                  <p className="text-sm text-gray-500">
                    Booking #{booking.booking_id}
                  </p>

                  <div className="mt-4 border-t border-gray-800 pt-4">
                    <p className="text-sm font-semibold text-gray-300">
                      Ticket Details
                    </p>

                    <div className="mt-2 space-y-1">
                      {booking.tickets?.map((ticket) => (
                        <p
                          key={ticket.seat_id}
                          className="text-sm text-gray-400"
                        >
                          🎟 {ticket.type.tier} • Seat {ticket.seat_id}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
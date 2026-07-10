'use client';

import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import type { Booking } from '@/lib/types';

type ScheduleCalendarProps = {
  bookings: Booking[];
};

export default function ScheduleCalendar({ bookings }: ScheduleCalendarProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);

  const calendarEvents = bookings.map((booking) => ({
    id: booking.booking_id.toString(),
    title: booking.event.event_name,
    date: booking.event.event_date,
    extendedProps: {
      booking,
    },
  }));

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-gray-800 bg-gray-900 p-6 shadow-lg">
        <FullCalendar
          plugins={[dayGridPlugin, interactionPlugin]}
          initialView="dayGridMonth"
          height="auto"
          events={calendarEvents}
          headerToolbar={{
            left: 'prev,next today',
            center: 'title',
            right: 'dayGridMonth',
          }}
          eventClick={(info) => {
            setSelectedBooking(info.event.extendedProps.booking as Booking);
          }}
        />
      </div>

      {selectedBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 px-4">
          <div className="relative w-full max-w-xl rounded-2xl border border-indigo-500/30 bg-gray-900 p-6 shadow-2xl">
            <button
              onClick={() => setSelectedBooking(null)}
              className="absolute right-4 top-4 text-gray-400 hover:text-white"
              aria-label="Close booking details"
            >
              ✕
            </button>

            <h3 className="pr-8 text-xl font-bold text-white">
              {selectedBooking.event.event_name}
            </h3>

            <p className="mt-3 text-gray-400">
              📅 {selectedBooking.event.event_date}
            </p>

            <p className="text-gray-400">
              📍 {selectedBooking.event.venue.venue_name}
            </p>

            <p className="mt-3 text-indigo-400">
              Booking #{selectedBooking.booking_id}
            </p>

            <div className="mt-4 border-t border-gray-800 pt-4">
              <p className="text-sm font-semibold text-gray-300">
                Ticket Details
              </p>

              <div className="mt-2 space-y-1">
                {selectedBooking.tickets?.length ? (
                  selectedBooking.tickets.map((ticket) => (
                    <p
                      key={ticket.seat_id}
                      className="text-sm text-gray-400"
                    >
                      🎟 {ticket.type.tier} • Seat {ticket.seat_id}
                    </p>
                  ))
                ) : (
                  <p className="text-sm text-gray-500">
                    No ticket information available.
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
"use client";

import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import interactionPlugin from "@fullcalendar/interaction";
import { useRouter } from "next/navigation";
import type { Event } from "@/lib/types";

export default function EventCalendar({
    events,
}: {
    events: Event[];
}) {

    const router = useRouter();

    const calendarEvents = events.map(event => ({
        title: event.event_name,
        date: event.event_date,
        id: String(event.event_id),
    }));

    return (
        <div className="rounded-2xl bg-[#12121b] p-6">

            <FullCalendar

                plugins={[
                    dayGridPlugin,
                    interactionPlugin,
                ]}

                initialView="dayGridMonth"

                events={calendarEvents}

                eventClick={(info) => {

                    router.push(`/events/${info.event.id}`);

                }}

                height="auto"

            />

        </div>
    );
}
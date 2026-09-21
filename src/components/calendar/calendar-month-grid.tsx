import Link from "next/link";
import type { CalendarWeek } from "@/lib/data/calendar";
import type { CalendarEvent } from "@/lib/types";
import { STAFF_LEAVE_TYPE_LABEL } from "@/lib/constants";
import { ChildAvatar } from "@/components/children/child-avatar";
import { StaffAvatar } from "@/components/staff/staff-avatar";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const EVENT_DOT_CLASS: Record<"public_holiday" | "staff_leave", string> = {
  public_holiday: "bg-burgundy-500",
  staff_leave: "bg-orange-500",
};

function dayNumber(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}

function eventLabel(event: CalendarEvent): string {
  switch (event.kind) {
    case "public_holiday":
      return event.name;
    case "staff_leave":
      return `${event.leave.staff_name} — leave`;
    case "staff_birthday":
      return `${event.name} — birthday`;
    case "child_birthday":
      return `${event.name} — birthday`;
  }
}

/** One event's marker inside a day cell: a birthday shows the person's
 * actual profile photo (or an initials circle if they don't have one on
 * file yet) right on the date it falls on; a holiday or leave day keeps
 * the plain colour dot, since there's no photo to show for either. */
function EventMarker({ event, size = "xs" }: { event: CalendarEvent; size?: "xs" | "sm" }) {
  if (event.kind === "staff_birthday") {
    return (
      <span title={eventLabel(event)}>
        <StaffAvatar fullName={event.name} photoUrl={event.photoUrl} size={size} />
      </span>
    );
  }
  if (event.kind === "child_birthday") {
    return (
      <span title={eventLabel(event)}>
        <ChildAvatar fullName={event.name} photoUrl={event.photoUrl} size={size} />
      </span>
    );
  }
  return (
    <span
      title={eventLabel(event)}
      className={`h-1.5 w-1.5 shrink-0 rounded-full ${EVENT_DOT_CLASS[event.kind]}`}
      aria-hidden="true"
    />
  );
}

function CalendarDayCell({
  date,
  inMonth,
  events,
  isToday,
}: {
  date: string;
  inMonth: boolean;
  events: CalendarEvent[];
  isToday: boolean;
}) {
  const dimmed = inMonth ? "" : "opacity-30";
  const todayRing = isToday ? "ring-2 ring-burgundy-400" : "";
  const tooltip = events.map(eventLabel).join(", ");

  return (
    <div
      title={tooltip || undefined}
      className={`flex min-h-[3.75rem] min-w-0 flex-col items-center gap-1 rounded-lg border border-charcoal/10 px-1 py-1.5 text-center ${dimmed} ${todayRing}`}
    >
      <span className="text-xs font-medium text-charcoal/70">{dayNumber(date)}</span>
      {events.length > 0 && (
        <div className="flex flex-wrap items-center justify-center gap-1">
          {events.slice(0, 3).map((e, i) => (
            <EventMarker key={i} event={e} size="xs" />
          ))}
          {events.length > 3 && <span className="text-[0.6rem] text-charcoal/40">+{events.length - 3}</span>}
        </div>
      )}
    </div>
  );
}

/** A general-purpose month calendar, Monday–Sunday, showing NZ public
 * holidays, booked staff leave, and staff/child birthdays as small colour
 * dots on the day they fall on (full names appear as a hover tooltip on
 * desktop, and in the event list rendered below the grid on every device —
 * dots alone would be unreadable on a small phone screen). */
export function CalendarMonthGrid({ weeks, today }: { weeks: CalendarWeek[]; today: string }) {
  if (weeks.length === 0) {
    return <p className="card p-6 text-center text-sm text-charcoal/50">Nothing to show for this month.</p>;
  }

  return (
    <div className="card flex flex-col gap-2 p-3 sm:p-4">
      <div className="grid grid-cols-7 gap-1 px-1 text-center text-[0.6rem] font-semibold uppercase tracking-wide text-charcoal/40 sm:gap-2 sm:text-[0.65rem]">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week.weekStartDate} className="grid grid-cols-7 gap-1 sm:gap-2">
          {week.days.map((day) => (
            <CalendarDayCell
              key={day.date}
              date={day.date}
              inMonth={day.inMonth}
              events={day.events}
              isToday={day.date === today}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

export function CalendarLegend() {
  return (
    <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-charcoal/60">
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-burgundy-500" /> Public holiday
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-orange-500" /> Staff leave
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-blue-500" /> Staff birthday
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="h-2 w-2 rounded-full bg-pink-500" /> Child birthday
      </span>
    </div>
  );
}

/** Every event in this month's grid, in date order — the readable
 * counterpart to the grid's dots, and the only view of it on a small
 * screen. Staff members link through to their profile so a manager can
 * jump straight from "who's on leave" to the person's record. */
export function CalendarEventList({ weeks }: { weeks: CalendarWeek[] }) {
  const events = weeks
    .flatMap((w) => w.days)
    .filter((d) => d.inMonth)
    .flatMap((d) => d.events.map((e) => ({ date: d.date, event: e })))
    // A multi-day leave block gets a dot on every day it spans (so the grid
    // shows the whole span at a glance), but only needs to be listed once,
    // on its first day — otherwise a two-week block would repeat 14 times.
    .filter(({ date, event }) => event.kind !== "staff_leave" || event.leave.start_date === date);

  if (events.length === 0) {
    return <p className="card p-5 text-center text-sm text-charcoal/50">No holidays, leave, or birthdays this month.</p>;
  }

  return (
    <div className="card flex flex-col divide-y divide-charcoal/10 p-0">
      {events.map(({ date, event }, i) => (
        <div key={i} className="flex items-center gap-3 px-4 py-3">
          <EventMarker event={event} size="sm" />
          <span className="w-14 shrink-0 text-xs text-charcoal/50">
            {new Date(`${date}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" })}
          </span>
          <span className="min-w-0 flex-1 truncate text-sm text-charcoal">
            {event.kind === "public_holiday" && event.name}
            {event.kind === "staff_leave" && (
              <>
                <Link href={`/staff/${event.leave.staff_id}`} className="font-medium hover:underline">
                  {event.leave.staff_name}
                </Link>{" "}
                — {STAFF_LEAVE_TYPE_LABEL[event.leave.leave_type]} leave
                {event.leave.start_date === date && event.leave.end_date !== date
                  ? ` (through ${new Date(`${event.leave.end_date}T00:00:00Z`).toLocaleDateString("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" })})`
                  : ""}
              </>
            )}
            {event.kind === "staff_birthday" && (
              <>
                <Link href={`/staff/${event.staffId}`} className="font-medium hover:underline">
                  {event.name}
                </Link>{" "}
                — birthday
              </>
            )}
            {event.kind === "child_birthday" && (
              <>
                <Link href={`/children/${event.childId}`} className="font-medium hover:underline">
                  {event.name}
                </Link>{" "}
                — birthday
              </>
            )}
          </span>
        </div>
      ))}
    </div>
  );
}

import Link from "next/link";
import type { AttendanceRollRoom } from "@/lib/data/attendance-roll";
import { getRoomColorClasses } from "@/lib/constants";
import { formatShortDate } from "@/lib/utils";

/** The dashboard's entry point into the booked-sessions roll — a glance at
 * how many children each room has booked for next week, one click
 * straight into a print preview for the default (next week, every room)
 * view, and a second link into the full page for picking a different week
 * or a single room to print on its own. Keeps the picker itself on that
 * page rather than duplicating date/room controls here too. */
export function WeeklyBookedSessionsCard({
  rooms,
  nextWeekStartDate,
}: {
  rooms: AttendanceRollRoom[];
  nextWeekStartDate: string;
}) {
  const totalBooked = rooms.reduce((sum, r) => sum + r.children.length, 0);

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-semibold text-charcoal">Weekly Booked Sessions</h3>
          <p className="mt-0.5 text-sm text-charcoal/60">
            {totalBooked} {totalBooked === 1 ? "child" : "children"} currently booked across {rooms.length} rooms for
            the week starting {formatShortDate(nextWeekStartDate)}.
          </p>
        </div>
        <Link
          href={`/roster/attendance-roll?week=${nextWeekStartDate}&autoprint=1`}
          className="btn-primary px-3.5 py-2 text-sm"
        >
          Print next week&apos;s attendance
        </Link>
      </div>

      <div className="flex flex-wrap gap-2">
        {rooms.map((room) => {
          const colors = getRoomColorClasses(room.color);
          return (
            <Link
              key={room.id}
              href={`/roster/attendance-roll?week=${nextWeekStartDate}&room=${room.id}`}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium ${colors.bg} ${colors.text} hover:opacity-80`}
            >
              <span className={`h-1.5 w-1.5 rounded-full ${colors.chip}`} />
              {room.name} · {room.children.length}
            </Link>
          );
        })}
      </div>

      <Link href="/roster/attendance-roll" className="self-start text-sm font-medium text-burgundy-600 hover:underline">
        Choose a different week or room →
      </Link>
    </div>
  );
}

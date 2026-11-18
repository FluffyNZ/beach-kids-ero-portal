"use client";

import { useRouter } from "next/navigation";
import { addDays, mondayOfDateString } from "@/lib/utils";

export type RollRoomOption = { id: string; name: string };

const fmt = new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const label = (date: string) => fmt.format(new Date(`${date}T00:00:00Z`)).replace(",", "");

/** Week and room picker for the booked sessions roll. Every change just
 * rewrites the page's own ?week=&room= — dates are NZ calendar dates and
 * any picked date snaps to that week's Monday. */
export function AttendanceRollControls({
  weekStartDate,
  roomId,
  rooms,
  today,
}: {
  weekStartDate: string;
  roomId: string;
  rooms: RollRoomOption[];
  /** NZ "today" as YYYY-MM-DD. */
  today: string;
}) {
  const router = useRouter();
  const thisWeek = mondayOfDateString(today);
  const nextWeek = addDays(thisWeek, 7);

  function goTo(week: string, room: string) {
    const params = new URLSearchParams();
    params.set("week", week);
    if (room) params.set("room", room);
    router.push(`/roster/attendance-roll?${params.toString()}`);
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-3 sm:p-4 print:hidden">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={() => goTo(addDays(weekStartDate, -7), roomId)} className="btn-secondary px-3" aria-label="Previous week">
          ←<span className="hidden sm:inline">Previous</span>
        </button>
        <button type="button" onClick={() => goTo(addDays(weekStartDate, 7), roomId)} className="btn-secondary px-3" aria-label="Next week">
          <span className="hidden sm:inline">Next</span>→
        </button>
        <button type="button" disabled={weekStartDate === thisWeek} onClick={() => goTo(thisWeek, roomId)} className="btn-secondary px-3">
          This week
        </button>
        <button type="button" disabled={weekStartDate === nextWeek} onClick={() => goTo(nextWeek, roomId)} className="btn-secondary px-3">
          Next week
        </button>
        <p className="min-w-0 flex-1 text-base font-semibold text-charcoal" aria-live="polite">
          {label(weekStartDate)} – {label(addDays(weekStartDate, 4))}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-charcoal">
          Jump to week of
          <input
            type="date"
            value={weekStartDate}
            onChange={(e) => {
              if (!e.target.value) return;
              goTo(mondayOfDateString(e.target.value), roomId);
            }}
            className="input w-auto"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-charcoal">
          Room
          <select value={roomId} onChange={(e) => goTo(weekStartDate, e.target.value)} className="input w-auto">
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      </div>
    </div>
  );
}

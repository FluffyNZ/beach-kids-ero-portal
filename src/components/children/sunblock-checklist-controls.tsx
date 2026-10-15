"use client";

import { useRouter } from "next/navigation";
import { addDays, nzTodayDateString } from "@/lib/utils";

export type SunblockRoomOption = { id: string; name: string };

/** Prev/Next-day and a real date picker, plus an optional single-room
 * filter — same control shape as AttendanceRollControls, just day-by-day
 * instead of week-by-week, since a sunblock checklist is printed fresh
 * each day rather than for a week ahead. Rewrites `?date=&room=` on the
 * page's own URL; the page re-fetches and re-renders from that. */
export function SunblockChecklistControls({
  date,
  roomId,
  rooms,
}: {
  date: string;
  roomId: string;
  rooms: SunblockRoomOption[];
}) {
  const router = useRouter();

  function goTo(nextDate: string, nextRoom: string) {
    const params = new URLSearchParams();
    params.set("date", nextDate);
    if (nextRoom) params.set("room", nextRoom);
    router.push(`/children/sunblock?${params.toString()}`);
  }

  return (
    <div className="card flex flex-wrap items-center gap-2 px-4 py-3 print:hidden">
      <button type="button" onClick={() => goTo(addDays(date, -1), roomId)} className="btn-ghost px-2.5">
        ← Prev day
      </button>

      <label className="flex items-center gap-1.5 text-sm text-charcoal/70">
        <span className="sr-only">Choose a date</span>
        <input
          type="date"
          value={date}
          onChange={(e) => {
            if (!e.target.value) return;
            goTo(e.target.value, roomId);
          }}
          className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-burgundy-400 focus:outline-none focus:ring-2 focus:ring-burgundy-500/20"
        />
      </label>

      <button type="button" onClick={() => goTo(addDays(date, 1), roomId)} className="btn-ghost px-2.5">
        Next day →
      </button>

      <button type="button" onClick={() => goTo(nzTodayDateString(), roomId)} className="btn-ghost px-2.5 text-xs">
        Today
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <label htmlFor="sunblock-room" className="text-sm text-charcoal/60">
          Room
        </label>
        <select
          id="sunblock-room"
          value={roomId}
          onChange={(e) => goTo(date, e.target.value)}
          className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-burgundy-400 focus:outline-none focus:ring-2 focus:ring-burgundy-500/20"
        >
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

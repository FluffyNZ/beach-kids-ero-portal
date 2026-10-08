"use client";

import { useRouter } from "next/navigation";
import { addDays, mondayOf } from "@/lib/utils";

export type RollRoomOption = { id: string; name: string };

/** The week/room picker for the booked-sessions roll — Prev/Next buttons
 * for quick week-to-week moves, a real date picker (any date you pick
 * snaps to that week's Monday) for jumping further out, a one-click
 * "Next week" shortcut back to the default view, and a room selector so a
 * single room can be printed on its own. All of it just rewrites the
 * page's own `?week=&room=` query string — the page itself re-fetches and
 * re-renders, same pattern as Fees by family's week nav. */
export function AttendanceRollControls({
  weekStartDate,
  roomId,
  rooms,
}: {
  weekStartDate: string;
  roomId: string;
  rooms: RollRoomOption[];
}) {
  const router = useRouter();

  function goTo(nextWeek: string, nextRoom: string) {
    const params = new URLSearchParams();
    params.set("week", nextWeek);
    if (nextRoom) params.set("room", nextRoom);
    router.push(`/roster/attendance-roll?${params.toString()}`);
  }

  return (
    <div className="card flex flex-wrap items-center gap-2 px-4 py-3 print:hidden">
      <button type="button" onClick={() => goTo(addDays(weekStartDate, -7), roomId)} className="btn-ghost px-2.5">
        ← Prev week
      </button>

      <label className="flex items-center gap-1.5 text-sm text-charcoal/70">
        <span className="sr-only">Choose a week</span>
        <input
          type="date"
          value={weekStartDate}
          onChange={(e) => {
            if (!e.target.value) return;
            goTo(mondayOf(new Date(`${e.target.value}T00:00:00Z`)), roomId);
          }}
          className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-burgundy-400 focus:outline-none focus:ring-2 focus:ring-burgundy-500/20"
        />
      </label>

      <button type="button" onClick={() => goTo(addDays(weekStartDate, 7), roomId)} className="btn-ghost px-2.5">
        Next week →
      </button>

      <button
        type="button"
        onClick={() => goTo(addDays(mondayOf(new Date()), 7), roomId)}
        className="btn-ghost px-2.5 text-xs"
      >
        Next week&apos;s default
      </button>

      <div className="ml-auto flex items-center gap-1.5">
        <label htmlFor="roll-room" className="text-sm text-charcoal/60">
          Room
        </label>
        <select
          id="roll-room"
          value={roomId}
          onChange={(e) => goTo(weekStartDate, e.target.value)}
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

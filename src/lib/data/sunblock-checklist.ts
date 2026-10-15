import "server-only";
import { getAttendanceRoll } from "@/lib/data/attendance-roll";
import { weekdayKeyOfDateString } from "@/lib/utils";

export type SunblockChecklistChild = {
  id: string;
  full_name: string;
  tbc: boolean;
};

export type SunblockChecklistRoom = {
  id: string;
  name: string;
  color: string;
  children: SunblockChecklistChild[];
};

/**
 * A single day's sunblock tick checklist, one room at a time — who to
 * apply (and reapply) sunblock for, pulled from the same `getAttendanceRoll`
 * booked-sessions data the Weekly Booked Sessions roll already reads, just
 * narrowed down to the one weekday `date` falls on instead of showing all
 * five. A child counts as "enrolled that day" exactly the same way the
 * roll's own daily booked totals do: they have both a start and end time
 * set for that weekday. A child flagged TBC still shows (staff may still
 * need to apply sunblock if they do turn up) with a TBC badge, same as the
 * roll shows it.
 *
 * `date` is a plain "YYYY-MM-DD" string. A Saturday/Sunday date returns
 * every room with an empty children list (the centre, and this data, only
 * has Mon-Fri columns) rather than throwing — the page itself explains
 * that to whoever picked a weekend date.
 *
 * This is read-only and invents nothing new: no table of its own, nothing
 * written anywhere. Printing it, and hand-ticking who actually got
 * sunblock applied and when, stays on paper — same as the Weekly Booked
 * Sessions roll's Notes column is filled in by hand today.
 */
export async function getSunblockChecklist(date: string, roomId?: string): Promise<SunblockChecklistRoom[]> {
  const weekday = weekdayKeyOfDateString(date);
  const rooms = await getAttendanceRoll(roomId);

  return rooms.map((room) => ({
    id: room.id,
    name: room.name,
    color: room.color,
    children: weekday
      ? room.children
          .filter((c) => c.tbc || (c.days[weekday].start && c.days[weekday].end))
          .map((c) => ({ id: c.id, full_name: c.full_name, tbc: c.tbc }))
      : [],
  }));
}

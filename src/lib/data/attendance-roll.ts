import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getChildrenList } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { HOME_ROOM_NAMES } from "@/lib/data/home";

export type AttendanceWeekday = "mon" | "tue" | "wed" | "thu" | "fri";

export const ATTENDANCE_WEEKDAYS: Array<{ key: AttendanceWeekday; label: string }> = [
  { key: "mon", label: "Mon" },
  { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" },
  { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" },
];

export type AttendanceRollChild = {
  id: string;
  full_name: string;
  days: Record<AttendanceWeekday, { start: string | null; end: string | null }>;
};

export type AttendanceRollRoom = {
  id: string;
  name: string;
  color: string;
  children: AttendanceRollChild[];
  bookedTotals: Record<AttendanceWeekday, number>;
};

type ScheduleRow = {
  child_id: string;
  mon_start: string | null;
  mon_end: string | null;
  tue_start: string | null;
  tue_end: string | null;
  wed_start: string | null;
  wed_end: string | null;
  thu_start: string | null;
  thu_end: string | null;
  fri_start: string | null;
  fri_end: string | null;
};

/**
 * One booked-sessions roll per room (Tainui / Ohinemuri / Pukewa — the same
 * three classrooms the Home dashboard and Roster ratios use; "Float" is a
 * relief-staff pool, not a room with its own enrolled children, so it's
 * left out here the same way it is there).
 *
 * This shows each active child's *regular booked* days/times — exactly the
 * same `child_enrolled_schedule` data that Roster ratios and the Weekly
 * Hours page's "Estimated" rows already read. Nothing new is stored here,
 * and editing a child's schedule on their profile is reflected the next
 * time this page loads. It does NOT reflect one-off changes for a specific
 * week (an extra day, a confirmed absence, a room transition taking effect
 * partway through the week) — those aren't tracked as structured data
 * anywhere in the app yet, so nothing here is invented to fill that gap.
 * The printed roll leaves a blank column for staff to note those by hand.
 *
 * `roomId` optionally narrows this to a single room (e.g. for printing just
 * Tainui) — omit it for every room, which is still the default everywhere
 * this was already used before the room filter existed.
 */
export async function getAttendanceRoll(roomId?: string): Promise<AttendanceRollRoom[]> {
  const supabase = createClient();

  const [rooms, children] = await Promise.all([getRosterRooms(), getChildrenList({ status: "active" })]);

  const childIds = children.map((c) => c.id);
  const { data: scheduleRows } =
    childIds.length > 0
      ? await supabase
          .from("child_enrolled_schedule")
          .select(
            "child_id, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end"
          )
          .in("child_id", childIds)
      : { data: [] as ScheduleRow[] };

  const scheduleByChildId = new Map((scheduleRows ?? []).map((r) => [(r as ScheduleRow).child_id, r as ScheduleRow]));

  return rooms
    .filter((r) => HOME_ROOM_NAMES.includes(r.name) && (!roomId || r.id === roomId))
    .sort((a, b) => HOME_ROOM_NAMES.indexOf(a.name) - HOME_ROOM_NAMES.indexOf(b.name))
    .map((room) => {
      const roomChildren: AttendanceRollChild[] = children
        .filter((c) => c.room_id === room.id)
        .map((c) => {
          const schedule = scheduleByChildId.get(c.id);
          const days = Object.fromEntries(
            ATTENDANCE_WEEKDAYS.map((d) => [
              d.key,
              {
                start: (schedule?.[`${d.key}_start` as keyof ScheduleRow] as string | null | undefined) ?? null,
                end: (schedule?.[`${d.key}_end` as keyof ScheduleRow] as string | null | undefined) ?? null,
              },
            ])
          ) as AttendanceRollChild["days"];
          return { id: c.id, full_name: c.full_name, days };
        });

      const bookedTotals = Object.fromEntries(
        ATTENDANCE_WEEKDAYS.map((d) => [
          d.key,
          roomChildren.filter((c) => c.days[d.key].start && c.days[d.key].end).length,
        ])
      ) as Record<AttendanceWeekday, number>;

      return {
        id: room.id,
        name: room.name,
        color: room.color,
        children: roomChildren,
        bookedTotals,
      };
    });
}

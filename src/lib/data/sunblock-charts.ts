import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getChildrenList } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { HOME_ROOM_NAMES } from "@/lib/data/home";
import { addDays } from "@/lib/utils";
import { WEEKDAYS, type Weekday } from "@/lib/constants";

export type SunblockChartChild = {
  id: string;
  full_name: string;
  tbc: boolean;
  bookedDays: Record<Weekday, boolean>;
  start_date: string | null;
  leaving_date: string | null;
  uses_own_sunblock: boolean;
  sunblock_instructions: string | null;
};

export type SunblockChartRoom = {
  id: string;
  name: string;
  color: string;
  children: SunblockChartChild[];
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
  tbc: boolean;
};

/**
 * The data behind every table the Sunblock Charts page prints — one query
 * regardless of how many weeks end up being printed, since a child's
 * *regular* booked days, their current room, and their sunblock preference
 * don't vary week to week; only whether a given printed week falls inside
 * their enrolment window does, and that's applied per week at render time
 * by `isEnrolledInWeek` below rather than re-fetched here. Printing a
 * three-month batch is still exactly one trip to the database.
 *
 * Same three rooms (Tainui/Ohinemuri/Pukewa) and the same
 * `child_enrolled_schedule` source as the Weekly Booked Sessions roll
 * (`getAttendanceRoll`) — this is deliberately a separate, smaller query
 * rather than reusing that function directly, since this also needs each
 * child's start/leaving date and sunblock preference, which that one
 * doesn't return.
 *
 * Known, honest limitations (not tracked as structured data anywhere in
 * the app, so nothing here invents an answer for them): a child's ROOM is
 * always their *current* `room_id` — there's no room-change history, so a
 * month printed for a child who moved rooms partway through shows their
 * new room for every week, including ones before the move. A one-off extra
 * day added for a single week (beyond the regular schedule below) isn't
 * tracked either. Both match the existing caveat on the Booked Sessions
 * roll this is built from.
 */
export async function getSunblockChartRooms(roomId?: string): Promise<SunblockChartRoom[]> {
  const [rooms, children] = await Promise.all([getRosterRooms(), getChildrenList({ status: "active" })]);

  const supabase = createClient();
  const childIds = children.map((c) => c.id);
  const { data: scheduleRows } =
    childIds.length > 0
      ? await supabase
          .from("child_enrolled_schedule")
          .select(
            "child_id, mon_start, mon_end, tue_start, tue_end, wed_start, wed_end, thu_start, thu_end, fri_start, fri_end, tbc"
          )
          .in("child_id", childIds)
      : { data: [] as ScheduleRow[] };

  const scheduleByChildId = new Map((scheduleRows ?? []).map((r) => [(r as ScheduleRow).child_id, r as ScheduleRow]));

  return rooms
    .filter((r) => HOME_ROOM_NAMES.includes(r.name) && (!roomId || r.id === roomId))
    .sort((a, b) => HOME_ROOM_NAMES.indexOf(a.name) - HOME_ROOM_NAMES.indexOf(b.name))
    .map((room) => {
      const roomChildren: SunblockChartChild[] = children
        .filter((c) => c.room_id === room.id)
        .sort((a, b) => a.full_name.localeCompare(b.full_name))
        .map((c) => {
          const schedule = scheduleByChildId.get(c.id);
          const bookedDays = Object.fromEntries(
            WEEKDAYS.map((d) => [
              d.key,
              Boolean(
                (schedule?.[`${d.key}_start` as keyof ScheduleRow] as string | null | undefined) &&
                  (schedule?.[`${d.key}_end` as keyof ScheduleRow] as string | null | undefined)
              ),
            ])
          ) as Record<Weekday, boolean>;
          return {
            id: c.id,
            full_name: c.full_name,
            tbc: schedule?.tbc ?? false,
            bookedDays,
            start_date: c.start_date,
            leaving_date: c.leaving_date,
            uses_own_sunblock: c.uses_own_sunblock,
            sunblock_instructions: c.sunblock_instructions,
          };
        });

      return { id: room.id, name: room.name, color: room.color, children: roomChildren };
    });
}

/** Whether a child was enrolled at any point during the Mon-Fri week
 * starting `weekStartDate` — both `start_date`/`leaving_date` are optional
 * and inclusive. A child entirely outside this window is dropped from that
 * week's chart rather than shown with every day dashed out, since they
 * genuinely weren't part of the centre that week. */
export function isEnrolledInWeek(
  child: { start_date: string | null; leaving_date: string | null },
  weekStartDate: string
): boolean {
  const weekEnd = addDays(weekStartDate, 4); // Friday
  if (child.leaving_date && child.leaving_date < weekStartDate) return false;
  if (child.start_date && child.start_date > weekEnd) return false;
  return true;
}

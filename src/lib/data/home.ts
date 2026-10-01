import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getRosterRooms } from "@/lib/data/roster";
import { getWeekdayRoomRoll, minStaffRequired, type Weekday } from "@/lib/data/roster-ratios";
import { getCalendarMonth, getStaffLeaveForRange } from "@/lib/data/calendar";
import { STAFF_LEAVE_TYPE_LABEL } from "@/lib/constants";
import { addDays, formatShortDate } from "@/lib/utils";

// ---------------------------------------------------------------------------
// Data for the new operational Home dashboard (see src/app/(portal)/dashboard
// /page.tsx). Everything here reads data that already exists elsewhere in
// the app (roster, roster ratios, calendar, activity log) — nothing new is
// stored, and nothing is fabricated: a metric with no real underlying data
// (e.g. live child sign-in/out) is left out of this file entirely rather
// than invented, and the page itself shows an honest "not tracked yet"
// label for it.
// ---------------------------------------------------------------------------

/** The three fixed classrooms the Home dashboard's "Rooms today" section
 * shows, matching the brief. "Float" (the fourth roster_rooms row) is a
 * relief-staff pool rather than a physical room with its own enrolled
 * children, so it's left out here — it's untouched everywhere else
 * (Roster, Roster ratios) that already uses all four rooms. */
export const HOME_ROOM_NAMES = ["Tainui", "Ohinemuri", "Pukewa"];

function weekdayKeyFor(date: Date): Weekday | null {
  switch (date.getDay()) {
    case 1:
      return "mon";
    case 2:
      return "tue";
    case 3:
      return "wed";
    case 4:
      return "thu";
    case 5:
      return "fri";
    default:
      return null; // Saturday / Sunday — the centre doesn't operate weekends
  }
}

function todayDateString(): string {
  return new Date().toISOString().slice(0, 10);
}

type RoomDayRoll = Awaited<ReturnType<typeof getWeekdayRoomRoll>>;
const NO_ROLL: RoomDayRoll = [];

export type TodaySummary = {
  isWeekend: boolean;
  /** null on a weekend — there's no enrolled-schedule concept for Sat/Sun. */
  childrenExpectedToday: number | null;
  staffRosteredToday: number;
  roomsOperatingToday: number;
  roomsTotal: number;
};

/** The four "Today at Beach Kids" tiles. Three are real, derived numbers;
 * "children currently signed in" isn't computed here at all — there's no
 * live sign-in/out record in the schema yet, and the dashboard shows an
 * honest "not tracked yet" label for it rather than a number. */
export async function getTodaySummary(): Promise<TodaySummary> {
  const supabase = createClient();
  const now = new Date();
  const weekdayKey = weekdayKeyFor(now);
  const todayStr = todayDateString();

  const [rooms, roll, { data: shiftRows }] = await Promise.all([
    getRosterRooms(),
    weekdayKey ? getWeekdayRoomRoll(weekdayKey, now) : Promise.resolve(NO_ROLL),
    supabase.from("roster_shifts").select("staff_id, room_id").eq("shift_date", todayStr),
  ]);

  const childrenExpectedToday = weekdayKey ? roll.reduce((sum, r) => sum + r.enrolledTotal, 0) : null;
  const staffRosteredToday = (shiftRows ?? []).length;

  const roomIdsWithStaff = new Set((shiftRows ?? []).filter((s) => s.room_id).map((s) => s.room_id as string));
  const roomIdsWithChildren = new Set(
    roll.filter((r) => r.room && r.enrolledTotal > 0).map((r) => r.room!.id)
  );
  const operatingRoomIds = new Set([...roomIdsWithStaff, ...roomIdsWithChildren]);

  return {
    isWeekend: weekdayKey === null,
    childrenExpectedToday,
    staffRosteredToday,
    roomsOperatingToday: weekdayKey ? operatingRoomIds.size : 0,
    roomsTotal: rooms.length,
  };
}

export type RoomToday = {
  room: { id: string; name: string; color: string };
  childCount: number;
  under2: number;
  over2: number;
  minStaffRequired: number;
  staffCount: number;
  staffNames: string[];
};

/** Tainui / Ohinemuri / Pukewa for today: expected enrolled children (from
 * each active child's regular weekday schedule and room assignment — the
 * same real data the Roster ratios page uses) and who's actually rostered
 * there today (from the roster's own shift rows for today's date). */
export async function getRoomsToday(): Promise<RoomToday[]> {
  const supabase = createClient();
  const now = new Date();
  const weekdayKey = weekdayKeyFor(now);
  const todayStr = todayDateString();

  const [rooms, roll, { data: shiftRows }] = await Promise.all([
    getRosterRooms(),
    weekdayKey ? getWeekdayRoomRoll(weekdayKey, now) : Promise.resolve(NO_ROLL),
    supabase.from("roster_shifts").select("staff_id, room_id").eq("shift_date", todayStr),
  ]);

  const staffIds = Array.from(new Set((shiftRows ?? []).map((s) => s.staff_id as string)));
  const { data: staffRows } =
    staffIds.length > 0
      ? await supabase.from("staff").select("id, full_name").in("id", staffIds)
      : { data: [] as { id: string; full_name: string }[] };
  const staffNameById = new Map((staffRows ?? []).map((s) => [s.id as string, s.full_name as string]));

  const staffNamesByRoom = new Map<string, string[]>();
  (shiftRows ?? []).forEach((s) => {
    if (!s.room_id) return;
    const name = staffNameById.get(s.staff_id as string);
    if (!name) return;
    const list = staffNamesByRoom.get(s.room_id as string) ?? [];
    list.push(name);
    staffNamesByRoom.set(s.room_id as string, list);
  });

  const rollByRoomId = new Map(roll.filter((r) => r.room).map((r) => [r.room!.id, r]));

  return rooms
    .filter((r) => HOME_ROOM_NAMES.includes(r.name))
    .sort((a, b) => HOME_ROOM_NAMES.indexOf(a.name) - HOME_ROOM_NAMES.indexOf(b.name))
    .map((r) => {
      const rollForRoom = rollByRoomId.get(r.id);
      const peakMinStaff = rollForRoom
        ? rollForRoom.snapshots.reduce((max, s) => Math.max(max, minStaffRequired(s.under2, s.over2)), 0)
        : 0;
      const staffNames = (staffNamesByRoom.get(r.id) ?? []).sort();

      return {
        room: { id: r.id, name: r.name, color: r.color },
        childCount: rollForRoom?.enrolledTotal ?? 0,
        under2: rollForRoom?.enrolledUnder2 ?? 0,
        over2: rollForRoom?.enrolledOver2 ?? 0,
        minStaffRequired: peakMinStaff,
        staffCount: staffNames.length,
        staffNames,
      };
    });
}

export type UpcomingEvent = {
  date: string;
  kind: "public_holiday" | "staff_leave" | "staff_birthday" | "child_birthday";
  title: string;
};

/** Public holidays, booked staff leave, and staff/child birthdays over the
 * next `daysAhead` days — all three already computed for the Centre
 * Calendar page; this just recombines them into one flat, sorted list
 * instead of a month grid. Nothing new is stored or invented here. */
export async function getUpcomingEvents(daysAhead = 14): Promise<UpcomingEvent[]> {
  const todayStr = todayDateString();
  const endDate = addDays(todayStr, daysAhead);
  const monthKeys = Array.from(new Set([todayStr.slice(0, 7), endDate.slice(0, 7)]));

  const [monthGrids, leave] = await Promise.all([
    Promise.all(monthKeys.map((mk) => getCalendarMonth(mk))),
    getStaffLeaveForRange(todayStr, endDate),
  ]);

  const events: UpcomingEvent[] = [];

  monthGrids
    .flat()
    .flatMap((w) => w.days)
    .filter((d) => d.date >= todayStr && d.date <= endDate)
    .forEach((day) => {
      day.events.forEach((e) => {
        if (e.kind === "public_holiday") {
          events.push({ date: day.date, kind: "public_holiday", title: e.name });
        } else if (e.kind === "staff_birthday") {
          events.push({ date: day.date, kind: "staff_birthday", title: `${e.name}'s birthday` });
        } else if (e.kind === "child_birthday") {
          events.push({ date: day.date, kind: "child_birthday", title: `${e.name}'s birthday` });
        }
        // staff_leave is handled separately below, from getStaffLeaveForRange
        // directly, so a multi-day block shows once rather than once per day.
      });
    });

  leave.forEach((l) => {
    const rangeLabel =
      l.start_date === l.end_date
        ? ""
        : ` (${formatShortDate(l.start_date)}–${formatShortDate(l.end_date)})`;
    events.push({
      date: l.start_date >= todayStr ? l.start_date : todayStr,
      kind: "staff_leave",
      title: `${l.staff_name} — ${STAFF_LEAVE_TYPE_LABEL[l.leave_type]} leave${rangeLabel}`,
    });
  });

  return events.sort((a, b) => a.date.localeCompare(b.date));
}

export type RecentActivityItem = {
  id: string;
  description: string;
  eventType: string;
  createdAt: string;
};

/** Reads the app's existing `activity_log` table (added in 0001_init.sql
 * as an audit trail, per its own comment) — nothing new is created here.
 * No part of the app currently writes to it, so this will honestly return
 * an empty list today; the Home dashboard shows a polished empty state in
 * that case rather than pretending there's a feed. The moment any action
 * starts logging to this table, this same query will pick it up. */
export async function getRecentActivity(limit = 8): Promise<RecentActivityItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("activity_log")
    .select("id, description, event_type, created_at")
    .order("created_at", { ascending: false })
    .limit(limit);

  return (data ?? []).map((r) => ({
    id: r.id as string,
    description: r.description as string,
    eventType: r.event_type as string,
    createdAt: r.created_at as string,
  }));
}

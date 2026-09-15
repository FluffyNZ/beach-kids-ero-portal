import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getRosterRooms } from "@/lib/data/roster";
import { classifyAgeGroup, type AgeGroup } from "@/lib/age";

export type Weekday = "mon" | "tue" | "wed" | "thu" | "fri";

export const WEEKDAYS: { key: Weekday; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
];

// The four times ratio compliance is tightest: early drop-off, the
// mid-morning settle, and the afternoon changeover as the day winds down.
export const RATIO_SNAPSHOT_TIMES = ["08:00", "08:30", "14:30", "15:00"] as const;

// NZ minimum adult:child ratios for a centre-based, all-day ECE service —
// Schedule 2, Education (Early Childhood Services) Regulations 2008.
export const MIN_RATIO_UNDER_2 = 5; // 1 adult : 5 children under 2
export const MIN_RATIO_OVER_2 = 10; // 1 adult : 10 children aged 2 and over

export type RoomTimeSnapshot = {
  time: (typeof RATIO_SNAPSHOT_TIMES)[number];
  under2: number;
  over2: number;
  unknown: number;
  total: number;
  children: { id: string; full_name: string; group: AgeGroup; borderline: boolean }[];
};

export type RoomDayRoll = {
  // null = children with no room assigned yet — surfaced rather than
  // silently dropped, since a real child missing from every room's count
  // would be worse than an awkward "no room assigned" card.
  room: { id: string; name: string; color: string } | null;
  enrolledTotal: number;
  enrolledUnder2: number;
  enrolledOver2: number;
  enrolledUnknown: number;
  snapshots: RoomTimeSnapshot[];
};

type ChildRow = {
  id: string;
  full_name: string;
  room_id: string | null;
  age_years: number | null;
  age_months: number | null;
  age_as_of: string | null;
};

type ScheduleRow = { child_id: string; start: string | null; end: string | null };

type EnrichedChild = {
  id: string;
  full_name: string;
  startMin: number;
  endMin: number;
  group: AgeGroup;
  borderline: boolean;
};

function timeToMinutes(value: string | null | undefined): number | null {
  if (!value) return null;
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? "0");
  if (Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

function buildRoll(room: { id: string; name: string; color: string } | null, kids: EnrichedChild[]): RoomDayRoll {
  const enrolledUnder2 = kids.filter((k) => k.group === "under2").length;
  const enrolledOver2 = kids.filter((k) => k.group === "over2").length;
  const enrolledUnknown = kids.filter((k) => k.group === "unknown").length;

  const snapshots: RoomTimeSnapshot[] = RATIO_SNAPSHOT_TIMES.map((time) => {
    const mins = timeToMinutes(time)!;
    const present = kids.filter((k) => k.startMin <= mins && mins < k.endMin);
    const under2 = present.filter((k) => k.group === "under2").length;
    const over2 = present.filter((k) => k.group === "over2").length;
    const unknown = present.filter((k) => k.group === "unknown").length;

    return {
      time,
      under2,
      over2,
      unknown,
      total: present.length,
      children: present
        .map((k) => ({ id: k.id, full_name: k.full_name, group: k.group, borderline: k.borderline }))
        .sort((a, b) => a.full_name.localeCompare(b.full_name)),
    };
  });

  return {
    room,
    enrolledTotal: kids.length,
    enrolledUnder2,
    enrolledOver2,
    enrolledUnknown,
    snapshots,
  };
}

/** For a normal (recurring) weekday, the expected roll per room and the
 * expected under-2/over-2 headcount at each ratio snapshot time — built
 * from each active child's room assignment, their regular enrolled
 * schedule for that weekday, and their most recently recorded age
 * projected forward to `asOfDate`.
 *
 * This reflects the standard week, not a specific calendar date: the app
 * doesn't yet track day-to-day exceptions (sick days, casual bookings), so
 * a real Tuesday could differ from what "Tuesday" shows here. */
export async function getWeekdayRoomRoll(weekday: Weekday, asOfDate: Date = new Date()): Promise<RoomDayRoll[]> {
  const supabase = createClient();
  const startCol = `${weekday}_start`;
  const endCol = `${weekday}_end`;

  const [{ data: childRows }, { data: scheduleRows }, rooms] = await Promise.all([
    supabase
      .from("children")
      .select("id, full_name, room_id, age_years, age_months, age_as_of")
      .eq("status", "active"),
    supabase.from("child_enrolled_schedule").select(`child_id, ${startCol}, ${endCol}`),
    getRosterRooms(),
  ]);

  const scheduleByChild = new Map<string, ScheduleRow>();
  (scheduleRows ?? []).forEach((row: any) => {
    scheduleByChild.set(row.child_id, { child_id: row.child_id, start: row[startCol], end: row[endCol] });
  });

  const enrichedByRoom = new Map<string | null, EnrichedChild[]>();

  for (const c of (childRows ?? []) as ChildRow[]) {
    const sched = scheduleByChild.get(c.id);
    const startMin = timeToMinutes(sched?.start);
    const endMin = timeToMinutes(sched?.end);
    if (startMin === null || endMin === null || endMin <= startMin) continue; // not enrolled this weekday

    const { group, borderline } = classifyAgeGroup(c.age_years, c.age_months, c.age_as_of, asOfDate);
    const bucketKey = c.room_id ?? null;
    const list = enrichedByRoom.get(bucketKey) ?? [];
    list.push({ id: c.id, full_name: c.full_name, startMin, endMin, group, borderline });
    enrichedByRoom.set(bucketKey, list);
  }

  const rolls = rooms.map((room) =>
    buildRoll({ id: room.id, name: room.name, color: room.color }, enrichedByRoom.get(room.id) ?? [])
  );

  const unassigned = enrichedByRoom.get(null) ?? [];
  if (unassigned.length > 0) {
    rolls.push(buildRoll(null, unassigned));
  }

  return rolls;
}

export function minStaffRequired(under2: number, over2: number): number {
  return Math.ceil(under2 / MIN_RATIO_UNDER_2) + Math.ceil(over2 / MIN_RATIO_OVER_2);
}

export type WeekdayRatioCell = {
  enrolledTotal: number;
  enrolledUnder2: number;
  enrolledOver2: number;
  /** The highest "min. staff" figure across the day's four ratio snapshot
   * times — the tightest moment of that day, not an average. */
  peakMinStaff: number;
};

export type RoomWeekRatioRow = {
  room: { id: string; name: string; color: string } | null;
  cells: Record<Weekday, WeekdayRatioCell>;
};

const EMPTY_CELL: WeekdayRatioCell = { enrolledTotal: 0, enrolledUnder2: 0, enrolledOver2: 0, peakMinStaff: 0 };

function emptyWeekCells(): Record<Weekday, WeekdayRatioCell> {
  return { mon: EMPTY_CELL, tue: EMPTY_CELL, wed: EMPTY_CELL, thu: EMPTY_CELL, fri: EMPTY_CELL };
}

function cellFromRoll(roll: RoomDayRoll): WeekdayRatioCell {
  const peakMinStaff = roll.snapshots.reduce(
    (max, s) => Math.max(max, minStaffRequired(s.under2, s.over2)),
    0
  );
  return {
    enrolledTotal: roll.enrolledTotal,
    enrolledUnder2: roll.enrolledUnder2,
    enrolledOver2: roll.enrolledOver2,
    peakMinStaff,
  };
}

/** A condensed, Mon–Fri view of the same expected roll `getWeekdayRoomRoll`
 * computes one day at a time — one row per room, one column per weekday —
 * meant to sit directly under the staff roster grid. `centreRow` is the
 * whole-centre figure per day: for enrolment it's a simple sum across
 * rooms, but `peakMinStaff` is computed from the centre-wide under-2/over-2
 * totals at each snapshot time (not by summing each room's own peak, which
 * could overstate a moment that never actually happens on the same day). */
export async function getWeekRoomRatioSummary(): Promise<{
  rows: RoomWeekRatioRow[];
  centreRow: Record<Weekday, WeekdayRatioCell>;
}> {
  const weekdayKeys = WEEKDAYS.map((w) => w.key);
  const [rollsByWeekday, rooms] = await Promise.all([
    Promise.all(weekdayKeys.map((wd) => getWeekdayRoomRoll(wd))),
    getRosterRooms(),
  ]);

  const rowByRoomId = new Map<string, RoomWeekRatioRow>();
  rooms.forEach((r) => {
    rowByRoomId.set(r.id, { room: { id: r.id, name: r.name, color: r.color }, cells: emptyWeekCells() });
  });
  let unassignedRow: RoomWeekRatioRow | null = null;

  const centreRow = emptyWeekCells();

  weekdayKeys.forEach((wd, i) => {
    const rolls = rollsByWeekday[i];

    rolls.forEach((roll) => {
      const cell = cellFromRoll(roll);
      if (roll.room) {
        const row = rowByRoomId.get(roll.room.id);
        if (row) row.cells[wd] = cell;
      } else if (cell.enrolledTotal > 0) {
        if (!unassignedRow) unassignedRow = { room: null, cells: emptyWeekCells() };
        unassignedRow.cells[wd] = cell;
      }
    });

    const perTimeMinStaff = RATIO_SNAPSHOT_TIMES.map((_, timeIdx) => {
      const under2 = rolls.reduce((s, r) => s + r.snapshots[timeIdx].under2, 0);
      const over2 = rolls.reduce((s, r) => s + r.snapshots[timeIdx].over2, 0);
      return minStaffRequired(under2, over2);
    });

    centreRow[wd] = {
      enrolledTotal: rolls.reduce((s, r) => s + r.enrolledTotal, 0),
      enrolledUnder2: rolls.reduce((s, r) => s + r.enrolledUnder2, 0),
      enrolledOver2: rolls.reduce((s, r) => s + r.enrolledOver2, 0),
      peakMinStaff: Math.max(0, ...perTimeMinStaff),
    };
  });

  const rows = Array.from(rowByRoomId.values());
  if (unassignedRow) rows.push(unassignedRow);

  return { rows, centreRow };
}

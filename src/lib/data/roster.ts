import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { RosterRoom, RosterShift, RosterWeekDetail, RosterWeekSummary } from "@/lib/types";

export async function getRosterRooms(): Promise<RosterRoom[]> {
  const supabase = createClient();
  const { data } = await supabase.from("roster_rooms").select("*").order("sort_order", { ascending: true });

  return (data ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    color: r.color,
    sort_order: r.sort_order,
  }));
}

/** Recent weeks that have a roster_weeks row, newest first, with how many
 * shifts each one has — used to find a week worth offering to duplicate
 * from, and could later back a "past weeks" list. */
export async function listRosterWeeks(limit = 12): Promise<RosterWeekSummary[]> {
  const supabase = createClient();
  const { data: weeks } = await supabase
    .from("roster_weeks")
    .select("*")
    .order("week_start_date", { ascending: false })
    .limit(limit);

  if (!weeks || weeks.length === 0) return [];

  const weekIds = weeks.map((w) => w.id);
  const { data: shiftRows } = await supabase.from("roster_shifts").select("week_id").in("week_id", weekIds);

  const countByWeek = new Map<string, number>();
  (shiftRows ?? []).forEach((s) => countByWeek.set(s.week_id, (countByWeek.get(s.week_id) ?? 0) + 1));

  return weeks.map((w) => ({
    id: w.id,
    week_start_date: w.week_start_date,
    notes: w.notes,
    shift_count: countByWeek.get(w.id) ?? 0,
  }));
}

/** The full roster for the week starting on `weekStartDate` (a Monday), or
 * null if that week hasn't been created yet (nobody has entered a shift
 * for it). The roster page creates the week on first save, not on view. */
export async function getRosterWeekByStartDate(weekStartDate: string): Promise<RosterWeekDetail | null> {
  const supabase = createClient();
  const { data: week } = await supabase
    .from("roster_weeks")
    .select("*")
    .eq("week_start_date", weekStartDate)
    .maybeSingle();

  if (!week) return null;

  const { data: shiftRows } = await supabase
    .from("roster_shifts")
    .select("*")
    .eq("week_id", week.id)
    .order("shift_date", { ascending: true });

  const shifts: RosterShift[] = (shiftRows ?? []).map((s) => ({
    id: s.id,
    staff_id: s.staff_id,
    room_id: s.room_id,
    shift_date: s.shift_date,
    start_time: s.start_time,
    end_time: s.end_time,
    notes: s.notes,
  }));

  return {
    id: week.id,
    week_start_date: week.week_start_date,
    notes: week.notes,
    shifts,
  };
}

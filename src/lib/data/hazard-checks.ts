import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSignedEvidenceUrl } from "./evidence";
import { addDays, addMonths, mondayOf, mondayOfDateString } from "@/lib/utils";
import type {
  HazardCheck,
  HazardCheckDailySignoff,
  HazardCheckItem,
  HazardCheckSummary,
  HazardChecklistTemplateItem,
  HazardLogEntry,
  HazardRegisterEntry,
  RosterRoom,
} from "@/lib/types";

type CheckRow = {
  id: string;
  room_id: string;
  week_start_date: string;
  notes: string | null;
  evidence_id: string | null;
  created_at: string;
  updated_at: string;
};

type SignoffRow = {
  id: string;
  check_id: string;
  check_date: string;
  staff_id: string | null;
  completed_time: string | null;
  signed_off: boolean;
  signed_off_at: string | null;
};

type ItemRow = {
  id: string;
  check_id: string;
  category: "indoor" | "outdoor" | "allergy";
  item_text: string;
  is_checked: boolean;
  sort_order: number;
};

type LogRow = {
  id: string;
  check_id: string;
  hazard_description: string;
  risk_level: "low" | "medium" | "high";
  resolved: boolean;
  resolved_at: string | null;
  created_at: string;
};

/** A week's chart runs Monday through Friday — five sign-off columns,
 * matching the real paper chart and Beach Kids' weekday-only opening days. */
const WEEKDAY_OFFSETS = [0, 1, 2, 3, 4];

/** Only rooms with a hazard checklist template can have a check started —
 * this is what keeps "Float" (a staff pool, not a physical room) off the
 * room picker without hardcoding its name anywhere. */
export async function getRoomsWithHazardTemplates(): Promise<RosterRoom[]> {
  const supabase = createClient();

  const [{ data: rooms }, { data: templateRoomIds }] = await Promise.all([
    supabase.from("roster_rooms").select("*").order("sort_order", { ascending: true }),
    supabase.from("hazard_checklist_templates").select("room_id"),
  ]);

  const roomIdsWithTemplates = new Set((templateRoomIds ?? []).map((r) => r.room_id));

  return (rooms ?? [])
    .filter((r) => roomIdsWithTemplates.has(r.id))
    .map((r) => ({ id: r.id, name: r.name, color: r.color, sort_order: r.sort_order }));
}

export async function getHazardChecklistTemplate(roomId: string): Promise<HazardChecklistTemplateItem[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hazard_checklist_templates")
    .select("category, item_text, sort_order")
    .eq("room_id", roomId)
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });
  return (data ?? []) as HazardChecklistTemplateItem[];
}

/** Every room-with-a-checklist's template, keyed by room id — used by the
 * photo-import form to render whichever room's checklist the AI (or the
 * human reviewer) selects, without a page load per room. */
export async function getHazardChecklistTemplatesByRoom(): Promise<Record<string, HazardChecklistTemplateItem[]>> {
  const rooms = await getRoomsWithHazardTemplates();
  const supabase = createClient();
  const { data } = await supabase
    .from("hazard_checklist_templates")
    .select("room_id, category, item_text, sort_order")
    .in(
      "room_id",
      rooms.map((r) => r.id)
    )
    .order("category", { ascending: true })
    .order("sort_order", { ascending: true });

  const byRoom: Record<string, HazardChecklistTemplateItem[]> = {};
  rooms.forEach((r) => {
    byRoom[r.id] = [];
  });
  (data ?? []).forEach((row) => {
    const list = byRoom[row.room_id] ?? (byRoom[row.room_id] = []);
    list.push({ category: row.category, item_text: row.item_text, sort_order: row.sort_order });
  });
  return byRoom;
}

async function mapChecks(rows: CheckRow[]): Promise<Array<{ row: CheckRow; roomName: string; roomColor: string }>> {
  if (rows.length === 0) return [];
  const supabase = createClient();

  const roomIds = Array.from(new Set(rows.map((r) => r.room_id)));
  const { data: rooms } = await supabase.from("roster_rooms").select("id, name, color").in("id", roomIds);
  const roomById = new Map((rooms ?? []).map((r) => [r.id, r]));

  return rows.map((row) => ({
    row,
    roomName: roomById.get(row.room_id)?.name ?? "Unknown room",
    roomColor: roomById.get(row.room_id)?.color ?? "charcoal",
  }));
}

async function mapSignoffs(rows: SignoffRow[]): Promise<HazardCheckDailySignoff[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();
  const staffIds = Array.from(new Set(rows.map((r) => r.staff_id).filter((id): id is string => Boolean(id))));
  const { data: staffRows } =
    staffIds.length > 0
      ? await supabase.from("staff").select("id, full_name").in("id", staffIds)
      : { data: [] as Array<{ id: string; full_name: string }> };
  const staffNameById = new Map((staffRows ?? []).map((s) => [s.id, s.full_name]));

  return rows
    .slice()
    .sort((a, b) => a.check_date.localeCompare(b.check_date))
    .map((r) => ({
      id: r.id,
      check_date: r.check_date,
      staff_id: r.staff_id,
      staff_name: r.staff_id ? (staffNameById.get(r.staff_id) ?? null) : null,
      completed_time: r.completed_time,
      signed_off: r.signed_off,
      signed_off_at: r.signed_off_at,
    }));
}

export async function getHazardChecksList(filters?: {
  roomId?: string;
  monthKey?: string; // "YYYY-MM"
}): Promise<HazardCheckSummary[]> {
  const supabase = createClient();
  let query = supabase.from("hazard_checks").select("*").order("week_start_date", { ascending: false });

  if (filters?.roomId) query = query.eq("room_id", filters.roomId);
  if (filters?.monthKey) {
    const [y, m] = filters.monthKey.split("-").map(Number);
    const start = `${filters.monthKey}-01`;
    const end = new Date(Date.UTC(y, m, 1)).toISOString().slice(0, 10);
    query = query.gte("week_start_date", start).lt("week_start_date", end);
  }

  const { data: rows } = await query;
  const checks = (rows ?? []) as CheckRow[];
  if (checks.length === 0) return [];

  const checkIds = checks.map((c) => c.id);
  const [mapped, { data: items }, { data: logEntries }, { data: signoffs }] = await Promise.all([
    mapChecks(checks),
    supabase.from("hazard_check_items").select("check_id, is_checked").in("check_id", checkIds),
    supabase.from("hazard_log_entries").select("check_id, resolved").in("check_id", checkIds),
    supabase.from("hazard_check_daily_signoffs").select("check_id, signed_off").in("check_id", checkIds),
  ]);

  const itemsByCheck = new Map<string, { total: number; checked: number }>();
  (items ?? []).forEach((i) => {
    const entry = itemsByCheck.get(i.check_id) ?? { total: 0, checked: 0 };
    entry.total += 1;
    if (i.is_checked) entry.checked += 1;
    itemsByCheck.set(i.check_id, entry);
  });

  const openHazardsByCheck = new Map<string, number>();
  (logEntries ?? []).forEach((l) => {
    if (!l.resolved) openHazardsByCheck.set(l.check_id, (openHazardsByCheck.get(l.check_id) ?? 0) + 1);
  });

  const signoffCountByCheck = new Map<string, { total: number; signed: number }>();
  (signoffs ?? []).forEach((s) => {
    const entry = signoffCountByCheck.get(s.check_id) ?? { total: 0, signed: 0 };
    entry.total += 1;
    if (s.signed_off) entry.signed += 1;
    signoffCountByCheck.set(s.check_id, entry);
  });

  return mapped.map(({ row, roomName, roomColor }) => ({
    id: row.id,
    room_id: row.room_id,
    room_name: roomName,
    room_color: roomColor,
    week_start_date: row.week_start_date,
    daysSignedOff: signoffCountByCheck.get(row.id)?.signed ?? 0,
    totalWeekdays: signoffCountByCheck.get(row.id)?.total ?? WEEKDAY_OFFSETS.length,
    itemsTotal: itemsByCheck.get(row.id)?.total ?? 0,
    itemsChecked: itemsByCheck.get(row.id)?.checked ?? 0,
    openHazardCount: openHazardsByCheck.get(row.id) ?? 0,
  }));
}

export async function getHazardCheckById(id: string): Promise<HazardCheck | null> {
  const supabase = createClient();
  const { data: row } = await supabase.from("hazard_checks").select("*").eq("id", id).maybeSingle();
  if (!row) return null;

  const checkRow = row as CheckRow;
  const [mapped, { data: items }, { data: logEntries }, { data: signoffRows }, evidencePhotoUrl] = await Promise.all([
    mapChecks([checkRow]),
    supabase
      .from("hazard_check_items")
      .select("*")
      .eq("check_id", id)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true }),
    supabase.from("hazard_log_entries").select("*").eq("check_id", id).order("created_at", { ascending: true }),
    supabase.from("hazard_check_daily_signoffs").select("*").eq("check_id", id),
    resolveEvidencePhotoUrl(checkRow.evidence_id),
  ]);

  const { roomName, roomColor } = mapped[0];

  const mappedItems: HazardCheckItem[] = ((items ?? []) as ItemRow[]).map((i) => ({
    id: i.id,
    category: i.category,
    item_text: i.item_text,
    is_checked: i.is_checked,
    sort_order: i.sort_order,
  }));

  const mappedLog: HazardLogEntry[] = ((logEntries ?? []) as LogRow[]).map((l) => ({
    id: l.id,
    check_id: l.check_id,
    hazard_description: l.hazard_description,
    risk_level: l.risk_level,
    resolved: l.resolved,
    resolved_at: l.resolved_at,
    created_at: l.created_at,
  }));

  const dailySignoffs = await mapSignoffs((signoffRows ?? []) as SignoffRow[]);

  return {
    id: checkRow.id,
    room_id: checkRow.room_id,
    room_name: roomName,
    room_color: roomColor,
    week_start_date: checkRow.week_start_date,
    notes: checkRow.notes,
    createdAt: checkRow.created_at,
    items: mappedItems,
    logEntries: mappedLog,
    dailySignoffs,
    evidence_id: checkRow.evidence_id,
    evidencePhotoUrl,
  };
}

/** Resolves one evidence row's storage path to a short-lived signed URL —
 * factored out since getHazardCheckById only ever needs one at a time
 * (unlike accident-illness's list view, which resolves several). */
async function resolveEvidencePhotoUrl(evidenceId: string | null): Promise<string | null> {
  if (!evidenceId) return null;
  const supabase = createClient();
  const { data: evidenceRow } = await supabase
    .from("evidence")
    .select("storage_path")
    .eq("id", evidenceId)
    .maybeSingle();
  if (!evidenceRow) return null;
  return getSignedEvidenceUrl(evidenceRow.storage_path);
}

/** Finds the chart for a room's week (identified by its Monday) if one
 * already exists — used so "start a new check" never creates a second one
 * for the same room and week (the hazard_checks table also enforces this
 * with a unique constraint). */
export async function getHazardCheckForRoomAndWeek(roomId: string, weekStartDate: string): Promise<{ id: string } | null> {
  const supabase = createClient();
  const { data } = await supabase
    .from("hazard_checks")
    .select("id")
    .eq("room_id", roomId)
    .eq("week_start_date", weekStartDate)
    .maybeSingle();
  return data ? { id: data.id } : null;
}

export type RoomWeekStatus = {
  room: RosterRoom;
  weekCheckId: string | null;
  /** Whether TODAY specifically (one weekday within this week's chart) has
   * been signed off yet — null if today isn't a weekday this chart tracks
   * (e.g. a weekend) or the week's chart hasn't been started at all. */
  todaySignedOff: boolean | null;
};

/** Drives the "This week" section on the hazard checks list page — one row
 * per room that has a checklist, showing whether this week's chart has
 * been started and whether TODAY's column on it has been signed off yet. */
export async function getThisWeeksHazardCheckStatus(weekStartDate: string, today: string): Promise<RoomWeekStatus[]> {
  const rooms = await getRoomsWithHazardTemplates();
  if (rooms.length === 0) return [];

  const supabase = createClient();
  const { data: checks } = await supabase
    .from("hazard_checks")
    .select("id, room_id")
    .eq("week_start_date", weekStartDate)
    .in(
      "room_id",
      rooms.map((r) => r.id)
    );

  const checkByRoom = new Map((checks ?? []).map((c) => [c.room_id, c]));
  const checkIds = (checks ?? []).map((c) => c.id);

  const { data: todaySignoffs } =
    checkIds.length > 0
      ? await supabase.from("hazard_check_daily_signoffs").select("check_id, signed_off").in("check_id", checkIds).eq("check_date", today)
      : { data: [] as Array<{ check_id: string; signed_off: boolean }> };
  const todaySignoffByCheck = new Map((todaySignoffs ?? []).map((s) => [s.check_id, s.signed_off]));

  return rooms.map((room) => {
    const check = checkByRoom.get(room.id);
    if (!check) return { room, weekCheckId: null, todaySignedOff: null };
    const signed = todaySignoffByCheck.get(check.id);
    return { room, weekCheckId: check.id, todaySignedOff: signed === undefined ? null : signed };
  });
}

export type HazardCalendarDay = {
  date: string;
  /** False for a day that belongs to the padding week at either end of the
   * calendar (the week containing the 1st, or the week containing the last
   * day of the month) but falls in the adjoining month — shown greyed out
   * rather than left blank, same as a normal calendar grid. */
  inMonth: boolean;
  /** The week's chart this day belongs to, if one has been started yet —
   * null means this whole week has no chart at all (nothing to click into). */
  checkId: string | null;
  /** null when no chart exists yet for this week, or this weekday's sign-off
   * row hasn't been created (only possible outside the range the weekly
   * scaffolding migration covers). */
  signedOff: boolean | null;
};

export type HazardCalendarWeek = {
  weekStartDate: string;
  checkId: string | null;
  days: HazardCalendarDay[];
};

/** One room's hazard-check history laid out as a real calendar — a row per
 * week (Monday–Friday only, matching Beach Kids' weekday-only opening days),
 * each day showing whether that day's chart has been signed off yet, so a
 * long list of past weeks reads at a glance instead of needing to be
 * scrolled through one card at a time. */
export async function getHazardRoomCalendar(roomId: string, monthKey: string): Promise<HazardCalendarWeek[]> {
  const monthStart = `${monthKey}-01`;
  const monthEnd = addMonths(monthStart, 1); // first day of the following month (exclusive)

  const weekStarts: string[] = [];
  let w = mondayOfDateString(monthStart);
  while (w < monthEnd) {
    weekStarts.push(w);
    w = addDays(w, 7);
  }

  const supabase = createClient();
  const { data: checks } = await supabase
    .from("hazard_checks")
    .select("id, week_start_date")
    .eq("room_id", roomId)
    .in("week_start_date", weekStarts);

  const checkByWeek = new Map((checks ?? []).map((c) => [c.week_start_date as string, c]));
  const checkIds = (checks ?? []).map((c) => c.id);

  const { data: signoffs } =
    checkIds.length > 0
      ? await supabase.from("hazard_check_daily_signoffs").select("check_id, check_date, signed_off").in("check_id", checkIds)
      : { data: [] as Array<{ check_id: string; check_date: string; signed_off: boolean }> };

  const signedOffByCheckAndDate = new Map((signoffs ?? []).map((s) => [`${s.check_id}:${s.check_date}`, s.signed_off]));

  return weekStarts.map((weekStartDate) => {
    const check = checkByWeek.get(weekStartDate);
    const days: HazardCalendarDay[] = WEEKDAY_OFFSETS.map((d) => {
      const date = addDays(weekStartDate, d);
      const inMonth = date >= monthStart && date < monthEnd;
      const signedOff = check ? (signedOffByCheckAndDate.get(`${check.id}:${date}`) ?? null) : null;
      return { date, inMonth, checkId: check?.id ?? null, signedOff };
    });
    return { weekStartDate, checkId: check?.id ?? null, days };
  });
}

export async function getHazardRegister(filters?: {
  resolved?: boolean;
  riskLevel?: "low" | "medium" | "high";
}): Promise<HazardRegisterEntry[]> {
  const supabase = createClient();
  let query = supabase.from("hazard_log_entries").select("*").order("created_at", { ascending: false });

  if (filters?.resolved !== undefined) query = query.eq("resolved", filters.resolved);
  if (filters?.riskLevel) query = query.eq("risk_level", filters.riskLevel);

  const { data: logEntries } = await query;
  const rows = (logEntries ?? []) as LogRow[];
  if (rows.length === 0) return [];

  const checkIds = Array.from(new Set(rows.map((r) => r.check_id)));
  const { data: checks } = await supabase.from("hazard_checks").select("id, room_id, week_start_date").in("id", checkIds);
  const checkById = new Map((checks ?? []).map((c) => [c.id, c]));

  const roomIds = Array.from(new Set((checks ?? []).map((c) => c.room_id)));
  const { data: rooms } = await supabase.from("roster_rooms").select("id, name").in("id", roomIds);
  const roomNameById = new Map((rooms ?? []).map((r) => [r.id, r.name]));

  return rows.map((r) => {
    const check = checkById.get(r.check_id);
    return {
      id: r.id,
      check_id: r.check_id,
      hazard_description: r.hazard_description,
      risk_level: r.risk_level,
      resolved: r.resolved,
      resolved_at: r.resolved_at,
      created_at: r.created_at,
      room_id: check?.room_id ?? "",
      room_name: check ? (roomNameById.get(check.room_id) ?? "Unknown room") : "Unknown room",
      week_start_date: check?.week_start_date ?? "",
    };
  });
}

/** Real count for the Records & Compliance overview and dashboard — every
 * hazard log entry not yet marked resolved, regardless of which check it
 * came from. */
export async function getOpenHazardCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("hazard_log_entries")
    .select("id", { count: "exact", head: true })
    .eq("resolved", false);
  return count ?? 0;
}

export async function getHighRiskOpenHazardCount(): Promise<number> {
  const supabase = createClient();
  const { count } = await supabase
    .from("hazard_log_entries")
    .select("id", { count: "exact", head: true })
    .eq("resolved", false)
    .eq("risk_level", "high");
  return count ?? 0;
}

/** How many rooms still haven't had today's column on this week's Hazard
 * Checklist signed off yet (including rooms whose week chart hasn't even
 * been started) — used for the "Checks due today" overview stat. */
export async function getChecksDueTodayCount(): Promise<number> {
  const today = new Date().toISOString().slice(0, 10);
  const weekStart = mondayOf(new Date());
  const statuses = await getThisWeeksHazardCheckStatus(weekStart, today);
  return statuses.filter((s) => !s.todaySignedOff).length;
}

/** Open hazards for the dashboard's Needs Attention list, highest risk
 * first — an unresolved hazard log entry is the only thing from this
 * module that becomes a "job", per how Ethan wants routine tick-box items
 * (which just mean "not checked yet today") kept separate from real
 * flagged hazards. */
export async function getOpenHazardsForDashboard(limit = 10): Promise<HazardRegisterEntry[]> {
  const entries = await getHazardRegister({ resolved: false });
  const riskOrder: Record<"low" | "medium" | "high", number> = { high: 0, medium: 1, low: 2 };
  return entries.sort((a, b) => riskOrder[a.risk_level] - riskOrder[b.risk_level]).slice(0, limit);
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getRosterRooms, getRosterWeekByStartDate } from "@/lib/data/roster";
import { getWeekdayRoomRoll, minStaffRequired } from "@/lib/data/roster-ratios";
import { getCalendarMonth, getStaffLeaveForRange } from "@/lib/data/calendar";
import { getUpcomingFamilyReminders } from "@/lib/data/email";
import { getHazardRegister, getThisWeeksHazardCheckStatus, type RoomWeekStatus } from "@/lib/data/hazard-checks";
import { HOME_ROOM_NAMES } from "@/lib/data/home";
import { EMAIL_REMINDER_TEMPLATE_KEY, HAZARD_RISK_LABEL, STAFF_DOCUMENT_CATEGORY_LABEL, STAFF_LEAVE_TYPE_LABEL } from "@/lib/constants";
import { addDays, formatShortDate, mondayOfDateString, nzTodayDateString, weekdayKeyOfDateString } from "@/lib/utils";
import type { StaffDocumentCategory } from "@/lib/supabase/database.types";

// ---------------------------------------------------------------------------
// Everything the Home dashboard shows, in one place.
//
// Ground rules (same as the rest of Earlydesk):
//   - Every figure comes from real records. Nothing is estimated or filled
//     in; where the information doesn't exist the dashboard says so
//     ("Roster not entered") rather than showing a misleading 0.
//   - "Today" always means today in New Zealand (Pacific/Auckland). The
//     server runs on UTC, so a plain `new Date()` would be "yesterday" for
//     most of a NZ morning — every date here starts from nzTodayDateString.
//   - Nothing here writes or changes any record.
// ---------------------------------------------------------------------------

const NZ_TIME_ZONE = "Pacific/Auckland";
const MS_PER_DAY = 24 * 60 * 60 * 1000;

/** Whole days from `from` to `to` (both "YYYY-MM-DD"); negative if `to` is earlier. */
function daysBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  return Math.round((Date.UTC(ty, tm - 1, td) - Date.UTC(fy, fm - 1, fd)) / MS_PER_DAY);
}

function nzDateOf(timestamp: string): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: NZ_TIME_ZONE }).format(new Date(timestamp));
}

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** "Today", "Tomorrow", "Yesterday", "In 5 days", "3 days ago". */
export function relativeDayLabel(date: string, today: string): string {
  const diff = daysBetween(today, date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return diff > 0 ? `In ${diff} days` : `${Math.abs(diff)} days ago`;
}

// ---------------------------------------------------------------------------
// Header
// ---------------------------------------------------------------------------

export type DashboardHeaderInfo = { greeting: string; dateLabel: string; today: string };

export function getHeaderInfo(fullName: string | null | undefined): DashboardHeaderInfo {
  const now = new Date();
  const hour = Number(
    new Intl.DateTimeFormat("en-NZ", { timeZone: NZ_TIME_ZONE, hour: "numeric", hourCycle: "h23" }).format(now)
  );
  const part = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const rawFirst = fullName?.trim().split(/\s+/)[0] ?? "";
  // A profile with no name yet falls back to the login email — never greet
  // someone as "ethan@…".
  const first = rawFirst && !rawFirst.includes("@") ? rawFirst.charAt(0).toUpperCase() + rawFirst.slice(1) : "";
  return {
    greeting: first ? `${part}, ${first}` : part,
    dateLabel: new Intl.DateTimeFormat("en-NZ", {
      timeZone: NZ_TIME_ZONE,
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(now),
    today: nzTodayDateString(),
  };
}

// ---------------------------------------------------------------------------
// Today + rooms
// ---------------------------------------------------------------------------

export type RoomCoverage =
  | { kind: "closed" }
  | { kind: "no_roster" }
  | { kind: "not_operating" }
  | { kind: "met"; required: number; rostered: number }
  | { kind: "short"; required: number; rostered: number }
  | { kind: "check_ages"; required: number; rostered: number; missingAges: number };

export type DashboardRoom = {
  id: string;
  name: string;
  color: string;
  childrenExpected: number;
  under2: number;
  over2: number;
  unknownAge: number;
  staffNames: string[];
  coverage: RoomCoverage;
};

export type TodayOverview = {
  today: string;
  weekStart: string;
  /** Why the centre isn't operating today, or null on a normal weekday. */
  closedReason: string | null;
  childrenExpected: number | null;
  rosterEntered: boolean;
  staffRosteredToday: number;
  roomsOperating: number;
  roomsTotal: number;
  /** null when no room has a daily hazard checklist set up. */
  dailyChecks: { signedOff: number; total: number } | null;
  rooms: DashboardRoom[];
};

export async function getTodayOverview(): Promise<TodayOverview> {
  const supabase = createClient();
  const today = nzTodayDateString();
  const weekStart = mondayOfDateString(today);
  const weekdayKey = weekdayKeyOfDateString(today);

  const [rooms, week, monthGrid, roll, checkStatuses] = await Promise.all([
    getRosterRooms(),
    getRosterWeekByStartDate(weekStart),
    getCalendarMonth(today.slice(0, 7)),
    weekdayKey
      ? getWeekdayRoomRoll(weekdayKey, new Date(`${today}T12:00:00Z`))
      : Promise.resolve([] as Awaited<ReturnType<typeof getWeekdayRoomRoll>>),
    getThisWeeksHazardCheckStatus(weekStart, today).catch(() => [] as RoomWeekStatus[]),
  ]);

  const holiday = monthGrid
    .flatMap((w) => w.days)
    .find((d) => d.date === today)
    ?.events.find((e) => e.kind === "public_holiday");
  const closedReason = !weekdayKey
    ? "Closed at weekends"
    : holiday && holiday.kind === "public_holiday"
      ? `Public holiday — ${holiday.name}`
      : null;

  // "Entered" means at least one shift exists anywhere in this week. A week
  // with shifts but none today is a genuine 0 for today; a week with none
  // at all hasn't been rostered yet.
  const weekShifts = week?.shifts ?? [];
  const rosterEntered = weekShifts.length > 0;
  const todayShifts = weekShifts.filter((s) => s.shift_date === today);
  const staffIdsToday = Array.from(new Set(todayShifts.map((s) => s.staff_id)));

  const { data: staffRows } =
    staffIdsToday.length > 0
      ? await supabase.from("staff").select("id, full_name").in("id", staffIdsToday)
      : { data: [] as { id: string; full_name: string }[] };
  const staffNameById = new Map((staffRows ?? []).map((s) => [s.id as string, s.full_name as string]));

  const staffByRoom = new Map<string, Set<string>>();
  todayShifts.forEach((s) => {
    if (!s.room_id) return;
    const set = staffByRoom.get(s.room_id) ?? new Set<string>();
    set.add(s.staff_id);
    staffByRoom.set(s.room_id, set);
  });

  const rollByRoomId = new Map(roll.filter((r) => r.room).map((r) => [r.room!.id, r]));

  const homeRooms = rooms
    .filter((r) => HOME_ROOM_NAMES.includes(r.name))
    .sort((a, b) => HOME_ROOM_NAMES.indexOf(a.name) - HOME_ROOM_NAMES.indexOf(b.name));

  const dashboardRooms: DashboardRoom[] = homeRooms.map((room) => {
    const r = rollByRoomId.get(room.id);
    const staffIds = Array.from(staffByRoom.get(room.id) ?? []);
    const staffNames = staffIds.map((id) => staffNameById.get(id) ?? "Unknown staff member").sort();
    const childrenExpected = r?.enrolledTotal ?? 0;
    const unknownAge = r?.enrolledUnknown ?? 0;

    // Same ratio calculation as Roster → Coverage / Room ratios: the day's
    // peak minimum-staff figure across the ratio snapshot times, compared
    // with how many different people are rostered in the room. Children with
    // no date of birth can't be placed in an age group, so the requirement
    // is worked out both ways (counted as over-2 and as under-2); if the
    // answer depends on them, the dashboard says so instead of guessing.
    const snapshots = r?.snapshots ?? [];
    const required = snapshots.reduce((max, s) => Math.max(max, minStaffRequired(s.under2, s.over2 + s.unknown)), 0);
    const requiredIfUnder2 = snapshots.reduce(
      (max, s) => Math.max(max, minStaffRequired(s.under2 + s.unknown, s.over2)),
      0
    );
    const rostered = staffIds.length;

    let coverage: RoomCoverage;
    if (closedReason) coverage = { kind: "closed" };
    else if (!rosterEntered) coverage = { kind: "no_roster" };
    else if (childrenExpected === 0 && rostered === 0) coverage = { kind: "not_operating" };
    else if (rostered >= requiredIfUnder2) coverage = { kind: "met", required: requiredIfUnder2, rostered };
    else if (rostered >= required && unknownAge > 0)
      coverage = { kind: "check_ages", required: requiredIfUnder2, rostered, missingAges: unknownAge };
    else coverage = { kind: "short", required, rostered };

    return {
      id: room.id,
      name: room.name,
      color: room.color,
      childrenExpected,
      under2: r?.enrolledUnder2 ?? 0,
      over2: r?.enrolledOver2 ?? 0,
      unknownAge,
      staffNames,
      coverage,
    };
  });

  const checks = checkStatuses;

  return {
    today,
    weekStart,
    closedReason,
    childrenExpected: closedReason ? null : dashboardRooms.reduce((sum, r) => sum + r.childrenExpected, 0),
    rosterEntered,
    staffRosteredToday: staffIdsToday.length,
    roomsOperating: closedReason
      ? 0
      : dashboardRooms.filter((r) => r.childrenExpected > 0 || r.staffNames.length > 0).length,
    roomsTotal: dashboardRooms.length,
    dailyChecks: checks.length > 0 ? { signedOff: checks.filter((c) => c.todaySignedOff === true).length, total: checks.length } : null,
    rooms: dashboardRooms,
  };
}

// ---------------------------------------------------------------------------
// Needs attention
// ---------------------------------------------------------------------------

export type AttentionUrgency = "high" | "medium" | "low";

export type AttentionItem = {
  id: string;
  category: string;
  title: string;
  /** The room, person or record it's about. */
  context: string | null;
  /** Due date / urgency in words, e.g. "Overdue by 3 days", "Due in 5 days". */
  when: string | null;
  urgency: AttentionUrgency;
  actionLabel: string;
  href: string;
  /** Smaller sorts first within the same urgency. */
  sortKey: number;
};

/** Groups hazard notes that are really the same observation: same weekly
 * check (room + week) and the same wording once case, punctuation, filler
 * words and bracketed asides are ignored. e.g. "Reminder of rip on sail
 * over blue box" and "Reminder of rip in sail over blue box (shade
 * structure)" become one item. The underlying notes are untouched. */
function hazardGroupKey(checkId: string, description: string): string {
  const normalised = description
    .toLowerCase()
    .replace(/\([^)]*\)/g, " ")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w && !["a", "an", "the", "of", "on", "in", "at", "to", "reminder", "re"].includes(w))
    .join(" ");
  return `${checkId}|${normalised}`;
}

/** Hazard notes older than this are summarised into one line pointing at
 * the register, so months-old notes don't permanently crowd the dashboard. */
const HAZARD_RECENT_DAYS = 28;

function dueWords(days: number): { when: string; urgency: AttentionUrgency } {
  if (days < 0) return { when: `Overdue by ${plural(Math.abs(days), "day", "days")}`, urgency: "high" };
  if (days === 0) return { when: "Due today", urgency: "high" };
  if (days <= 7) return { when: `Due in ${plural(days, "day", "days")}`, urgency: "medium" };
  return { when: `Due in ${plural(days, "day", "days")}`, urgency: "low" };
}

export async function getAttentionItems(overview: TodayOverview): Promise<AttentionItem[]> {
  const supabase = createClient();
  const today = overview.today;
  const items: AttentionItem[] = [];

  // --- Roster -------------------------------------------------------------
  // On a weekend the useful question is next week's roster.
  const rosterWeek = overview.closedReason === "Closed at weekends" ? addDays(overview.weekStart, 7) : overview.weekStart;
  const rosterWeekEntered =
    rosterWeek === overview.weekStart
      ? overview.rosterEntered
      : Boolean((await getRosterWeekByStartDate(rosterWeek))?.shifts.length);
  if (!rosterWeekEntered) {
    items.push({
      id: `roster-${rosterWeek}`,
      category: "Roster",
      title: rosterWeek === overview.weekStart ? "This week's roster hasn't been entered" : "Next week's roster hasn't been entered",
      context: `Week of ${formatShortDate(rosterWeek)}`,
      when: rosterWeek === overview.weekStart ? "This week" : `Starts ${formatShortDate(rosterWeek)}`,
      urgency: rosterWeek === overview.weekStart ? "high" : "medium",
      actionLabel: "Complete roster",
      href: `/roster?week=${rosterWeek}`,
      sortKey: 0,
    });
  }

  // --- Coverage gaps today (only when the roster exists) --------------------
  overview.rooms.forEach((room) => {
    if (room.coverage.kind === "short") {
      const missing = room.coverage.required - room.coverage.rostered;
      items.push({
        id: `coverage-${room.id}`,
        category: "Coverage",
        title: `${room.name} needs ${plural(missing, "more staff member", "more staff")} today`,
        context: `${room.coverage.rostered} rostered · ${room.coverage.required} needed at the busiest time`,
        when: "Today",
        urgency: "high",
        actionLabel: "Review coverage",
        href: `/roster/coverage?week=${overview.weekStart}`,
        sortKey: 1,
      });
    } else if (room.coverage.kind === "check_ages") {
      items.push({
        id: `ages-${room.id}`,
        category: "Coverage",
        title: `Can't confirm ${room.name}'s ratio today`,
        context: `${plural(room.coverage.missingAges, "child has", "children have")} no date of birth on file`,
        when: "Today",
        urgency: "medium",
        actionLabel: "Review ratios",
        href: "/roster/ratios",
        sortKey: 2,
      });
    }
  });

  const [
    { data: actions },
    { data: criteria },
    { data: assessments },
    { data: evidence },
    { data: activeStaff },
    { data: staffDocs },
    { data: staffQuals },
    drillResult,
    openHazards,
  ] = await Promise.all([
    supabase.from("actions").select("id, description, due_date, status, criterion_id").neq("status", "completed"),
    supabase.from("ero_criteria").select("id, code, title"),
    supabase.from("criterion_assessments").select("criterion_id, compliance_status, evidence_status"),
    supabase.from("evidence").select("id, title, review_date, expiry_date"),
    supabase.from("staff").select("id, full_name").eq("status", "active"),
    supabase.from("staff_documents").select("id, staff_id, category, expiry_date").not("expiry_date", "is", null),
    supabase.from("staff_qualifications").select("staff_id, next_review_date").not("next_review_date", "is", null),
    supabase.from("emergency_drills").select("drill_date, next_due_date").order("drill_date", { ascending: false }).limit(1),
    getHazardRegister({ resolved: false }),
  ]);

  const criterionById = new Map((criteria ?? []).map((c) => [c.id as string, c]));
  const staffById = new Map((activeStaff ?? []).map((s) => [s.id as string, s.full_name as string]));

  // --- Tasks (ERO actions) --------------------------------------------------
  (actions ?? []).forEach((a) => {
    const criterion = a.criterion_id ? criterionById.get(a.criterion_id as string) : undefined;
    if (!a.due_date) return;
    const days = daysBetween(today, a.due_date as string);
    if (days > 14) return;
    const { when, urgency } = dueWords(days);
    items.push({
      id: `action-${a.id}`,
      category: "Task",
      title: a.description as string,
      context: criterion ? `ERO criterion ${criterion.code}` : null,
      when,
      urgency,
      actionLabel: "Open task",
      href: criterion ? `/checklist/${criterion.code}` : "/actions",
      sortKey: 10 + days,
    });
  });

  // --- Hazards ---------------------------------------------------------------
  type HazardGroup = {
    key: string;
    checkId: string;
    room: string;
    description: string;
    risk: "low" | "medium" | "high";
    count: number;
    weekStart: string;
    firstLogged: string;
  };
  const groups = new Map<string, HazardGroup>();
  const riskRank = { high: 0, medium: 1, low: 2 } as const;
  openHazards.forEach((h) => {
    const key = hazardGroupKey(h.check_id, h.hazard_description);
    const loggedOn = nzDateOf(h.created_at);
    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      if (riskRank[h.risk_level] < riskRank[existing.risk]) existing.risk = h.risk_level;
      if (loggedOn < existing.firstLogged) existing.firstLogged = loggedOn;
    } else {
      groups.set(key, {
        key,
        checkId: h.check_id,
        room: h.room_name,
        description: h.hazard_description.trim(),
        risk: h.risk_level,
        count: 1,
        weekStart: h.week_start_date,
        firstLogged: loggedOn,
      });
    }
  });

  const recentGroups: HazardGroup[] = [];
  const olderGroups: HazardGroup[] = [];
  groups.forEach((g) => {
    const ageDays = daysBetween(g.weekStart || g.firstLogged, today);
    (ageDays <= HAZARD_RECENT_DAYS ? recentGroups : olderGroups).push(g);
  });

  recentGroups.forEach((g) => {
    items.push({
      id: `hazard-${g.key}`,
      category: "Hazard",
      title: g.description,
      context: `${g.room} · ${HAZARD_RISK_LABEL[g.risk]} risk${g.count > 1 ? ` · noted ${g.count} times` : ""}`,
      when: `Week of ${formatShortDate(g.weekStart)}`,
      urgency: g.risk === "high" ? "high" : "medium",
      actionLabel: "Review hazard",
      href: `/records/hazards/${g.checkId}`,
      sortKey: 5 + riskRank[g.risk],
    });
  });

  if (olderGroups.length > 0) {
    const notes = olderGroups.reduce((sum, g) => sum + g.count, 0);
    const rooms = Array.from(new Set(olderGroups.map((g) => g.room))).sort();
    const earliest = olderGroups.map((g) => g.weekStart || g.firstLogged).sort()[0];
    items.push({
      id: "hazard-older",
      category: "Hazard",
      title: `${plural(olderGroups.length, "older hazard is", "older hazards are")} still marked open`,
      context: `${rooms.join(", ")} · ${plural(notes, "note", "notes")} since ${formatShortDate(earliest)}${
        olderGroups.length < notes ? " (repeat notes grouped)" : ""
      }`,
      when: `Open since ${formatShortDate(earliest)}`,
      urgency: "low",
      actionLabel: "Review hazard register",
      href: "/records/hazards/register",
      sortKey: 40,
    });
  }

  // --- Documents due -----------------------------------------------------------
  (evidence ?? []).forEach((e) => {
    const dates = [e.review_date, e.expiry_date].filter((d): d is string => Boolean(d));
    if (dates.length === 0) return;
    const soonest = dates.map((d) => daysBetween(today, d)).sort((a, b) => a - b)[0];
    if (soonest > 30) return;
    const { when, urgency } = dueWords(soonest);
    items.push({
      id: `evidence-${e.id}`,
      category: "Document",
      title: e.title as string,
      context: "Evidence library",
      when: soonest < 0 ? when.replace("Overdue", "Review overdue") : when.replace("Due", "Review due"),
      urgency,
      actionLabel: "Review document",
      href: "/evidence",
      sortKey: 20 + soonest,
    });
  });

  (staffDocs ?? []).forEach((d) => {
    const name = staffById.get(d.staff_id as string);
    if (!name || !d.expiry_date) return; // former staff don't clutter Home
    const days = daysBetween(today, d.expiry_date as string);
    if (days > 30) return;
    const { urgency } = dueWords(days);
    items.push({
      id: `staffdoc-${d.id}`,
      category: "Staff",
      title: `${STAFF_DOCUMENT_CATEGORY_LABEL[d.category as StaffDocumentCategory]} ${days < 0 ? "has expired" : "expires soon"}`,
      context: name,
      when: days < 0 ? `Expired ${plural(Math.abs(days), "day", "days")} ago` : days === 0 ? "Expires today" : `Expires in ${plural(days, "day", "days")}`,
      urgency,
      actionLabel: "Review document",
      href: `/staff/${d.staff_id}`,
      sortKey: 20 + days,
    });
  });

  (staffQuals ?? []).forEach((q) => {
    const name = staffById.get(q.staff_id as string);
    if (!name || !q.next_review_date) return;
    const days = daysBetween(today, q.next_review_date as string);
    if (days > 30) return;
    const { when, urgency } = dueWords(days);
    items.push({
      id: `qual-${q.staff_id}`,
      category: "Staff",
      title: "Qualification review due",
      context: name,
      when,
      urgency,
      actionLabel: "Review qualification",
      href: `/staff/${q.staff_id}`,
      sortKey: 25 + days,
    });
  });

  // --- Emergency drills ---------------------------------------------------------
  // Only when the drills table is actually there: if it isn't (its migration
  // hasn't been run), "no drill logged yet" would be a false alarm.
  if (!drillResult.error) {
    const last = (drillResult.data ?? [])[0] as { drill_date: string; next_due_date: string | null } | undefined;
    const dueDays = last?.next_due_date ? daysBetween(today, last.next_due_date) : null;
    if (!last || (dueDays !== null && dueDays <= 30)) {
      const words = dueDays !== null ? dueWords(dueDays) : { when: "None logged yet", urgency: "medium" as AttentionUrgency };
      items.push({
        id: "drill",
        category: "Drill",
        title: "Emergency drill due",
        context: last ? `Last drill ${formatShortDate(last.drill_date)}` : "No drill has been logged yet",
        when: words.when,
        urgency: words.urgency,
        actionLabel: "Log drill",
        href: "/emergency-drills",
        sortKey: 30 + (dueDays ?? 0),
      });
    }
  }

  // --- ERO checklist (standing items, shown last) -----------------------------
  (assessments ?? []).forEach((a) => {
    const criterion = criterionById.get(a.criterion_id as string);
    if (!criterion) return;
    const status = a.compliance_status as string;
    const evidenceStatus = a.evidence_status as string;
    const evidenceMissing = evidenceStatus === "missing" && status !== "not_assessed" && status !== "na";
    if (status === "no" || status === "unsure") {
      // One row per criterion — missing evidence is mentioned alongside
      // rather than listed again as a second item.
      items.push({
        id: `criterion-${criterion.id}-${status}`,
        category: "ERO checklist",
        title: `${criterion.code} — ${criterion.title}`,
        context: `${status === "no" ? "Marked not compliant" : "Marked unsure"}${evidenceMissing ? " · evidence missing" : ""}`,
        when: null,
        urgency: status === "no" ? "medium" : "low",
        actionLabel: "Review criterion",
        href: `/checklist/${criterion.code}`,
        sortKey: 50,
      });
    } else if (evidenceMissing) {
      items.push({
        id: `criterion-${criterion.id}-evidence`,
        category: "ERO checklist",
        title: `${criterion.code} — ${criterion.title}`,
        context: "Evidence still missing",
        when: null,
        urgency: "low",
        actionLabel: "Add evidence",
        href: `/checklist/${criterion.code}`,
        sortKey: 55,
      });
    }
  });

  const urgencyRank: Record<AttentionUrgency, number> = { high: 0, medium: 1, low: 2 };
  return items.sort((a, b) => urgencyRank[a.urgency] - urgencyRank[b.urgency] || a.sortKey - b.sortKey);
}

// ---------------------------------------------------------------------------
// Coming up
// ---------------------------------------------------------------------------

export type ComingUpKind = "child_birthday" | "starting" | "leaving" | "staff_birthday" | "staff_leave" | "public_holiday";

export type ComingUpItem = {
  key: string;
  date: string;
  /** Last day for a multi-day leave block, else null. */
  endDate: string | null;
  kind: ComingUpKind;
  title: string;
  detail: string | null;
  action: { label: string; href: string } | null;
};

const COMING_UP_DAYS = 14;

export async function getComingUp(today: string): Promise<ComingUpItem[]> {
  const end = addDays(today, COMING_UP_DAYS);
  const monthKeys = Array.from(new Set([today.slice(0, 7), end.slice(0, 7)]));

  const [months, leave, reminders] = await Promise.all([
    Promise.all(monthKeys.map((m) => getCalendarMonth(m))),
    getStaffLeaveForRange(today, addDays(end, 1)),
    // Guarded like the sidebar badge: this depends on the email migration,
    // and Home must never fail just because that isn't in place.
    getUpcomingFamilyReminders(COMING_UP_DAYS).catch(() => []),
  ]);

  const items: ComingUpItem[] = [];
  const seenDays = new Set<string>();

  months
    .flat()
    .flatMap((w) => w.days)
    .filter((d) => d.date >= today && d.date <= end)
    .forEach((day) => {
      if (seenDays.has(day.date)) return; // the same day can appear in two months' padding weeks
      seenDays.add(day.date);
      day.events.forEach((e) => {
        if (e.kind === "public_holiday") {
          items.push({ key: `hol-${day.date}`, date: day.date, endDate: null, kind: "public_holiday", title: e.name, detail: null, action: null });
        } else if (e.kind === "staff_birthday") {
          items.push({
            key: `sbd-${e.staffId}-${day.date}`,
            date: day.date,
            endDate: null,
            kind: "staff_birthday",
            title: `${e.name}'s birthday`,
            detail: null,
            action: null,
          });
        }
        // Child birthdays come from the family reminders below (with their
        // email status); staff leave comes from the leave list (one row per
        // block, not one per day).
      });
    });

  reminders.forEach((r) => {
    const composeHref =
      r.alreadyHandled === "draft" && r.draftEmailId
        ? `/email/compose?draftId=${r.draftEmailId}`
        : `/email/compose?template=${EMAIL_REMINDER_TEMPLATE_KEY[r.kind]}&childId=${r.childId}&reminderKind=${r.kind}&reminderDate=${r.date}`;
    const emailState = r.alreadyHandled === "sent" ? "Email sent" : r.alreadyHandled === "draft" ? "Email drafted" : null;
    const detailParts = [
      r.kind === "birthday" && r.turningAge !== null ? `Turning ${r.turningAge}` : null,
      r.roomName,
      emailState,
    ].filter(Boolean);
    items.push({
      key: `${r.kind}-${r.childId}-${r.date}`,
      date: r.date,
      endDate: null,
      kind: r.kind === "birthday" ? "child_birthday" : r.kind === "welcome" ? "starting" : "leaving",
      title: r.kind === "birthday" ? `${r.childName}'s birthday` : r.kind === "welcome" ? `${r.childName} starts` : `${r.childName}'s last day`,
      detail: detailParts.length > 0 ? detailParts.join(" · ") : null,
      action:
        r.alreadyHandled === "sent"
          ? null
          : { label: r.alreadyHandled === "draft" ? "Continue email" : "Prepare email", href: composeHref },
    });
  });

  leave
    .filter((l) => l.status === "requested" || l.status === "approved")
    .forEach((l) => {
      items.push({
        key: `leave-${l.id}`,
        date: l.start_date < today ? today : l.start_date,
        endDate: l.end_date !== l.start_date ? l.end_date : null,
        kind: "staff_leave",
        title: l.staff_name,
        detail: [
          ["annual", "sick", "unpaid", "other"].includes(l.leave_type)
            ? `${STAFF_LEAVE_TYPE_LABEL[l.leave_type]} leave`
            : STAFF_LEAVE_TYPE_LABEL[l.leave_type],
          l.status === "requested" ? "Awaiting approval" : null,
        ]
          .filter(Boolean)
          .join(" · "),
        action: l.status === "requested" ? { label: "Review leave", href: "/roster/leave" } : null,
      });
    });

  const kindOrder: Record<ComingUpKind, number> = {
    public_holiday: 0,
    staff_leave: 1,
    starting: 2,
    leaving: 3,
    child_birthday: 4,
    staff_birthday: 5,
  };
  return items.sort((a, b) => a.date.localeCompare(b.date) || kindOrder[a.kind] - kindOrder[b.kind]);
}

// ---------------------------------------------------------------------------
// Recent activity
// ---------------------------------------------------------------------------

export type ActivityEntry = {
  id: string;
  text: string;
  context: { label: string; href: string } | null;
  at: string;
};

const COMPLIANCE_WORDS: Record<string, string> = {
  yes: "Marked as compliant",
  no: "Marked as not compliant",
  unsure: "Marked as unsure",
  na: "Marked as not applicable",
  not_assessed: "Assessment cleared",
};

const EVIDENCE_WORDS: Record<string, string> = {
  ready: "Evidence marked as ready",
  partial: "Evidence marked as partly complete",
  missing: "Evidence marked as missing",
  not_required: "Evidence marked as not required",
};

/** Turns the audit log's stored wording (which includes raw database values
 * like "not_required") into plain descriptions. Unknown event types fall
 * back to the stored description. */
function readableActivity(eventType: string, description: string): string {
  const quoted = description.match(/"([^"]*)"/)?.[1] ?? "";
  switch (eventType) {
    case "compliance_status_changed":
      return COMPLIANCE_WORDS[quoted] ?? description;
    case "evidence_status_changed":
      return EVIDENCE_WORDS[quoted] ?? description;
    case "evidence_uploaded":
      return quoted ? `Evidence uploaded: ${quoted}` : "Evidence uploaded";
    case "flagged":
      return description.replace(/^Flagged:\s*/i, "Flagged for follow-up: ");
    case "unflagged":
      return "Follow-up flag cleared";
    case "action_completed":
      return "Task marked complete";
    case "action_created":
      return quoted ? `Task created: ${quoted}` : "Task created";
    case "reviewed":
      return "Review details updated";
    default:
      return description;
  }
}

export async function getActivityEntries(limit = 6): Promise<ActivityEntry[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("activity_log")
    .select("id, event_type, description, created_at, criterion_id")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error || !data) return [];

  const criterionIds = Array.from(new Set(data.map((r) => r.criterion_id).filter(Boolean))) as string[];
  const { data: criteria } =
    criterionIds.length > 0
      ? await supabase.from("ero_criteria").select("id, code").in("id", criterionIds)
      : { data: [] as { id: string; code: string }[] };
  const codeById = new Map((criteria ?? []).map((c) => [c.id as string, c.code as string]));

  return data.map((r) => {
    const code = r.criterion_id ? codeById.get(r.criterion_id as string) : undefined;
    return {
      id: r.id as string,
      text: readableActivity(r.event_type as string, (r.description as string) ?? ""),
      context: code ? { label: `ERO ${code}`, href: `/checklist/${code}` } : null,
      at: r.created_at as string,
    };
  });
}

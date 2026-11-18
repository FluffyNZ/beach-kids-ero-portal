import { getCurrentAge } from "@/lib/age";
import { formatDate, formatShortDate } from "@/lib/utils";
import type { ChildEnrolledSchedule } from "@/lib/types";

// Display helpers shared by the Children directory and child profiles.
// Pure functions only (no data access), so they're safe on the server and
// in the browser.

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** "3 years 4 months", "11 months", "2 years" — or the compact form
 * "3 yrs 4 mths" for cards and tables. */
export function formatAgeParts(totalMonths: number, style: "long" | "short" = "long"): string {
  const years = Math.floor(totalMonths / 12);
  const months = totalMonths % 12;
  const y = style === "long" ? plural(years, "year", "years") : `${years} ${years === 1 ? "yr" : "yrs"}`;
  const m = style === "long" ? plural(months, "month", "months") : `${months} ${months === 1 ? "mth" : "mths"}`;
  if (years === 0) return m;
  if (months === 0) return y;
  return `${y} ${m}`;
}

/** Whole calendar months from one "YYYY-MM-DD" date to another. */
function monthsBetween(from: string, to: string): number {
  const [fy, fm, fd] = from.split("-").map(Number);
  const [ty, tm, td] = to.split("-").map(Number);
  let months = (ty - fy) * 12 + (tm - fm);
  if (td < fd) months -= 1;
  return Math.max(0, months);
}

export type ChildAgeInfo = {
  /** e.g. "3 years 4 months", "About 3 years 4 months", "Age not recorded". */
  text: string;
  /** Compact form for cards/tables. */
  short: string;
  /** True when worked out from an entered age rather than a date of birth. */
  estimated: boolean;
  /** A line explaining where the age comes from, or null when obvious. */
  detail: string | null;
  totalMonths: number | null;
};

/** A child's age for display. With a date of birth it's exact (worked out
 * for NZ "today"). Without one, the older entered age (years/months as at
 * `age_as_of`) is projected forward to today — the same projection the
 * ratio checks use — and clearly labelled as an estimate. */
export function childAgeInfo(
  child: {
    date_of_birth: string | null;
    age_years: number | null;
    age_months: number | null;
    age_as_of: string | null;
    age_is_exact: boolean;
  },
  today: string
): ChildAgeInfo {
  if (child.date_of_birth) {
    const exact = getCurrentAge(child.date_of_birth, new Date(`${today}T12:00:00Z`));
    if (exact) {
      return {
        text: formatAgeParts(exact.totalMonths, "long"),
        short: formatAgeParts(exact.totalMonths, "short"),
        estimated: false,
        detail: null,
        totalMonths: exact.totalMonths,
      };
    }
  }
  if (child.age_years === null && child.age_months === null) {
    return { text: "Age not recorded", short: "Age not recorded", estimated: false, detail: null, totalMonths: null };
  }
  const entered = (child.age_years ?? 0) * 12 + (child.age_months ?? 0);
  const elapsed = child.age_as_of ? monthsBetween(child.age_as_of, today) : 0;
  const total = entered + elapsed;
  const enteredText = formatAgeParts(entered, "short");
  return {
    text: `About ${formatAgeParts(total, "long")}`,
    short: `~${formatAgeParts(total, "short")}`,
    estimated: true,
    detail: child.age_as_of
      ? `Estimated — no date of birth recorded. Worked out from ${enteredText} entered on ${formatDate(child.age_as_of)}.`
      : `Estimated — no date of birth recorded. Entered as ${enteredText}.`,
    totalMonths: total,
  };
}

export type EnrolmentTone = "ready" | "attention" | "neutral";
export type EnrolmentStatus = { label: string; tone: EnrolmentTone };

/** "Enrolled", "Starts 5 Jan", "Leaving 12 Dec" or "No longer attending" —
 * from the child's status and their start/leaving dates. Nothing here
 * changes the status; the dates are informational only. */
export function enrolmentStatus(
  child: { status: "active" | "left"; start_date: string | null; leaving_date: string | null },
  today: string
): EnrolmentStatus {
  if (child.status === "left") return { label: "No longer attending", tone: "neutral" };
  if (child.start_date && child.start_date > today) return { label: `Starts ${formatShortDate(child.start_date)}`, tone: "neutral" };
  if (child.leaving_date && child.leaving_date >= today)
    return { label: `Leaving ${formatShortDate(child.leaving_date)}`, tone: "attention" };
  return { label: "Enrolled", tone: "ready" };
}

export const WEEKDAYS = [
  { key: "mon", short: "Mon", long: "Monday" },
  { key: "tue", short: "Tue", long: "Tuesday" },
  { key: "wed", short: "Wed", long: "Wednesday" },
  { key: "thu", short: "Thu", long: "Thursday" },
  { key: "fri", short: "Fri", long: "Friday" },
] as const;

export function hoursBetween(start: string | null, end: string | null): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes / 60 : 0;
}

export type ScheduleDay = { key: string; short: string; long: string; start: string | null; end: string | null; hours: number };

/** Monday–Friday view of a booked-sessions schedule, plus the weekly total —
 * the same hours sum the Bookings editor shows. */
export function scheduleSummary(schedule: ChildEnrolledSchedule | null): {
  days: ScheduleDay[];
  totalHours: number;
  bookedDays: number;
} {
  const days = WEEKDAYS.map((d) => {
    const start = (schedule?.[`${d.key}_start` as keyof ChildEnrolledSchedule] as string | null) ?? null;
    const end = (schedule?.[`${d.key}_end` as keyof ChildEnrolledSchedule] as string | null) ?? null;
    return { ...d, start, end, hours: hoursBetween(start, end) };
  });
  return {
    days,
    totalHours: days.reduce((s, d) => s + d.hours, 0),
    bookedDays: days.filter((d) => d.hours > 0).length,
  };
}

export function formatHours(hours: number): string {
  return `${Number.isInteger(hours) ? hours : hours.toFixed(1)} ${hours === 1 ? "hr" : "hrs"}`;
}

const NZ = "Pacific/Auckland";

/** A timestamp (e.g. when an email was sent) in NZ time: "12 Nov 2026, 3:05 pm". */
export function formatNzDateTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NZ", {
    timeZone: NZ,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(d);
}

/** The NZ calendar date of a timestamp: "12 Nov 2026". */
export function formatNzDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NZ", { timeZone: NZ, day: "numeric", month: "short", year: "numeric" }).format(d);
}

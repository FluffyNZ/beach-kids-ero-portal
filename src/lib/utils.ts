export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NZ", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return "—";
  return new Intl.NumberFormat("en-NZ", { style: "currency", currency: "NZD" }).format(value);
}

export function formatFileSize(bytes: number | null | undefined): string {
  if (!bytes || bytes <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let value = bytes;
  let unitIndex = 0;
  while (value >= 1024 && unitIndex < units.length - 1) {
    value /= 1024;
    unitIndex += 1;
  }
  return `${value.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
}

/** Days until `value` (negative if in the past). Null if no date set. */
export function daysUntil(value: string | null | undefined): number | null {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((target.getTime() - today.getTime()) / msPerDay);
}

/** Adds `months` to a plain "YYYY-MM-DD" date string, using UTC arithmetic
 * throughout so the result never shifts by a day due to server timezone. */
export function addMonths(dateStr: string, months: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + months, day));
  return d.toISOString().slice(0, 10);
}

export function isOverdue(dueDate: string | null | undefined): boolean {
  const days = daysUntil(dueDate);
  return days !== null && days < 0;
}

export function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 100);
}

/** The Monday (as "YYYY-MM-DD") of the week containing `date`. */
export function mondayOf(date: Date): string {
  const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = utc.getUTCDay(); // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

/** Adds `days` to a plain "YYYY-MM-DD" date string, using UTC arithmetic so
 * the result never shifts by a day due to server/browser timezone. */
export function addDays(dateStr: string, days: number): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day + days));
  return d.toISOString().slice(0, 10);
}

/** The Monday (as "YYYY-MM-DD") of the week containing a plain "YYYY-MM-DD"
 * date string — the same week-math as `mondayOf`, but string-in/string-out
 * and UTC-safe throughout, so a date read off a photo (e.g. by the hazard
 * check photo import) never shifts by a day due to server timezone. */
export function mondayOfDateString(dateStr: string): string {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const weekday = utc.getUTCDay(); // 0 = Sunday
  const diff = weekday === 0 ? -6 : 1 - weekday;
  utc.setUTCDate(utc.getUTCDate() + diff);
  return utc.toISOString().slice(0, 10);
}

/** The `child_enrolled_schedule` weekday key ("mon".."fri") for a plain
 * "YYYY-MM-DD" date string, UTC-safe like `addDays`/`mondayOfDateString` —
 * or `null` for a Saturday/Sunday, since the centre (and that schedule
 * table) only has columns for weekdays. Used by the Sunblock checklist to
 * turn "which day is this" into "which of a child's five schedule columns
 * do we read". */
export function weekdayKeyOfDateString(dateStr: string): "mon" | "tue" | "wed" | "thu" | "fri" | null {
  const [year, month, day] = dateStr.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  const keys = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"] as const;
  const key = keys[utc.getUTCDay()];
  return key === "sun" || key === "sat" ? null : key;
}

/** A full date label for things like the dashboard greeting, e.g.
 * "Monday, 24 August 2026". Takes a real `Date` (not a plain date string)
 * since it's only ever used with "now". */
export function formatLongDate(date: Date): string {
  return new Intl.DateTimeFormat("en-NZ", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(date);
}

export function formatShortDate(dateStr: string | null | undefined): string {
  if (!dateStr) return "—";
  const [year, month, day] = dateStr.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(d.getTime())) return "—";
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" }).format(d);
}

/** Formats a Postgres "HH:MM:SS" (or "HH:MM") time string as a compact
 * "8.30am" style label. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "";
  const [hStr, mStr] = value.split(":");
  const h = Number(hStr);
  const m = Number(mStr ?? "0");
  if (Number.isNaN(h) || Number.isNaN(m)) return value;
  const period = h >= 12 ? "pm" : "am";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return m === 0 ? `${h12}${period}` : `${h12}.${String(m).padStart(2, "0")}${period}`;
}

/** A short client-side-only id for things like content-editor blocks that
 * need a stable React key before they're ever saved — not used for
 * anything persisted as a real database id. */
export function randomId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function initials(name: string | null | undefined): string {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** "Today" as a plain "YYYY-MM-DD" string in NZ local time, regardless of
 * what timezone the server process itself is running in (Vercel's
 * serverless functions run in UTC, which is up to 13 hours behind NZ — a
 * plain `new Date().toISOString()` can land on the wrong day late in the NZ
 * evening). Used anywhere "today" needs to match what a Beach Kids parent
 * or staff member in Waihi would call today — the Email reminders in
 * particular (see src/lib/data/email.ts), which the brief specifically
 * calls out as needing Pacific/Auckland dates. */
export function nzTodayDateString(): string {
  // en-CA happens to format as YYYY-MM-DD, which saves reassembling the
  // parts by hand.
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Pacific/Auckland" }).format(new Date());
}

/** "1st" / "2nd" / "3rd" / "4th" etc — used for "turning {{turning_age}}"
 * in the birthday email template. */
export function ordinal(n: number): string {
  const rem100 = n % 100;
  if (rem100 >= 11 && rem100 <= 13) return `${n}th`;
  switch (n % 10) {
    case 1:
      return `${n}st`;
    case 2:
      return `${n}nd`;
    case 3:
      return `${n}rd`;
    default:
      return `${n}th`;
  }
}

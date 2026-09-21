// New Zealand public holidays for the Auckland region, computed from the
// Holidays Act 2003 rules (sections 44–44C) rather than stored anywhere —
// there's nothing to seed, re-seed each year, or drift out of date.
//
// Verified against Employment New Zealand's official guidance
// (employment.govt.nz/leave-and-holidays/public-holidays) before being
// written, since getting these dates wrong has real pay/entitlement
// consequences under NZ law. This gives the generally-observed date for
// each holiday (the one used for centre closures and staff notices) — it
// does not attempt the individual per-employee "would this person have
// worked that weekend day anyway" exception the Act allows for, which only
// matters for calculating one specific person's entitlement, not for a
// shared centre calendar.
//
// Matariki has no fixed formula — each date is set year by year against
// the Māori lunar calendar and gazetted by the government (MBIE/Matariki
// Advisory Group). Only officially gazetted dates are listed below; a year
// outside this table simply shows no Matariki entry rather than a guess.

export type NzPublicHoliday = {
  date: string; // YYYY-MM-DD
  name: string;
};

const MATARIKI_DATES: Record<number, string> = {
  2022: "2022-06-24",
  2023: "2023-07-14",
  2024: "2024-06-28",
  2025: "2025-06-20",
  2026: "2026-07-10",
  2027: "2027-06-25",
  2028: "2028-07-14",
  2029: "2029-07-06",
  2030: "2030-06-21",
};

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month)}-${pad(day)}`;
}

function dayOfWeek(year: number, month: number, day: number): number {
  // 0 = Sunday .. 6 = Saturday, matching Date#getUTCDay().
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function addDaysIso(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** New Year's Day, Day after New Year's Day, Christmas Day and Boxing Day
 * all Mondayise the same way: a Saturday date shifts 2 days to the
 * following Monday, and a Sunday date shifts 2 days to the following
 * Tuesday. A weekday date never shifts. */
function mondayisePair(year: number, month: number, day: number): string {
  const iso = toIso(year, month, day);
  const dow = dayOfWeek(year, month, day);
  if (dow === 6 || dow === 0) return addDaysIso(iso, 2);
  return iso;
}

/** Waitangi Day and ANZAC Day Mondayise onto the very next Monday: a
 * Saturday date shifts 2 days, a Sunday date shifts 1 day. A weekday date
 * never shifts. */
function mondayiseToNextMonday(year: number, month: number, day: number): string {
  const iso = toIso(year, month, day);
  const dow = dayOfWeek(year, month, day);
  if (dow === 6) return addDaysIso(iso, 2);
  if (dow === 0) return addDaysIso(iso, 1);
  return iso;
}

/** Auckland Anniversary Day — the Monday nearest 29 January. */
function aucklandAnniversaryDay(year: number): string {
  const dow = dayOfWeek(year, 1, 29);
  const forward = (1 - dow + 7) % 7; // days to the next Monday (0 if already Monday)
  const backward = forward - 7; // days to the previous Monday (negative, or 0)
  const offset = Math.abs(forward) <= Math.abs(backward) ? forward : backward;
  return addDaysIso(toIso(year, 1, 29), offset);
}

/** Meeus/Jones/Butcher algorithm for the Gregorian Easter Sunday date. */
function easterSunday(year: number): string {
  const a = year % 19;
  const b = Math.floor(year / 100);
  const c = year % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const month = Math.floor((h + l - 7 * m + 114) / 31);
  const day = ((h + l - 7 * m + 114) % 31) + 1;
  return toIso(year, month, day);
}

/** The Nth weekday-of-week (1 = Monday .. 7 = Sunday) in a given month,
 * e.g. nthWeekday(2026, 6, 1, 1) = the 1st Monday of June 2026. */
function nthWeekdayOfMonth(year: number, month: number, isoWeekday: number, n: number): string {
  const targetDow = isoWeekday % 7; // Date#getUTCDay() has Sunday=0
  let day = 1;
  const firstDow = dayOfWeek(year, month, 1);
  const offsetToFirst = (targetDow - firstDow + 7) % 7;
  day = 1 + offsetToFirst + (n - 1) * 7;
  return toIso(year, month, day);
}

/** All NZ public holidays observed in the Auckland region for a given
 * calendar year, sorted by date. */
export function getNzPublicHolidays(year: number): NzPublicHoliday[] {
  const easter = easterSunday(year);
  const goodFriday = addDaysIso(easter, -2);
  const easterMonday = addDaysIso(easter, 1);

  const holidays: NzPublicHoliday[] = [
    { date: mondayisePair(year, 1, 1), name: "New Year's Day" },
    { date: mondayisePair(year, 1, 2), name: "Day after New Year's Day" },
    { date: aucklandAnniversaryDay(year), name: "Auckland Anniversary Day" },
    { date: mondayiseToNextMonday(year, 2, 6), name: "Waitangi Day" },
    { date: goodFriday, name: "Good Friday" },
    { date: easterMonday, name: "Easter Monday" },
    { date: mondayiseToNextMonday(year, 4, 25), name: "ANZAC Day" },
    { date: nthWeekdayOfMonth(year, 6, 1, 1), name: "King's Birthday" },
    { date: nthWeekdayOfMonth(year, 10, 1, 4), name: "Labour Day" },
    { date: mondayisePair(year, 12, 25), name: "Christmas Day" },
    { date: mondayisePair(year, 12, 26), name: "Boxing Day" },
  ];

  const matariki = MATARIKI_DATES[year];
  if (matariki) holidays.push({ date: matariki, name: "Matariki" });

  return holidays.sort((a, b) => a.date.localeCompare(b.date));
}

/** Public holidays falling within [startDate, endDate) — endDate exclusive,
 * matching the month-range convention used elsewhere in this app. Spans a
 * year boundary correctly by pulling both years' holidays when needed. */
export function getNzPublicHolidaysInRange(startDate: string, endDate: string): NzPublicHoliday[] {
  const startYear = Number(startDate.slice(0, 4));
  const endYear = Number(endDate.slice(0, 4));
  const years = new Set<number>();
  for (let y = startYear; y <= endYear; y++) years.add(y);

  return Array.from(years)
    .flatMap((y) => getNzPublicHolidays(y))
    .filter((h) => h.date >= startDate && h.date < endDate);
}

// Age classification for NZ ECE ratio compliance (Schedule 2, Education
// (Early Childhood Services) Regulations 2008 — 1:5 under 2, 1:10 aged 2
// and over) and for display elsewhere in the app.
//
// Most active children now have an exact `date_of_birth` on file (backfilled
// from Ethan's own attendance/age reports — see migration 0038). When it's
// available, `getCurrentAge` and `classifyAgeGroup` use it directly, which
// is exact and never drifts. For the small number of children who still
// don't have a date of birth recorded, both functions fall back to the
// older periodic age snapshot (age_years/age_months as of age_as_of)
// projected forward — which can drift by a few weeks between snapshot
// refreshes, so anyone within a month of the 24-month ratio boundary either
// way is flagged `borderline` so staff know to check the child's actual
// record before relying on the count for a ratio decision.

export type AgeGroup = "under2" | "over2" | "unknown";

export type AgeClassification = {
  group: AgeGroup;
  /** Age in whole months as of the target date, or null when there's
   * nothing to compute it from at all. */
  ageInMonths: number | null;
  /** True when the age lands within a month of the 24-month boundary on
   * either side AND it was computed from the (less precise) snapshot
   * projection rather than an exact date of birth. */
  borderline: boolean;
};

/** Whole calendar months elapsed from `from` to `to` (both UTC midnight
 * dates), never negative. Uses year/month/day arithmetic rather than a
 * fixed day-length average so it matches how people actually count ages. */
function calendarMonthsElapsed(from: Date, to: Date): number {
  let months = (to.getUTCFullYear() - from.getUTCFullYear()) * 12 + (to.getUTCMonth() - from.getUTCMonth());
  if (to.getUTCDate() < from.getUTCDate()) months -= 1;
  return Math.max(0, months);
}

/** Exact age in whole years + remainder months as of `asOfDate`, computed
 * directly from a `date_of_birth` ("YYYY-MM-DD") string. Returns null if
 * `dateOfBirth` isn't a parseable date. */
export function getCurrentAge(
  dateOfBirth: string | null,
  asOfDate: Date = new Date()
): { years: number; months: number; totalMonths: number } | null {
  if (!dateOfBirth) return null;
  const dob = new Date(`${dateOfBirth}T00:00:00Z`);
  if (Number.isNaN(dob.getTime())) return null;

  const target = new Date(Date.UTC(asOfDate.getUTCFullYear(), asOfDate.getUTCMonth(), asOfDate.getUTCDate()));
  const totalMonths = calendarMonthsElapsed(dob, target);
  return { years: Math.floor(totalMonths / 12), months: totalMonths % 12, totalMonths };
}

/** Classifies a child as under or over 2 for ratio purposes. Prefers an
 * exact `dateOfBirth` when given; otherwise falls back to projecting the
 * `ageYears`/`ageMonths` snapshot forward from `ageAsOf`. */
export function classifyAgeGroup(
  dateOfBirth: string | null,
  ageYears: number | null,
  ageMonths: number | null,
  ageAsOf: string | null,
  asOfDate: Date = new Date()
): AgeClassification {
  const exact = getCurrentAge(dateOfBirth, asOfDate);
  if (exact) {
    const group: AgeGroup = exact.totalMonths < 24 ? "under2" : "over2";
    return { group, ageInMonths: exact.totalMonths, borderline: false };
  }

  if (ageYears === null || !ageAsOf) {
    return { group: "unknown", ageInMonths: null, borderline: false };
  }

  const snapshotDate = new Date(`${ageAsOf}T00:00:00Z`);
  if (Number.isNaN(snapshotDate.getTime())) {
    return { group: "unknown", ageInMonths: null, borderline: false };
  }

  const target = new Date(Date.UTC(asOfDate.getUTCFullYear(), asOfDate.getUTCMonth(), asOfDate.getUTCDate()));
  const elapsed = calendarMonthsElapsed(snapshotDate, target);
  const ageInMonths = ageYears * 12 + (ageMonths ?? 0) + elapsed;
  const group: AgeGroup = ageInMonths < 24 ? "under2" : "over2";
  const borderline = Math.abs(ageInMonths - 24) <= 1;

  return { group, ageInMonths, borderline };
}

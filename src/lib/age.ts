// There's no date of birth stored for any child — only the periodic age
// snapshot (age_years/age_months as of age_as_of) transcribed from the
// centre's own reports. This module projects that snapshot forward to
// classify a child as under or over 2, which is the boundary that sets
// NZ's minimum adult:child ratio (Schedule 2, Education (Early Childhood
// Services) Regulations 2008 — 1:5 under 2, 1:10 aged 2 and over).
//
// Because it's a projection rather than an exact birth date, it can drift
// by a few weeks between snapshot refreshes. Anyone within a month of the
// boundary either way is flagged `borderline` so staff know to check the
// child's actual record before relying on the count for a ratio decision.

export type AgeGroup = "under2" | "over2" | "unknown";

export type AgeClassification = {
  group: AgeGroup;
  /** Projected age in whole months as of the target date, or null when
   * there's no snapshot to project from at all. */
  ageInMonths: number | null;
  /** True when the projection lands within a month of the 24-month
   * boundary on either side. */
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

export function classifyAgeGroup(
  ageYears: number | null,
  ageMonths: number | null,
  ageAsOf: string | null,
  asOfDate: Date = new Date()
): AgeClassification {
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

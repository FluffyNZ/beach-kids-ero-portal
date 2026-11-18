import { getDeadlineAlert, type DeadlineAlert } from "@/lib/evidence-deadline";
import { getRequiredStaffDocumentCategories, STAFF_DOCUMENT_CATEGORY_LABEL } from "@/lib/constants";
import type { StaffAvailability } from "@/lib/types";
import type { StaffContractType, StaffDocumentCategory, StaffQualificationStatus } from "@/lib/supabase/database.types";

// Display helpers for the Staff directory and staff profiles. Pure
// functions only. They describe existing records and rules — nothing here
// adds a new compliance requirement.

export type Tone = "ready" | "attention" | "action" | "neutral";

/** Roles that work with children as teachers/relievers, where a teaching
 * qualification is meaningful to show. Worked out from the role's wording,
 * since the role is free text. */
export function isTeachingRole(role: string | null | undefined): boolean {
  return /teacher|kaiako|reliever|educator|curriculum/i.test(role ?? "");
}

/** e.g. "Qualified Teacher", "Qualified Reliever" — the role itself says
 * the person is qualified. */
export function roleSaysQualified(role: string | null | undefined): boolean {
  return /\bqualified\b/i.test(role ?? "") && !/\bunqualified\b/i.test(role ?? "");
}

/** The qualification label to show beside a staff member, or null when it
 * isn't relevant. Non-teaching roles get no label. "Not qualified" is never
 * shown as a warning — it's only flagged when the role itself says
 * "Qualified" but no qualification has been recorded, since that's a
 * mismatch in the records rather than a requirement. */
export function qualificationLabel(
  role: string | null | undefined,
  status: StaffQualificationStatus
): { label: string; tone: Tone } | null {
  if (!isTeachingRole(role)) return null;
  if (status === "qualified") return { label: "Qualified", tone: "ready" };
  if (status === "studying") return { label: "Studying", tone: "neutral" };
  if (roleSaysQualified(role)) return { label: "Qualification not recorded", tone: "attention" };
  return null;
}

export type AvailabilityState = "available" | "unavailable" | "not_recorded";
export type AvailabilityDay = {
  key: "mon" | "tue" | "wed" | "thu" | "fri";
  label: string;
  state: AvailabilityState;
  start: string | null;
  end: string | null;
};

const DAYS: { key: AvailabilityDay["key"]; label: string }[] = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
];

/** Weekly availability, day by day. With no availability saved at all,
 * every day is "Not recorded" — never "Unavailable". Once availability has
 * been saved, a day with both times is "Available" and a cleared day is
 * "Unavailable" (that's how the availability form saves an unticked day).
 * A day with only one of its two times is "Not recorded". */
export function availabilityDays(availability: StaffAvailability | null): AvailabilityDay[] {
  return DAYS.map((d) => {
    if (!availability) return { ...d, state: "not_recorded", start: null, end: null };
    const start = (availability[`${d.key}_start` as keyof StaffAvailability] as string | null) ?? null;
    const end = (availability[`${d.key}_end` as keyof StaffAvailability] as string | null) ?? null;
    if (start && end) return { ...d, state: "available", start, end };
    if (!start && !end) return { ...d, state: "unavailable", start: null, end: null };
    return { ...d, state: "not_recorded", start, end };
  });
}

export function hoursBetweenTimes(start: string, end: string): number {
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes / 60 : 0;
}

export function formatHrs(hours: number): string {
  const r = Math.round(hours * 10) / 10;
  return `${r} ${r === 1 ? "hr" : "hrs"}`;
}

export type DocumentStatus = { label: string; tone: Tone; kind: "expired" | "expiring" | "on_file" };

/** A document's status from its expiry date, using the existing renewal
 * window (getDeadlineAlert: expired, or due within 90 days). */
export function documentStatus(expiryDate: string | null): DocumentStatus {
  const alert = getDeadlineAlert(null, expiryDate);
  if (!alert) return { label: "On file", tone: "ready", kind: "on_file" };
  if (alert.days < 0) {
    const d = Math.abs(alert.days);
    return { label: `Expired ${d} ${d === 1 ? "day" : "days"} ago`, tone: "action", kind: "expired" };
  }
  if (alert.days === 0) return { label: "Expires today", tone: "action", kind: "expiring" };
  return {
    label: `Expires in ${alert.days} ${alert.days === 1 ? "day" : "days"}`,
    tone: alert.tone === "action" ? "action" : "attention",
    kind: "expiring",
  };
}

/** Plain-words version of a review/expiry alert, e.g. "Review due in 12 days". */
export function alertWords(alert: DeadlineAlert): string {
  const d = Math.abs(alert.days);
  const days = `${d} ${d === 1 ? "day" : "days"}`;
  if (alert.kind === "expiry") return alert.days < 0 ? `Expired ${days} ago` : alert.days === 0 ? "Expires today" : `Expires in ${days}`;
  return alert.days < 0 ? `Review overdue by ${days}` : alert.days === 0 ? "Review due today" : `Review due in ${days}`;
}

/** Required documents not on file, by label — from the existing required
 * document rules (getRequiredStaffDocumentCategories). */
export function missingRequiredDocuments(
  qualificationStatus: StaffQualificationStatus,
  contractType: StaffContractType | null,
  presentCategories: Set<string>
): { category: StaffDocumentCategory; label: string }[] {
  return getRequiredStaffDocumentCategories(qualificationStatus, contractType)
    .filter((c) => !presentCategories.has(c))
    .map((c) => ({ category: c, label: STAFF_DOCUMENT_CATEGORY_LABEL[c] }));
}

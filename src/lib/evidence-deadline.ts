import { daysUntil } from "@/lib/utils";
import type { StatusTone } from "@/lib/constants";

export type DeadlineAlert = { label: string; tone: StatusTone; days: number; kind: "review" | "expiry" };

/**
 * Alert tiers per the brief: expired, due within 30/60/90 days. Expiry
 * takes precedence over an internal review date when both are set and
 * within range, since expiry is the harder deadline.
 */
export function getDeadlineAlert(
  reviewDate: string | null,
  expiryDate: string | null
): DeadlineAlert | null {
  const expiryDays = daysUntil(expiryDate);
  const reviewDays = daysUntil(reviewDate);

  const candidates: Array<{ days: number; kind: "review" | "expiry" }> = [];
  if (expiryDays !== null) candidates.push({ days: expiryDays, kind: "expiry" });
  if (reviewDays !== null) candidates.push({ days: reviewDays, kind: "review" });
  if (candidates.length === 0) return null;

  candidates.sort((a, b) => a.days - b.days);
  const nearest = candidates[0];
  if (nearest.days > 90) return null;

  const label =
    nearest.days < 0
      ? `${nearest.kind === "expiry" ? "Expired" : "Review overdue"} ${Math.abs(nearest.days)}d ago`
      : `${nearest.kind === "expiry" ? "Expires" : "Review due"} in ${nearest.days}d`;

  const tone: StatusTone = nearest.days < 0 || nearest.days <= 30 ? "action" : "attention";

  return { label, tone, days: nearest.days, kind: nearest.kind };
}

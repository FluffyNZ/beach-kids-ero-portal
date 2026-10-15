import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { STAFF_GROWTH_CYCLE_STATUS_LABEL, staffGrowthCycleTone } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { StaffGrowthCycle } from "@/lib/types";

/** Overview's read-only "Professional growth" card — just the most recent
 * cycle (growthCycles is already newest-first, per getStaffById's
 * created_at desc ordering), with a link through to the full Professional
 * growth tab for the rest. */
export function StaffGrowthSummary({ staffId, cycles }: { staffId: string; cycles: StaffGrowthCycle[] }) {
  const latest = cycles[0] ?? null;

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Professional growth</h2>
        <Link href={`/staff/${staffId}?tab=growth`} className="text-xs font-medium text-burgundy-600 hover:underline">
          View all cycles &rarr;
        </Link>
      </div>

      {!latest ? (
        <p className="text-sm text-charcoal/40">Not recorded — no growth cycles started yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-medium text-charcoal">{latest.title}</p>
            <StatusBadge tone={staffGrowthCycleTone(latest.status)}>
              {STAFF_GROWTH_CYCLE_STATUS_LABEL[latest.status]}
            </StatusBadge>
          </div>
          <p className="text-xs text-charcoal/40">
            {latest.start_date ? `Started ${formatDate(latest.start_date)}` : "Start date not recorded"}
            {latest.review_date ? ` · Review ${formatDate(latest.review_date)}` : ""}
          </p>
          <p className="text-xs text-charcoal/50">
            {latest.goals.length} goal{latest.goals.length === 1 ? "" : "s"}
          </p>
        </div>
      )}
    </section>
  );
}

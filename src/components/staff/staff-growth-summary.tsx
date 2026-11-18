import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { RecordTabLink } from "@/components/ui/record-shell";
import { STAFF_GROWTH_CYCLE_STATUS_LABEL, staffGrowthCycleTone } from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import type { StaffGrowthCycle } from "@/lib/types";

/** Overview's "Professional growth" panel — the most recent cycle. This is
 * the staff Professional Growth Cycle record, not Learning Stories. */
export function StaffGrowthSummary({ cycles }: { cycles: StaffGrowthCycle[] }) {
  const latest = cycles[0] ?? null;
  const done = latest ? latest.goals.filter((g) => g.is_complete).length : 0;
  return (
    <Panel id="panel-growth" title="Professional growth" headerAction={<RecordTabLink tab="growth">View details</RecordTabLink>}>
      {!latest ? (
        <p className="border-t border-charcoal/10 px-5 py-4 text-sm text-charcoal/70">No growth cycle started yet.</p>
      ) : (
        <div className="border-t border-charcoal/10 px-5 py-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-medium text-charcoal">{latest.title}</p>
            <StatusPill tone={staffGrowthCycleTone(latest.status)}>{STAFF_GROWTH_CYCLE_STATUS_LABEL[latest.status]}</StatusPill>
          </div>
          <p className="mt-1 text-sm text-charcoal/70">
            {latest.start_date ? `Started ${formatDate(latest.start_date)}` : "Start date not recorded"}
            {latest.review_date ? ` · review ${formatDate(latest.review_date)}` : ""}
            {` · ${done} of ${latest.goals.length} ${latest.goals.length === 1 ? "goal" : "goals"} done`}
          </p>
          {cycles.length > 1 && <p className="mt-1 text-xs text-charcoal/70">{cycles.length - 1} earlier {cycles.length === 2 ? "cycle" : "cycles"}</p>}
        </div>
      )}
    </Panel>
  );
}

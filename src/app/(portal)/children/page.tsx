import Link from "next/link";
import { getChildrenList, getBillPayerOptions } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { getWeeklyFeesSummary } from "@/lib/data/fees";
import { mondayOf, formatCurrency } from "@/lib/utils";
import { ChildrenSearchBar } from "@/components/children/children-search-bar";
import { ChildrenGrid } from "@/components/children/children-grid";
import { NewChildButton } from "@/components/children/new-child-button";
import { StatTile } from "@/components/dashboard/stat-tile";

export const dynamic = "force-dynamic";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; room?: string };
}) {
  // Children who've left don't show up by default — only when the "Show
  // no longer attending" toggle is on (status=all) do they appear at all,
  // still visually dimmed in the grid.
  const showLeft = searchParams.status === "all";
  const statusFilter = showLeft ? undefined : "active";

  const thisWeekStartDate = mondayOf(new Date());

  const [children, rooms, billPayerOptions, weeklyFees] = await Promise.all([
    getChildrenList({ search: searchParams.q, status: statusFilter, roomId: searchParams.room }),
    getRosterRooms(),
    getBillPayerOptions(),
    getWeeklyFeesSummary(thisWeekStartDate),
  ]);

  const activeCount = children.filter((c) => c.status === "active").length;
  const needsBillPayer = children.filter((c) => c.status === "active" && !c.bill_payer_id).length;
  const siblingDiscounts = children.filter((c) => c.sibling_discount_eligible).length;
  const winzCount = children.filter((c) => c.status === "active" && c.has_winz_subsidy).length;

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Children &amp; Fees</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Child profiles, their bill payer and the fee settings each child&apos;s fees will be calculated from.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/children/hours" className="btn-secondary">
            Enter weekly hours
          </Link>
          <NewChildButton rooms={rooms} billPayerOptions={billPayerOptions} />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Active children" value={activeCount} tone="neutral" />
        <StatTile label="Missing a bill payer" value={needsBillPayer} tone={needsBillPayer > 0 ? "attention" : "neutral"} />
        <StatTile label="Sibling discount applies" value={siblingDiscounts} tone="neutral" />
        <StatTile label="On a WINZ subsidy" value={winzCount} tone="neutral" />
        <StatTile
          label={weeklyFees.hasAnyHoursEntered ? "Earned this week (total fees)" : "Earned this week (estimated from enrolled schedules)"}
          value={formatCurrency(weeklyFees.totalFees)}
          tone="ready"
        />
        <StatTile label="Parent-paid this week" value={formatCurrency(weeklyFees.totalParentPays)} tone="neutral" />
      </div>

      <ChildrenSearchBar rooms={rooms} showLeft={showLeft} />

      <ChildrenGrid children={children} rooms={rooms} />
    </div>
  );
}

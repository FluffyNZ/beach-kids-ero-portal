import Link from "next/link";
import { getWeeklyFeesByFamily } from "@/lib/data/fees";
import { mondayOf, formatCurrency } from "@/lib/utils";
import { FeesWeekNav } from "@/components/children/fees-week-nav";
import { FamilyFeesTable } from "@/components/children/family-fees-table";
import { StatTile } from "@/components/dashboard/stat-tile";

export const dynamic = "force-dynamic";

export default async function FeesByFamilyPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const requested = searchParams.week ? new Date(`${searchParams.week}T00:00:00Z`) : new Date();
  const weekStartDate = Number.isNaN(requested.getTime()) ? mondayOf(new Date()) : mondayOf(requested);

  const data = await getWeeklyFeesByFamily(weekStartDate);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Fees by Family</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Each child&apos;s fee from Children &amp; Fees, rolled up to one total per bill payer — what would
            actually go on an invoice this week.
          </p>
        </div>
        <Link href="/children" className="btn-ghost">
          ← Children &amp; Fees
        </Link>
      </div>

      <FeesWeekNav weekStartDate={weekStartDate} basePath="/children/fees-by-family" />

      {!data.hasAnyHoursEntered && (
        <div className="card border-l-4 border-l-status-attention p-4 text-sm text-charcoal/70">
          Nobody&apos;s actual hours have been confirmed for this week yet — these totals are estimated from each
          child&apos;s enrolled schedule. Confirm this week&apos;s hours on{" "}
          <Link href="/children/hours" className="font-medium underline">
            Weekly Hours
          </Link>{" "}
          for exact figures.
        </div>
      )}

      <StatTile label="Total owing across all families this week" value={formatCurrency(data.totalParentPays)} tone="ready" />

      <FamilyFeesTable data={data} />
    </div>
  );
}

import Link from "next/link";
import { getWeeklyFeesByFamily, getWeeklyFeesSummary } from "@/lib/data/fees";
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

  const [data, summary] = await Promise.all([
    getWeeklyFeesByFamily(weekStartDate),
    getWeeklyFeesSummary(weekStartDate),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Fees</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Each active child&apos;s fee from Children, rolled up to one total per bill payer — what would
            actually go on an invoice this week.
          </p>
        </div>
        <Link href="/finances" className="btn-ghost">
          ← Finances
        </Link>
      </div>

      <FeesWeekNav weekStartDate={weekStartDate} basePath="/finances/fees" />

      {!data.hasAnyHoursEntered && (
        <div className="card border-l-4 border-l-status-attention p-4 text-sm text-charcoal/70">
          Nobody&apos;s actual hours have been confirmed for this week yet — these totals are estimated from each
          child&apos;s enrolled schedule. Confirm this week&apos;s hours on{" "}
          <Link href="/children/hours" className="font-medium underline">
            Attendance
          </Link>{" "}
          for exact figures.
        </div>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatTile
          label={
            summary.hasAnyHoursEntered ? "Earned this week (total fees)" : "Earned this week (estimated from enrolled schedules)"
          }
          value={formatCurrency(summary.totalFees)}
          tone="ready"
        />
        <StatTile label="Owing across all families this week" value={formatCurrency(data.totalParentPays)} tone="ready" />
      </div>

      <FamilyFeesTable data={data} />
    </div>
  );
}

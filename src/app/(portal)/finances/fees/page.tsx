import Link from "next/link";
import { FinancePage, FigureStrip } from "@/components/finances/finance-page";
import { FinanceWeekPicker } from "@/components/finances/finance-week-picker";
import { FeeReviewTable } from "@/components/finances/fee-review-table";
import { getFeeReview } from "@/lib/data/finance-hub";
import { fmtWeek, plural } from "@/lib/finance-format";
import { formatCurrency, mondayOfDateString, nzTodayDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";

const FILTERS = ["estimated", "ready", "invoiced", "changed", "unlinked"] as const;

export default async function FeesPage({ searchParams }: { searchParams: { week?: string; status?: string } }) {
  const thisWeek = mondayOfDateString(nzTodayDateString());
  const weekStart = searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week) ? mondayOfDateString(searchParams.week) : thisWeek;
  const data = await getFeeReview(weekStart);
  const initialFilter = FILTERS.find((f) => f === searchParams.status);
  const estimatedFamilies = data.rows.filter((r) => r.billPayerId && r.isEstimated).length;

  return (
    <FinancePage title="Fees" description="Review each family account's fees for a billing week before invoicing.">
      <FinanceWeekPicker weekStart={weekStart} thisWeek={thisWeek} basePath="/finances/fees" />

      {!data.hoursConfirmed && (
        <div role="note" className="rounded-xl border border-status-attention/40 bg-status-attentionBg px-4 py-3 text-sm text-charcoal">
          <p className="font-medium">No hours have been confirmed for {fmtWeek(weekStart)}.</p>
          <p className="mt-0.5">
            These fees are estimated from each child&apos;s booked hours.{" "}
            <Link href={`/children/hours?week=${weekStart}`} className="font-medium text-lilac-700 underline-offset-4 hover:underline">
              Confirm hours in Attendance
            </Link>
            .
          </p>
        </div>
      )}

      <FigureStrip
        figures={[
          {
            label: "Family accounts",
            value: data.totals.families,
            scope: `With enrolled children, week of ${fmtWeek(weekStart)}`,
            detail: estimatedFamilies > 0 ? `${plural(estimatedFamilies, "family", "families")} on estimated hours` : "All on confirmed hours",
          },
          {
            label: "Families pay",
            value: formatCurrency(data.totals.parentPays),
            scope: "Total across family accounts this week",
            detail: data.totals.unlinkedParentPays > 0 ? `Plus ${formatCurrency(data.totals.unlinkedParentPays)} for children with no family account` : undefined,
          },
          {
            label: "WINZ subsidies",
            value: formatCurrency(data.totals.winz),
            scope: "Deducted from family fees this week",
          },
          {
            label: "Total fees",
            value: formatCurrency(data.totals.feeTotal),
            scope: "Before WINZ is deducted; 20 Hours ECE hours aren't charged",
            detail: data.hoursConfirmed ? undefined : "Estimate",
          },
        ]}
      />

      <FeeReviewTable rows={data.rows} weekStart={weekStart} initialFilter={initialFilter} />

      <p className="text-xs text-charcoal/70">
        Fees use the rates, 20 Hours ECE caps and sibling discount in{" "}
        <Link href="/settings" className="font-medium text-lilac-700 underline-offset-4 hover:underline">
          Settings
        </Link>
        . Invoices keep the amount they were drafted with, even if hours change later.
      </p>
    </FinancePage>
  );
}

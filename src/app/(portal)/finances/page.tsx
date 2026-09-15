import Link from "next/link";
import { getFinanceOverview, type FinancePeriod } from "@/lib/data/finances";
import { StatTile } from "@/components/dashboard/stat-tile";
import { formatCurrency, cn } from "@/lib/utils";

export const dynamic = "force-dynamic";

const PERIOD_LABEL: Record<FinancePeriod, string> = {
  month: "This month",
  funding_round: "This funding round",
  financial_year: "This financial year",
};

export default async function FinancesPage({ searchParams }: { searchParams: { period?: string } }) {
  const period: FinancePeriod =
    searchParams.period === "financial_year" || searchParams.period === "funding_round" ? searchParams.period : "month";
  const overview = await getFinanceOverview(period);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Finances</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Overheads, outgoings and income in one place, alongside the parent fee revenue already calculated in
            Children &amp; Fees.
          </p>
        </div>
        <div className="card flex flex-wrap gap-1 p-1">
          {(["month", "funding_round", "financial_year"] as FinancePeriod[]).map((p) => (
            <Link
              key={p}
              href={`/finances?period=${p}`}
              className={cn(
                "rounded-xl px-3 py-1.5 text-sm font-medium transition-colors",
                period === p ? "bg-burgundy-500 text-white" : "text-charcoal/60 hover:bg-sand-100"
              )}
            >
              {PERIOD_LABEL[p]}
            </Link>
          ))}
        </div>
      </div>

      <p className="text-xs text-charcoal/40">Showing {overview.periodLabel}.</p>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Total income" value={formatCurrency(overview.totalIncome)} tone="ready" />
        <StatTile label="Total outgoings" value={formatCurrency(overview.totalOutgoings)} tone="action" />
        <StatTile label="Estimated profit before tax" value={formatCurrency(overview.estimatedProfitBeforeTax)} tone="neutral" />
        <StatTile label="Outstanding bills" value={overview.outstandingBillsCount} tone={overview.outstandingBillsCount > 0 ? "attention" : "neutral"} />
        <StatTile label="Outstanding income" value={overview.outstandingIncomeCount} tone={overview.outstandingIncomeCount > 0 ? "attention" : "neutral"} />
        <StatTile label="Fee revenue (auto)" value={formatCurrency(overview.feeRevenue.total)} tone="ready" />
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          Where the income figure comes from
        </h2>
        <div className="flex flex-col gap-2 text-sm text-charcoal/70">
          <p>
            Parent fees + WINZ (from Children &amp; Fees): <span className="font-medium text-charcoal">{formatCurrency(overview.feeRevenue.total)}</span>
            {" — "}
            {overview.feeRevenue.confirmedWeeks} of {overview.feeRevenue.totalWeeks} week
            {overview.feeRevenue.totalWeeks === 1 ? "" : "s"} confirmed
            {overview.feeRevenue.estimatedWeeks > 0
              ? `, ${overview.feeRevenue.estimatedWeeks} estimated from enrolled schedules`
              : ""}
            .
          </p>
          <p>
            Other income received (MOE funding, invoices, etc.): <span className="font-medium text-charcoal">{formatCurrency(overview.otherIncomeReceived)}</span>
          </p>
          <p className="text-xs text-charcoal/40">
            Outgoings are counted by their expense date within this period, regardless of whether they&apos;ve been
            marked paid yet. Weeks are grouped Monday–Sunday, so a week straddling the start or end of a period
            counts fully wherever its Monday falls, not split by exact day.
          </p>
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Link href="/finances/outgoings" className="card flex-1 p-5 hover:shadow-cardHover" style={{ minWidth: "14rem" }}>
          <h2 className="font-display text-lg font-semibold text-charcoal">Outgoings</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            Overheads and bills — {overview.outstandingBillsCount > 0
              ? `${overview.outstandingBillsCount} unpaid (${formatCurrency(overview.outstandingBillsAmount)})`
              : "nothing outstanding"}
            .
          </p>
        </Link>
        <Link href="/finances/income" className="card flex-1 p-5 hover:shadow-cardHover" style={{ minWidth: "14rem" }}>
          <h2 className="font-display text-lg font-semibold text-charcoal">Income</h2>
          <p className="mt-1 text-sm text-charcoal/60">
            MOE funding, parent invoices and other income — {overview.outstandingIncomeCount > 0
              ? `${overview.outstandingIncomeCount} pending (${formatCurrency(overview.outstandingIncomeAmount)})`
              : "nothing pending"}
            .
          </p>
        </Link>
      </div>

      <p className="text-xs text-charcoal/40">
        &ldquo;Estimated profit before tax&rdquo; is income minus outgoings for this period only — it&apos;s not a
        tax calculation, and doesn&apos;t account for GST, depreciation, or anything else your accountant would
        factor in. Treat it as a rough working figure, not a substitute for their numbers.
      </p>
    </div>
  );
}

import Link from "next/link";
import { getFinanceDashboard, getRecentPayments, type FinancePeriod } from "@/lib/data/finances";
import { getOutstandingFamilyAccounts } from "@/lib/data/invoices";
import { FinanceNav } from "@/components/finances/finance-nav";
import { FinanceStatCard } from "@/components/finances/finance-stat-card";
import { MoneyReceivedChart } from "@/components/finances/money-received-chart";
import { FinanceQuickActions } from "@/components/finances/finance-quick-actions";
import { OutstandingAccountsTable } from "@/components/finances/outstanding-accounts-table";
import { RecentPaymentsTable } from "@/components/finances/recent-payments-table";
import { FinanceStatementsPanel } from "@/components/finances/finance-statements-panel";
import { HowTotalsCalculated } from "@/components/finances/how-totals-calculated";
import { CreditCardIcon, ReportsIcon, DocumentIcon, AlertIcon, PlusIcon } from "@/components/icons";
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

  const [dashboard, accounts, recentPayments] = await Promise.all([
    getFinanceDashboard(period),
    getOutstandingFamilyAccounts(),
    getRecentPayments(6),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <FinanceNav />

      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal md:text-3xl">Finances</h1>
          <p className="mt-1 text-sm text-charcoal/60">Showing {dashboard.periodLabel}.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="card flex gap-1 p-1">
            {(["month", "funding_round", "financial_year"] as FinancePeriod[]).map((p) => (
              <Link
                key={p}
                href={`/finances?period=${p}`}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  period === p ? "bg-charcoal text-white" : "text-charcoal/60 hover:bg-charcoal/5"
                )}
              >
                {PERIOD_LABEL[p]}
              </Link>
            ))}
          </div>
          <Link
            href="/finances/fees"
            title="Draft a new invoice from Fees — invoices are always created from one week's real fee numbers, never typed in freehand."
            className="btn-primary"
          >
            <PlusIcon className="h-4 w-4" />
            Create invoice
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <FinanceStatCard
          label="Money received"
          value={formatCurrency(dashboard.moneyReceived)}
          note={`${dashboard.periodLabel}`}
          icon={<CreditCardIcon />}
        />
        <FinanceStatCard
          label="Expected fee income"
          value={formatCurrency(dashboard.expectedFeeIncome)}
          note={
            dashboard.feeRevenue.estimatedWeeks > 0
              ? `${dashboard.feeRevenue.confirmedWeeks} of ${dashboard.feeRevenue.totalWeeks} weeks confirmed`
              : "All weeks confirmed"
          }
          icon={<ReportsIcon />}
        />
        <FinanceStatCard
          label="Outstanding fees"
          value={formatCurrency(dashboard.outstandingFeesAmount)}
          note={
            dashboard.overdueFeesAmount > 0
              ? `Includes ${formatCurrency(dashboard.overdueFeesAmount)} overdue`
              : "None of this is overdue"
          }
          icon={<DocumentIcon />}
        />
        <FinanceStatCard
          label="Overdue fees"
          value={formatCurrency(dashboard.overdueFeesAmount)}
          note={`${dashboard.overdueFeesCount} invoice${dashboard.overdueFeesCount === 1 ? "" : "s"} — part of outstanding fees`}
          icon={<AlertIcon />}
          tone="attention"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="card p-5 lg:col-span-2">
          <MoneyReceivedChart buckets={dashboard.moneyReceivedBuckets} total={dashboard.moneyReceived} />
        </div>
        <FinanceQuickActions />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <OutstandingAccountsTable accounts={accounts} />
        <RecentPaymentsTable payments={recentPayments} />
      </div>

      <FinanceStatementsPanel outstandingCount={accounts.length} />

      <HowTotalsCalculated dashboard={dashboard} />

      <p className="text-xs text-charcoal/40">
        Figures above aren&apos;t a tax calculation and don&apos;t account for GST, depreciation, or anything else
        your accountant would factor in — treat them as working totals, not a substitute for their numbers.
        Outgoings (overheads/bills) is unchanged and still has all its records — it&apos;s just left out of this
        redesign&apos;s navigation per the brief, so it&apos;s linked here instead:{" "}
        <Link href="/finances/outgoings" className="underline">
          Outgoings
        </Link>
        .
      </p>
    </div>
  );
}

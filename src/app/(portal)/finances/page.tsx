import Link from "next/link";
import { FinancePage, FigureStrip } from "@/components/finances/finance-page";
import { FinanceShortcuts, IncomeChart, NeedsAttention, PeriodSelector, RecentPayments } from "@/components/finances/finance-overview";
import { FINANCE_PERIOD_OPTIONS, getFinanceOverviewData, parsePeriodKey } from "@/lib/data/finance-hub";
import { fmtDate, plural } from "@/lib/finance-format";
import { formatCurrency, mondayOfDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FinanceOverviewPage({ searchParams }: { searchParams: { period?: string } }) {
  const key = parsePeriodKey(searchParams.period);
  const data = await getFinanceOverviewData(key);
  const { period, received, expected, balances } = data;
  const toDate = period.current ? ` (to ${fmtDate(data.today)})` : "";
  // The fee estimate covers whole Mon–Fri weeks, from the week containing
  // the first day of the period to the week containing its last day.
  const firstWeek = mondayOfDateString(period.start);
  const lastWeek = mondayOfDateString(period.end);

  return (
    <FinancePage title="Finance" description="Money received, fees, invoices and family balances for Beach Kids.">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PeriodSelector options={FINANCE_PERIOD_OPTIONS} value={key} />
        <p className="text-sm text-charcoal/70">
          Reporting period: <span className="font-medium text-charcoal">{period.dates}</span>
        </p>
      </div>

      <FigureStrip
        figures={[
          {
            label: "Money received",
            value: formatCurrency(received.total),
            scope: `Payments dated ${period.dates}${toDate}`,
            detail:
              received.count === 0
                ? "No payments recorded in this period"
                : `Invoices ${formatCurrency(received.fromInvoices)} · other income ${formatCurrency(received.fromOtherIncome)}`,
          },
          {
            label: "Expected fees (estimate)",
            value: formatCurrency(expected.total),
            scope: `Weeks beginning ${fmtDate(firstWeek)} to ${fmtDate(lastWeek)}`,
            detail:
              expected.totalWeeks === 0
                ? "No weeks in this period"
                : expected.confirmedWeeks === 0
                  ? `Based on current bookings — no weeks have confirmed hours`
                  : `${expected.confirmedWeeks} of ${plural(expected.totalWeeks, "week")} have confirmed hours`,
          },
          {
            label: "Outstanding balance",
            value: formatCurrency(balances.outstanding),
            scope: `Unpaid sent invoices as of ${fmtDate(data.today)}`,
            detail: balances.unpaidCount === 0 ? "No unpaid invoices" : plural(balances.unpaidCount, "unpaid invoice"),
          },
          {
            label: "Overdue balance",
            value: formatCurrency(balances.overdue),
            scope: `Part of the outstanding balance, past due as of ${fmtDate(data.today)}`,
            detail: balances.overdueCount === 0 ? "Nothing overdue" : plural(balances.overdueCount, "overdue invoice"),
            emphasis: balances.overdue > 0 ? "action" : undefined,
          },
        ]}
      />
      <p className="-mt-3 text-xs text-charcoal/70">
        Expected fees are parent fees plus WINZ subsidies, estimated from current enrolments and booked hours unless hours have been
        confirmed — they aren&apos;t money received. Overdue is included in outstanding, so the two aren&apos;t added together.
      </p>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <IncomeChart buckets={data.chart} total={received.total} periodDates={period.dates} />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <NeedsAttention items={data.attention} />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <div className="min-w-0 lg:col-span-3">
          <RecentPayments payments={data.recentPayments} />
        </div>
        <div className="min-w-0 lg:col-span-2">
          <FinanceShortcuts />
        </div>
      </div>

      <p className="text-xs text-charcoal/70">
        These are working totals, not tax or GST figures. Bills and overheads are in{" "}
        <Link href="/finances/outgoings" className="font-medium text-lilac-700 underline-offset-4 hover:underline">
          Outgoings
        </Link>
        .
      </p>
    </FinancePage>
  );
}

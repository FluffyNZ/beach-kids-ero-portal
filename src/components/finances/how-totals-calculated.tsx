import { formatCurrency } from "@/lib/utils";
import type { FinanceDashboard } from "@/lib/data/finances";

/** The old Overview's always-visible "Where the income figure comes from"
 * explanation, moved into a collapsed-by-default <details> per the brief
 * ("move calculation explanations into an expandable section") — plain
 * HTML disclosure, no new dependency or client-side state needed. */
export function HowTotalsCalculated({ dashboard }: { dashboard: FinanceDashboard }) {
  const { feeRevenue } = dashboard;

  return (
    <details className="card group p-5">
      <summary className="cursor-pointer text-xs font-semibold uppercase tracking-wide text-charcoal/50 [&::-webkit-details-marker]:hidden">
        How totals are calculated
      </summary>
      <div className="mt-3 flex flex-col gap-2 text-sm text-charcoal/70">
        <p>
          Expected fee income — parent fees + WINZ, from Children &amp; Fees:{" "}
          <span className="font-medium text-charcoal">{formatCurrency(feeRevenue.total)}</span>
          {" — "}
          {feeRevenue.confirmedWeeks} of {feeRevenue.totalWeeks} week{feeRevenue.totalWeeks === 1 ? "" : "s"} confirmed
          {feeRevenue.estimatedWeeks > 0 ? `, ${feeRevenue.estimatedWeeks} estimated from enrolled schedules` : ""}.
        </p>
        <p>
          Money received — invoices actually marked paid (by their paid date) plus other income marked received (by
          its received date):{" "}
          <span className="font-medium text-charcoal">{formatCurrency(dashboard.moneyReceived)}</span>
          {" ("}
          {formatCurrency(dashboard.moneyReceivedFromFees)} from parent fee invoices,{" "}
          {formatCurrency(dashboard.moneyReceivedOtherIncome)} from other income{")"}.
        </p>
        <p>
          WINZ subsidy payments count toward expected fee income but aren&apos;t separately tracked as
          &quot;received&quot; anywhere in this system, so they&apos;re deliberately left out of money received
          rather than assumed — ask Ethan/your accountant if you&apos;d rather this counted WINZ as received
          automatically.
        </p>
        <p>
          Outstanding fees — every sent-but-unpaid invoice right now:{" "}
          <span className="font-medium text-charcoal">{formatCurrency(dashboard.outstandingFeesAmount)}</span> across{" "}
          {dashboard.outstandingFeesCount} invoice{dashboard.outstandingFeesCount === 1 ? "" : "s"}. Overdue fees are
          the subset of that where the due date has passed:{" "}
          <span className="font-medium text-charcoal">{formatCurrency(dashboard.overdueFeesAmount)}</span> across{" "}
          {dashboard.overdueFeesCount} invoice{dashboard.overdueFeesCount === 1 ? "" : "s"} — not an additional
          amount on top.
        </p>
        <p className="text-xs text-charcoal/40">
          Weeks are grouped Monday–Sunday for fee calculations, so a week straddling the start or end of a period
          counts fully wherever its Monday falls, not split by exact day. None of these figures are a tax
          calculation — treat them as working totals, not a substitute for your accountant&apos;s numbers.
        </p>
      </div>
    </details>
  );
}

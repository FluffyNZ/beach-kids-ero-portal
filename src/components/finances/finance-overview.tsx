import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { formatCurrency, cn } from "@/lib/utils";
import { fmtDate } from "@/lib/finance-format";
import type { AttentionItem, ChartBucket, FinancePeriodKey, PaymentEvent } from "@/lib/data/finance-hub";

export function PeriodSelector({
  options,
  value,
}: {
  options: Array<{ key: FinancePeriodKey; label: string }>;
  value: FinancePeriodKey;
}) {
  return (
    <nav aria-label="Reporting period" className="flex flex-wrap gap-1 rounded-xl border border-charcoal/10 bg-white p-1">
      {options.map((o) => (
        <Link
          key={o.key}
          href={o.key === "month" ? "/finances" : `/finances?period=${o.key}`}
          aria-current={o.key === value ? "true" : undefined}
          scroll={false}
          className={cn(
            "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
            o.key === value ? "bg-lilac-100 text-charcoal" : "text-charcoal/70 hover:bg-lilac-50 hover:text-charcoal"
          )}
        >
          {o.label}
        </Link>
      ))}
    </nav>
  );
}

/** Money received per week or month, from recorded payments only. Weeks or
 * months with no payments have no bar; periods with none at all show an
 * empty state instead of a chart. */
export function IncomeChart({ buckets, total, periodDates }: { buckets: ChartBucket[]; total: number; periodDates: string }) {
  const max = Math.max(...buckets.map((b) => b.amount), 0);
  return (
    <Panel
      title="Money received"
      description={`Recorded payments, ${periodDates}`}
      action={{ label: "View income", href: "/finances/income" }}
      bodyClassName="px-5 pb-5"
    >
      {total === 0 ? (
        <div className="rounded-xl border border-dashed border-charcoal/15">
          <EmptyState title="No payments recorded in this period" description="Paid invoices and income marked received will appear here." />
        </div>
      ) : (
        <figure>
          <div className="flex h-44 items-end gap-2 border-b border-charcoal/20 sm:gap-3" aria-hidden="true">
            {buckets.map((b) => (
              <div key={b.start} className="flex h-full min-w-0 flex-1 flex-col justify-end">
                {b.amount > 0 && (
                  <>
                    <span className="mb-1 truncate text-center text-[11px] font-medium tabular-nums text-charcoal">
                      {formatCurrency(b.amount)}
                    </span>
                    <div className="w-full rounded-t-md bg-lilac-600" style={{ height: `${Math.max(1.5, (b.amount / max) * 100)}%` }} />
                  </>
                )}
              </div>
            ))}
          </div>
          <div className="mt-1.5 flex gap-2 sm:gap-3" aria-hidden="true">
            {buckets.map((b) => (
              <span key={b.start} className="min-w-0 flex-1 truncate text-center text-[11px] text-charcoal/70">
                {b.label}
              </span>
            ))}
          </div>
          <figcaption className="mt-3 text-xs text-charcoal/70">
            No bar means no payment was recorded. {buckets.some((b) => b.future) ? "Later weeks haven't happened yet." : ""}
          </figcaption>
          <table className="sr-only">
            <caption>Money received by {buckets.length > 6 ? "month" : "week"}</caption>
            <thead>
              <tr>
                <th scope="col">Period</th>
                <th scope="col">Received</th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.start}>
                  <th scope="row">
                    {fmtDate(b.start)} to {fmtDate(b.end)}
                  </th>
                  <td>{b.future ? "Not yet" : formatCurrency(b.amount)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </figure>
      )}
    </Panel>
  );
}

export function NeedsAttention({ items }: { items: AttentionItem[] }) {
  return (
    <Panel title="Needs attention" count={items.length} bodyClassName="">
      {items.length === 0 ? (
        <EmptyState tone="positive" title="Nothing needs attention" description="No overdue invoices, unsent drafts or missing details." />
      ) : (
        <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-5 py-3">
              <span
                aria-hidden="true"
                className={cn(
                  "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                  item.tone === "action" ? "bg-status-action" : item.tone === "attention" ? "bg-status-attention" : "bg-lilac-400"
                )}
              />
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-charcoal">{item.title}</p>
                <p className="text-xs text-charcoal/70">{item.detail}</p>
              </div>
              <Link href={item.href} className="shrink-0 text-sm font-medium text-lilac-700 underline-offset-4 hover:underline">
                {item.linkLabel}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

export function RecentPayments({ payments }: { payments: PaymentEvent[] }) {
  return (
    <Panel title="Recent payments" description="Latest recorded, any period" action={{ label: "All invoices", href: "/finances/invoices?status=paid" }} bodyClassName="">
      {payments.length === 0 ? (
        <EmptyState title="No payments recorded yet" description="Record a payment from an unpaid invoice, or mark income as received." />
      ) : (
        <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
          {payments.map((p) => (
            <li key={p.id}>
              <Link href={p.href} className="flex items-center gap-3 px-5 py-3 hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal">
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-charcoal">{p.payer}</p>
                  <p className="truncate text-xs text-charcoal/70">
                    {fmtDate(p.date)} · {p.detail}
                  </p>
                </div>
                <span className="shrink-0 text-sm font-semibold tabular-nums text-charcoal">{formatCurrency(p.amount)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

const SHORTCUTS = [
  { label: "Record a payment", detail: "Open an unpaid invoice", href: "/finances/invoices?status=unpaid" },
  { label: "Review fees", detail: "This week's fees by family", href: "/finances/fees" },
  { label: "Prepare statements", detail: "Preview and send a statement", href: "/finances/statements" },
  { label: "Add income", detail: "Funding or other money in", href: "/finances/income" },
];

export function FinanceShortcuts() {
  return (
    <Panel title="Shortcuts" bodyClassName="px-3 pb-3">
      <ul className="grid gap-1 sm:grid-cols-2">
        {SHORTCUTS.map((s) => (
          <li key={s.href}>
            <Link href={s.href} className="flex flex-col rounded-xl px-3 py-2.5 hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal">
              <span className="text-sm font-medium text-charcoal">{s.label}</span>
              <span className="text-xs text-charcoal/70">{s.detail}</span>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}


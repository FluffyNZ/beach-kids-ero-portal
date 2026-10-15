import Link from "next/link";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { RecentPayment } from "@/lib/data/finances";

/** The Overview's "Recent payments" preview — paid invoices (parent fees)
 * and other income marked received, merged into one newest-first feed
 * (see getRecentPayments). Links through to Invoices' Paid tab for the
 * full history. */
export function RecentPaymentsTable({ payments }: { payments: RecentPayment[] }) {
  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Recent payments</h2>
        <Link href="/finances/invoices?status=paid" className="text-xs font-medium text-charcoal/60 hover:text-charcoal">
          View all &rarr;
        </Link>
      </div>

      {payments.length === 0 ? (
        <p className="py-4 text-sm text-charcoal/40">Nothing received yet.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-charcoal/40">
              <th className="py-2 pr-2 font-medium">Family</th>
              <th className="py-2 px-2 text-right font-medium">Amount</th>
              <th className="py-2 px-2 font-medium">Method</th>
              <th className="py-2 pl-2 font-medium">Date</th>
            </tr>
          </thead>
          <tbody>
            {payments.map((payment) => (
              <tr key={payment.id} className="border-b border-charcoal/5 last:border-0">
                <td className="py-2 pr-2 text-charcoal">{payment.family}</td>
                <td className="py-2 px-2 text-right font-medium text-charcoal">{formatCurrency(payment.amount)}</td>
                <td className="py-2 px-2 text-charcoal/60">{payment.method}</td>
                <td className="py-2 pl-2 text-charcoal/60">{formatShortDate(payment.date)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

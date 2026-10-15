import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import type { OutstandingFamilyAccount } from "@/lib/data/invoices";

/** The Overview's "Outstanding family accounts" preview — the same
 * families/balances as Family accounts (/finances/clients) and Statements,
 * just the top few with a link through to the full list rather than a
 * duplicate page. */
export function OutstandingAccountsTable({ accounts }: { accounts: OutstandingFamilyAccount[] }) {
  const preview = accounts.slice(0, 6);

  return (
    <section className="card flex flex-col gap-3 p-5">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Outstanding family accounts</h2>
        <Link href="/finances/clients" className="text-xs font-medium text-charcoal/60 hover:text-charcoal">
          View all &rarr;
        </Link>
      </div>

      {preview.length === 0 ? (
        <p className="py-4 text-sm text-charcoal/40">No family currently owes anything.</p>
      ) : (
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-charcoal/40">
              <th className="py-2 pr-2 font-medium">Family</th>
              <th className="py-2 px-2 text-right font-medium">Balance</th>
              <th className="py-2 px-2 font-medium">Due date</th>
              <th className="py-2 pl-2 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {preview.map((account) => (
              <tr key={account.bill_payer_id} className="border-b border-charcoal/5 last:border-0">
                <td className="py-2 pr-2 text-charcoal">{account.bill_payer_name}</td>
                <td className="py-2 px-2 text-right font-medium text-charcoal">{formatCurrency(account.balance)}</td>
                <td className="py-2 px-2 text-charcoal/60">{account.nextDueDate ? formatShortDate(account.nextDueDate) : "—"}</td>
                <td className="py-2 pl-2">
                  <StatusBadge tone={account.overdue ? "action" : "attention"}>
                    {account.overdue ? "Overdue" : "Upcoming"}
                  </StatusBadge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}

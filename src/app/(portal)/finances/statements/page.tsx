import Link from "next/link";
import { getFamilyStatements } from "@/lib/data/invoices";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { SendStatementButton } from "@/components/finances/send-statement-button";
import { StatTile } from "@/components/dashboard/stat-tile";

export const dynamic = "force-dynamic";

export default async function StatementsPage() {
  const statements = await getFamilyStatements();
  const totalOwing = statements.reduce((sum, s) => sum + s.totalOwing, 0);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Statements</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            What every family currently owes, across every invoice that&apos;s been sent but not yet marked paid.
          </p>
        </div>
        <Link href="/finances/invoices" className="btn-ghost">
          ← Invoices
        </Link>
      </div>

      <StatTile label="Total currently owing, all families" value={formatCurrency(totalOwing)} tone="attention" />

      {statements.length === 0 ? (
        <div className="card p-6 text-center text-sm text-charcoal/50">
          Nobody currently owes anything — every sent invoice has been marked paid (or nothing&apos;s been sent yet).
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {statements.map((statement) => (
            <div key={statement.bill_payer_id} className="card flex flex-col gap-3 p-5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <h3 className="font-display text-lg font-semibold text-charcoal">{statement.bill_payer_name}</h3>
                  {statement.bill_payer_email ? (
                    <p className="text-xs text-charcoal/50">{statement.bill_payer_email}</p>
                  ) : (
                    <p className="text-xs text-status-action">No email on file — add one to send a statement.</p>
                  )}
                </div>
                <div className="flex items-end gap-3">
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wide text-charcoal/50">Currently owing</p>
                    <p className="font-display text-xl font-bold text-charcoal">{formatCurrency(statement.totalOwing)}</p>
                  </div>
                  {statement.bill_payer_email && <SendStatementButton billPayerId={statement.bill_payer_id} />}
                </div>
              </div>

              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-wide text-charcoal/40">
                    <th className="py-1.5 pr-2 font-medium">Invoice</th>
                    <th className="py-1.5 px-2 font-medium">Week</th>
                    <th className="py-1.5 pl-2 text-right font-medium">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {statement.outstandingInvoices.map((invoice) => (
                    <tr key={invoice.id} className="border-b border-sand-100 last:border-0">
                      <td className="py-1.5 pr-2 text-charcoal">{invoice.invoice_number}</td>
                      <td className="py-1.5 px-2 text-charcoal/60">{formatShortDate(invoice.week_start_date)}</td>
                      <td className="py-1.5 pl-2 text-right font-medium text-charcoal">{formatCurrency(invoice.total_due)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

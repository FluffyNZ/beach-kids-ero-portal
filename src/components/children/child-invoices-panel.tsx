import type { Invoice } from "@/lib/types";
import { InvoiceCard } from "@/components/finances/invoice-card";

/** The real invoice history for this child, reusing the exact same
 * InvoiceCard (and its send/void/mark-paid actions) used on Finance →
 * Invoices — nothing is recalculated here. An invoice covers the whole bill
 * payer, so a card can include a sibling's line too. */
export function ChildInvoicesPanel({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <p className="rounded-2xl border border-charcoal/10 bg-white px-5 py-4 text-sm text-charcoal/70">
        No invoices include this child yet.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {invoices.map((invoice) => (
        <InvoiceCard key={invoice.id} invoice={invoice} />
      ))}
    </div>
  );
}

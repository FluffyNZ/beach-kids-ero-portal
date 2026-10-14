import type { Invoice } from "@/lib/types";
import { InvoiceCard } from "@/components/finances/invoice-card";

/** The Invoices tab's real invoice history for this child, reusing the
 * exact same InvoiceCard (and its send/void/mark-paid actions) already
 * used on the Finances invoices list — nothing new to maintain, no risk of
 * drifting out of sync with how invoicing actually works. An invoice
 * covers the whole bill payer, not just one child, so a card here can show
 * a sibling's line item too when invoices are shared — same as everywhere
 * else invoices are shown. */
export function ChildInvoicesPanel({ invoices }: { invoices: Invoice[] }) {
  if (invoices.length === 0) {
    return (
      <div className="card p-5">
        <p className="text-sm text-charcoal/50">No invoices on file for this child yet.</p>
      </div>
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

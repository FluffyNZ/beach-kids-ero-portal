"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Invoice, InvoiceStatus } from "@/lib/types";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { sendInvoice, markInvoicePaid, voidInvoice } from "@/lib/actions/invoices";

const STATUS_LABEL: Record<InvoiceStatus, string> = {
  draft: "Draft",
  sent: "Sent — outstanding",
  paid: "Paid",
  void: "Voided",
};

const STATUS_TONE: Record<InvoiceStatus, string> = {
  draft: "bg-sand-100 text-charcoal/60",
  sent: "bg-status-attentionBg text-status-attention",
  paid: "bg-status-readyBg text-status-ready",
  void: "bg-sand-100 text-charcoal/40",
};

/** One invoice, its frozen line items, and whichever actions make sense
 * for its current status — draft can be sent or voided, sent can be
 * marked paid or voided, paid can be undone back to sent. */
export function InvoiceCard({ invoice }: { invoice: Invoice }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function run(action: () => Promise<void>) {
    setError(null);
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong.");
      }
    });
  }

  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-xs text-charcoal/50">
            {invoice.invoice_number} · Week of {formatShortDate(invoice.week_start_date)}
          </p>
          <h3 className="font-display text-lg font-semibold text-charcoal">{invoice.bill_payer_name}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${STATUS_TONE[invoice.status]}`}>
            {STATUS_LABEL[invoice.status]}
          </span>
          <p className="font-display text-lg font-bold text-charcoal">{formatCurrency(invoice.total_due)}</p>
        </div>
      </div>

      <table className="w-full text-sm">
        <tbody>
          {invoice.line_items.map((li) => (
            <tr key={li.id} className="border-b border-sand-100 last:border-0">
              <td className="py-1 pr-2 text-charcoal">
                {li.child_name}
                {li.is_estimated && <span className="ml-1 text-xs text-charcoal/40">(est.)</span>}
              </td>
              <td className="py-1 text-right text-charcoal/80">{formatCurrency(li.parent_pays)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <p className="text-xs text-charcoal/50">
        Issued {formatShortDate(invoice.issued_date)}
        {invoice.due_date ? ` · Due ${formatShortDate(invoice.due_date)}` : ""}
        {invoice.sent_at ? ` · Sent to ${invoice.sent_to_email}` : ""}
        {invoice.paid_at ? ` · Marked paid ${formatShortDate(invoice.paid_at.slice(0, 10))}` : ""}
      </p>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-xs text-status-action">{error}</p>}

      <div className="flex justify-end gap-2">
        {invoice.status === "draft" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => voidInvoice(invoice.id))}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Void
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => sendInvoice(invoice.id))}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              {pending ? "Sending…" : "Send invoice"}
            </button>
          </>
        )}
        {invoice.status === "sent" && (
          <>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => voidInvoice(invoice.id))}
              className="btn-ghost px-3 py-1.5 text-xs"
            >
              Void
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => markInvoicePaid(invoice.id, true))}
              className="btn-primary px-3 py-1.5 text-xs"
            >
              Mark as paid
            </button>
          </>
        )}
        {invoice.status === "paid" && (
          <button
            type="button"
            disabled={pending}
            onClick={() => run(() => markInvoicePaid(invoice.id, false))}
            className="btn-ghost px-3 py-1.5 text-xs"
          >
            Undo — mark unpaid
          </button>
        )}
      </div>
    </div>
  );
}

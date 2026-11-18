"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { StatusPill } from "@/components/ui/status-pill";
import { markInvoicePaid, sendInvoice, sendTestInvoiceEmail, voidInvoice } from "@/lib/actions/invoices";
import { formatCurrency, cn } from "@/lib/utils";
import {
  INVOICE_STATE_LABEL,
  INVOICE_STATE_TONE,
  fmtDate,
  fmtDateTime,
  fmtWeek,
  invoiceBalance,
  invoiceState,
  nzDateOf,
  paymentMethodLabel,
  sentAsTest,
} from "@/lib/finance-format";
import type { Invoice } from "@/lib/types";

const DEFAULT_TEST_EMAIL = "ethan@beachkids.co.nz";

type Confirm = null | "send" | "pay" | "void" | "unpay" | "test";
type Result = { kind: "success" | "error"; message: string } | null;

function HistoryItem({ when, title, detail }: { when: string; title: string; detail?: string }) {
  return (
    <li className="relative pl-5">
      <span aria-hidden="true" className="absolute left-0 top-1.5 h-2 w-2 rounded-full bg-lilac-600" />
      <p className="text-sm font-medium text-charcoal">{title}</p>
      <p className="text-xs text-charcoal/70">
        {when}
        {detail ? ` · ${detail}` : ""}
      </p>
    </li>
  );
}

/** The body of an open invoice: breakdown, payment history and status. */
export function InvoiceDetailBody({ invoice, today, result }: { invoice: Invoice; today: string; result: Result }) {
  const state = invoiceState(invoice, today);
  const balance = invoiceBalance(invoice);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={INVOICE_STATE_TONE[state]}>{INVOICE_STATE_LABEL[state]}</StatusPill>
        {sentAsTest(invoice) && invoice.status === "sent" && <StatusPill tone="attention">Sent as a test</StatusPill>}
      </div>

      {result && (
        <p
          role={result.kind === "error" ? "alert" : "status"}
          className={cn(
            "rounded-xl px-3 py-2 text-sm text-charcoal",
            result.kind === "error" ? "border border-status-action/40 bg-status-actionBg" : "bg-status-readyBg"
          )}
        >
          {result.message}
        </p>
      )}

      <dl className="grid grid-cols-[8.5rem_1fr] gap-x-4 gap-y-2 text-sm">
        <dt className="text-charcoal/70">Family account</dt>
        <dd>
          <Link href={`/finances/clients/${invoice.bill_payer_id}`} className="font-medium text-lilac-700 underline-offset-4 hover:underline">
            {invoice.bill_payer_name}
          </Link>
          <span className="block text-xs text-charcoal/70">{invoice.bill_payer_email ?? "No email on file"}</span>
        </dd>
        <dt className="text-charcoal/70">Billing week</dt>
        <dd className="text-charcoal">{fmtWeek(invoice.week_start_date)}</dd>
        <dt className="text-charcoal/70">Issue date</dt>
        <dd className="text-charcoal">{fmtDate(invoice.issued_date)}</dd>
        <dt className="text-charcoal/70">Due date</dt>
        <dd className="text-charcoal">{fmtDate(invoice.due_date)}</dd>
      </dl>

      <section aria-labelledby="inv-breakdown">
        <h3 id="inv-breakdown" className="mb-2 text-sm font-semibold text-charcoal">
          Breakdown
        </h3>
        <div className="overflow-x-auto rounded-xl border border-charcoal/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
                <th scope="col" className="px-3 py-2">Child</th>
                <th scope="col" className="px-3 py-2 text-right">Fee</th>
                <th scope="col" className="px-3 py-2 text-right">WINZ</th>
                <th scope="col" className="px-3 py-2 text-right">Family pays</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/10">
              {invoice.line_items.map((li) => (
                <tr key={li.id}>
                  <th scope="row" className="px-3 py-2 text-left font-medium text-charcoal">
                    {li.child_name}
                    <span className="block text-xs font-normal text-charcoal/70">
                      {li.room_name ?? "No room"}
                      {li.is_estimated ? " · estimated from booked hours" : ""}
                    </span>
                  </th>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{formatCurrency(li.fee_total)}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right tabular-nums">{li.winz_payment > 0 ? `−${formatCurrency(li.winz_payment)}` : "—"}</td>
                  <td className="whitespace-nowrap px-3 py-2 text-right font-medium tabular-nums">{formatCurrency(li.parent_pays)}</td>
                </tr>
              ))}
              {invoice.line_items.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-3 py-3 text-charcoal/70">
                    No line items on this invoice.
                  </td>
                </tr>
              )}
            </tbody>
            <tfoot className="border-t border-charcoal/20">
              <tr>
                <th scope="row" colSpan={3} className="px-3 py-2 text-left font-semibold">
                  Amount
                </th>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">{formatCurrency(invoice.total_due)}</td>
              </tr>
              <tr>
                <th scope="row" colSpan={3} className="px-3 py-2 text-left font-semibold">
                  Balance
                </th>
                <td className="px-3 py-2 text-right font-semibold tabular-nums">
                  {balance === null ? (invoice.status === "void" ? "Void" : "Not yet owed") : formatCurrency(balance)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>

      <section aria-labelledby="inv-history">
        <h3 id="inv-history" className="mb-2 text-sm font-semibold text-charcoal">
          Payment history
        </h3>
        <ol className="flex flex-col gap-3 border-l border-charcoal/10 pl-0">
          <HistoryItem when={fmtDateTime(invoice.created_at)} title="Drafted" />
          {invoice.sent_at && (
            <HistoryItem
              when={fmtDateTime(invoice.sent_at)}
              title={sentAsTest(invoice) ? "Sent as a test" : "Emailed to family"}
              detail={invoice.sent_to_email ?? undefined}
            />
          )}
          {invoice.status === "paid" && (
            <HistoryItem
              when={invoice.paid_at ? fmtDate(nzDateOf(invoice.paid_at)) : "Date not recorded"}
              title={`Payment of ${formatCurrency(invoice.total_due)}`}
              detail={paymentMethodLabel(invoice)}
            />
          )}
          {invoice.status === "void" && <HistoryItem when="Date not recorded" title="Voided" />}
        </ol>
        {invoice.status === "sent" && <p className="mt-3 text-sm text-charcoal/70">No payment recorded yet.</p>}
      </section>
    </div>
  );
}

/** Actions for an open invoice. Every action asks for confirmation first,
 * runs once (repeat clicks are ignored while saving) and reports success
 * or the error. */
export function InvoiceActions({
  invoice,
  today,
  onResult,
}: {
  invoice: Invoice;
  today: string;
  onResult: (r: Result) => void;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [confirm, setConfirm] = useState<Confirm>(null);
  const [more, setMore] = useState(false);
  const [testEmail, setTestEmail] = useState(DEFAULT_TEST_EMAIL);

  useEffect(() => {
    setConfirm(null);
    setMore(false);
  }, [invoice.id, invoice.status]);

  async function run(action: () => Promise<void>, success: string) {
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    onResult(null);
    try {
      await action();
      onResult({ kind: "success", message: success });
      setConfirm(null);
      router.refresh();
    } catch (err) {
      onResult({ kind: "error", message: err instanceof Error ? err.message : "Something went wrong — nothing was changed." });
    } finally {
      busy.current = false;
      setSaving(false);
    }
  }

  const amount = formatCurrency(invoice.total_due);

  if (confirm) {
    const copy: Record<Exclude<Confirm, null>, { text: string; button: string; danger?: boolean; go: () => void }> = {
      send: {
        text: `Email ${invoice.invoice_number} (${amount}) to ${invoice.bill_payer_email}? It will then count as owed.`,
        button: "Send invoice",
        go: () => run(() => sendInvoice(invoice.id), `${invoice.invoice_number} was emailed to ${invoice.bill_payer_email}.`),
      },
      pay: {
        text: `Record a payment of ${amount} for ${invoice.invoice_number}, dated today (${fmtDate(today)})? The whole invoice will be marked paid — part payments aren't recorded.`,
        button: "Record payment",
        go: () => run(() => markInvoicePaid(invoice.id, true), `Payment of ${amount} recorded for ${invoice.invoice_number}.`),
      },
      void: {
        text: `Void ${invoice.invoice_number}? It stays in the invoice history but no longer counts as owed, and the family's week can be invoiced again. This can't be undone.`,
        button: "Void invoice",
        danger: true,
        go: () => run(() => voidInvoice(invoice.id), `${invoice.invoice_number} was voided.`),
      },
      unpay: {
        text: `Remove the recorded payment from ${invoice.invoice_number}? It will count as owed again${invoice.xero_transaction_id ? " and its Xero match will be cleared" : ""}.`,
        button: "Remove payment",
        danger: true,
        go: () => run(() => markInvoicePaid(invoice.id, false), `The payment was removed — ${invoice.invoice_number} is unpaid again.`),
      },
      test: {
        text: `Send ${invoice.invoice_number} to ${testEmail.trim() || "the test address"} instead of the family? The invoice will be marked as sent and count as owed until it's paid or voided.`,
        button: "Send test",
        go: () => run(() => sendTestInvoiceEmail(invoice.id, testEmail), `Test email sent to ${testEmail.trim()}. ${invoice.invoice_number} now counts as owed.`),
      },
    };
    const c = copy[confirm];
    return (
      <div className="flex flex-col gap-3" role="group" aria-label="Confirm action">
        <p className="text-sm text-charcoal">{c.text}</p>
        <div className="flex flex-wrap justify-end gap-2">
          <button type="button" className="btn-secondary" disabled={saving} onClick={() => setConfirm(null)}>
            Cancel
          </button>
          <button type="button" autoFocus className={c.danger ? "btn-danger" : "btn-primary"} disabled={saving} onClick={c.go}>
            {saving ? "Saving…" : c.button}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <a href={`/finances/invoices/${invoice.id}`} target="_blank" rel="noreferrer" className="btn-secondary">
          Printable invoice
        </a>
        {invoice.status === "draft" &&
          (invoice.bill_payer_email ? (
            <button type="button" className="btn-primary" onClick={() => setConfirm("send")}>
              Send invoice
            </button>
          ) : (
            <Link href={`/finances/clients/${invoice.bill_payer_id}`} className="btn-primary">
              Add email to send
            </Link>
          ))}
        {invoice.status === "sent" && (
          <button type="button" className="btn-primary" onClick={() => setConfirm("pay")}>
            Record payment
          </button>
        )}
      </div>

      {invoice.status !== "void" && (
        <div>
          <button
            type="button"
            aria-expanded={more}
            onClick={() => setMore((v) => !v)}
            className="text-sm font-medium text-charcoal/70 underline-offset-4 hover:text-charcoal hover:underline"
          >
            {more ? "Hide other actions" : "Other actions"}
          </button>
          {more && (
            <div className="mt-2 flex flex-col gap-3 rounded-xl border border-charcoal/10 p-3">
              {invoice.status === "draft" && (
                <div className="flex flex-col gap-2">
                  <label htmlFor="test-email" className="text-sm font-medium text-charcoal">
                    Send a test copy to
                  </label>
                  <div className="flex gap-2">
                    <input id="test-email" type="email" className="input py-1.5" value={testEmail} onChange={(e) => setTestEmail(e.target.value)} />
                    <button type="button" className="btn-secondary shrink-0 px-3 py-1.5" onClick={() => setConfirm("test")}>
                      Send test
                    </button>
                  </div>
                </div>
              )}
              {invoice.status === "paid" && (
                <button type="button" className="btn-ghost justify-start px-0 text-status-action" onClick={() => setConfirm("unpay")}>
                  Remove recorded payment…
                </button>
              )}
              {(invoice.status === "draft" || invoice.status === "sent") && (
                <button type="button" className="btn-ghost justify-start px-0 text-status-action" onClick={() => setConfirm("void")}>
                  Void invoice…
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

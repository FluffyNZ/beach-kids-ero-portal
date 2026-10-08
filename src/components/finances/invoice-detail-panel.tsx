"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Invoice } from "@/lib/types";
import { formatCurrency, formatDate, addDays, isOverdue } from "@/lib/utils";
import { CloseIcon } from "@/components/icons";
import { sendInvoice, sendTestInvoiceEmail, markInvoicePaid, voidInvoice } from "@/lib/actions/invoices";

const DEFAULT_TEST_EMAIL = "ethan@beachkids.co.nz";

const STATUS_LABEL: Record<Invoice["status"], string> = {
  draft: "Draft",
  sent: "Unpaid",
  paid: "Paid",
  void: "Voided",
};

// Restrained, Mercury-style status tones — deliberately no green/sage, kept
// local to the invoicing redesign rather than touching the app-wide
// status-ready/attention/action tokens used elsewhere (staff documents,
// dashboard tiles, etc).
function statusTone(invoice: Invoice): string {
  if (invoice.status === "draft") return "bg-slate-100 text-slate-600";
  if (invoice.status === "void") return "bg-slate-50 text-slate-400";
  if (invoice.status === "paid") return "bg-charcoal text-white";
  if (invoice.status === "sent" && isOverdue(invoice.due_date)) return "bg-red-50 text-red-700";
  return "bg-amber-50 text-amber-700";
}

function statusLabel(invoice: Invoice): string {
  if (invoice.status === "sent" && isOverdue(invoice.due_date)) return "Overdue";
  return STATUS_LABEL[invoice.status];
}

const BTN_BLACK =
  "inline-flex items-center justify-center gap-1.5 rounded-lg bg-charcoal px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-charcoal/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_WHITE =
  "inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-sm font-medium text-charcoal transition-colors hover:bg-slate-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";
const BTN_GHOST_SM =
  "inline-flex items-center justify-center rounded-lg px-3 py-1.5 text-xs font-medium text-charcoal/60 transition-colors hover:bg-slate-100 hover:text-charcoal disabled:cursor-not-allowed disabled:opacity-50";

/** Billing period as "5 – 9 Oct 2026" — the week this invoice covers is
 * always Monday through Friday (see mondayOf / getWeeklyFeesByFamily), so
 * Friday is always exactly 4 days after week_start_date. */
function billingPeriodLabel(weekStartDate: string): string {
  const friday = addDays(weekStartDate, 4);
  const [, , startDayStr] = weekStartDate.split("-");
  const startDay = String(Number(startDayStr));
  return `${startDay} – ${formatDate(friday)}`;
}

function balanceLabel(invoice: Invoice): string {
  if (invoice.status === "paid") return formatCurrency(0);
  if (invoice.status === "sent") return formatCurrency(invoice.total_due);
  return "—";
}

/** The right-hand details panel — everything InvoiceCard used to show
 * inline in the list, now surfaced when a row is selected. Every action
 * here is the exact same server action the old card used (sendInvoice,
 * sendTestInvoiceEmail, markInvoicePaid, voidInvoice) — only the
 * presentation changed. */
export function InvoiceDetailPanel({ invoice, onClose }: { invoice: Invoice; onClose: () => void }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [showTestSend, setShowTestSend] = useState(false);
  const [testEmail, setTestEmail] = useState(DEFAULT_TEST_EMAIL);
  const closeButtonRef = useRef<HTMLButtonElement>(null);

  // Reset transient UI state whenever a different invoice is selected, and
  // move keyboard focus into the panel so it's reachable without a mouse.
  useEffect(() => {
    setError(null);
    setShowTestSend(false);
    setTestEmail(DEFAULT_TEST_EMAIL);
    closeButtonRef.current?.focus();
  }, [invoice.id]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

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
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Invoice ${invoice.invoice_number} details`}
      className="flex h-full flex-col bg-white"
    >
      <div className="flex items-center justify-between border-b border-slate-200 px-5 py-4">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-charcoal/50">Invoice details</h2>
        <button
          ref={closeButtonRef}
          type="button"
          onClick={onClose}
          aria-label="Close invoice details"
          className="rounded-lg p-1.5 text-charcoal/40 hover:bg-slate-100 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
        >
          <CloseIcon />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-display text-xl font-bold text-charcoal">{invoice.invoice_number}</h3>
          <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${statusTone(invoice)}`}>
            {statusLabel(invoice)}
          </span>
        </div>

        <dl className="grid grid-cols-[auto,1fr] gap-x-4 gap-y-2.5 text-sm">
          <dt className="text-charcoal/50">Family</dt>
          <dd className="text-charcoal">{invoice.bill_payer_name}</dd>

          <dt className="text-charcoal/50">{invoice.line_items.length === 1 ? "Child" : "Children"}</dt>
          <dd className="text-charcoal">
            {invoice.line_items.length > 0 ? invoice.line_items.map((li) => li.child_name).join(", ") : "—"}
          </dd>

          <dt className="text-charcoal/50">Billing period</dt>
          <dd className="text-charcoal">{billingPeriodLabel(invoice.week_start_date)}</dd>

          <dt className="text-charcoal/50">Due date</dt>
          <dd className="text-charcoal">{invoice.due_date ? formatDate(invoice.due_date) : "—"}</dd>

          {invoice.sent_at && (
            <>
              <dt className="text-charcoal/50">Sent</dt>
              <dd className="text-charcoal">
                {formatDate(invoice.sent_at.slice(0, 10))} to {invoice.sent_to_email}
              </dd>
            </>
          )}

          {invoice.paid_at && (
            <>
              <dt className="text-charcoal/50">Paid</dt>
              <dd className="text-charcoal">{formatDate(invoice.paid_at.slice(0, 10))}</dd>
            </>
          )}
        </dl>

        <div className="my-5 border-t border-slate-200" />

        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Line items</h4>
        <div className="flex flex-col">
          {invoice.line_items.map((li) => (
            <div key={li.id} className="flex items-start justify-between gap-3 border-b border-slate-100 py-2.5 text-sm last:border-0">
              <div>
                <p className="text-charcoal">{li.child_name}</p>
                <p className="text-xs text-charcoal/50">
                  {li.room_name ?? "No room on file"}
                  {li.is_estimated && " · estimated"}
                  {li.winz_payment > 0 && ` · WINZ ${formatCurrency(li.winz_payment)} of ${formatCurrency(li.fee_total)}`}
                </p>
              </div>
              <p className="shrink-0 font-medium text-charcoal">{formatCurrency(li.parent_pays)}</p>
            </div>
          ))}
          {invoice.line_items.length === 0 && <p className="py-2 text-sm text-charcoal/40">No line items.</p>}
        </div>

        <div className="my-3 border-t border-slate-200" />

        <div className="flex items-center justify-between py-1 text-sm">
          <p className="text-charcoal/60">Total</p>
          <p className="font-display text-lg font-bold text-charcoal">{formatCurrency(invoice.total_due)}</p>
        </div>
        <div className="mt-1 flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2.5 text-sm">
          <p className="text-charcoal/60">{invoice.status === "void" ? "Voided" : "Balance owed"}</p>
          <p className="font-semibold text-charcoal">{balanceLabel(invoice)}</p>
        </div>

        {invoice.status === "draft" && (
          <div className="mt-4 rounded-lg border border-dashed border-slate-300 px-3 py-2.5 text-xs text-charcoal/50">
            Not yet sent — nothing is owed by {invoice.bill_payer_name} until this invoice is sent.
          </div>
        )}

        {error && <p className="mt-4 rounded-lg bg-status-actionBg px-3 py-2 text-xs text-status-action">{error}</p>}

        {invoice.status === "draft" && showTestSend && (
          <div className="mt-4 flex flex-col gap-2 rounded-lg bg-slate-50 px-3 py-3">
            <p className="text-xs text-charcoal/50">
              Sends this exact invoice email to the address below instead of {invoice.bill_payer_name}&apos;s real
              one, and still marks it Unpaid so you can test Statements and Xero sync. Void it afterwards if you
              don&apos;t want it sitting as something a real family owes.
            </p>
            <div className="flex gap-2">
              <input
                type="email"
                value={testEmail}
                onChange={(e) => setTestEmail(e.target.value)}
                placeholder="your@email.com"
                className="min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-charcoal"
              />
              <button
                type="button"
                disabled={pending}
                onClick={() => run(() => sendTestInvoiceEmail(invoice.id, testEmail))}
                className={BTN_GHOST_SM + " border border-slate-300"}
              >
                {pending ? "Sending…" : "Send test"}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col gap-2 border-t border-slate-200 px-5 py-4">
        <div className="flex gap-2">
          <button type="button" onClick={() => window.print()} className={BTN_WHITE + " flex-1"}>
            View invoice
          </button>
          {invoice.status === "sent" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => markInvoicePaid(invoice.id, true))}
              className={BTN_BLACK + " flex-1"}
            >
              {pending ? "Saving…" : "Record payment"}
            </button>
          )}
          {invoice.status === "draft" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => sendInvoice(invoice.id))}
              className={BTN_BLACK + " flex-1"}
            >
              {pending ? "Sending…" : "Send invoice"}
            </button>
          )}
        </div>

        {invoice.status !== "void" && (
        <div className="flex flex-wrap justify-end gap-1">
          {invoice.status === "draft" && (
            <button type="button" disabled={pending} onClick={() => setShowTestSend((v) => !v)} className={BTN_GHOST_SM}>
              {showTestSend ? "Hide test send" : "Send test email…"}
            </button>
          )}
          {(invoice.status === "draft" || invoice.status === "sent") && (
            <button type="button" disabled={pending} onClick={() => run(() => voidInvoice(invoice.id))} className={BTN_GHOST_SM}>
              Void invoice
            </button>
          )}
          {invoice.status === "paid" && (
            <button
              type="button"
              disabled={pending}
              onClick={() => run(() => markInvoicePaid(invoice.id, false))}
              className={BTN_GHOST_SM}
            >
              Undo — mark unpaid
            </button>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

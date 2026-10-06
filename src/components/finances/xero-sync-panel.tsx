"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Invoice, XeroReceivedPayment, XeroSyncResult } from "@/lib/types";
import { formatCurrency, formatShortDate } from "@/lib/utils";
import { syncXeroPayments, confirmXeroMatch } from "@/lib/actions/xero";

/** Pulls recent "money received" transactions from the connected Xero bank
 * account and proposes matches against outstanding invoices, purely by
 * amount. Nothing is written to the database until you click Confirm on a
 * specific pairing — this panel only ever shows a preview. */
export function XeroSyncPanel() {
  const router = useRouter();
  const [result, setResult] = useState<XeroSyncResult | null>(null);
  const [syncPending, startSync] = useTransition();
  const [syncError, setSyncError] = useState<string | null>(null);
  const [confirmingKey, setConfirmingKey] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);

  function handleSync() {
    setSyncError(null);
    startSync(async () => {
      try {
        const next = await syncXeroPayments();
        setResult(next);
      } catch (err) {
        setSyncError(err instanceof Error ? err.message : "Could not sync with Xero.");
      }
    });
  }

  function handleConfirm(key: string, invoice: Invoice, payment: XeroReceivedPayment) {
    setConfirmError(null);
    setConfirmingKey(key);
    startSync(async () => {
      try {
        await confirmXeroMatch(invoice.id, payment);
        // Drop this payment/invoice out of the on-screen preview so it
        // can't be confirmed twice from a stale list — a fresh "Sync now"
        // will reflect the real state either way.
        setResult((prev) =>
          prev
            ? {
                ...prev,
                confidentMatches: prev.confidentMatches.filter((m) => m.invoice.id !== invoice.id),
                ambiguousMatches: prev.ambiguousMatches
                  .map((m) => ({ ...m, candidates: m.candidates.filter((c) => c.id !== invoice.id) }))
                  .filter((m) => m.payment.bankTransactionId !== payment.bankTransactionId),
              }
            : prev
        );
        router.refresh();
      } catch (err) {
        setConfirmError(err instanceof Error ? err.message : "Could not confirm this match.");
      } finally {
        setConfirmingKey(null);
      }
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm text-charcoal/60">
          Checks the last ~100 transactions in your connected account and matches them against outstanding invoices
          by amount.
        </p>
        <button type="button" onClick={handleSync} disabled={syncPending} className="btn-primary whitespace-nowrap">
          {syncPending && !confirmingKey ? "Syncing…" : "Sync now"}
        </button>
      </div>

      {syncError && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{syncError}</p>}
      {confirmError && (
        <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{confirmError}</p>
      )}

      {result && (
        <div className="flex flex-col gap-5">
          <p className="text-xs text-charcoal/40">
            Synced {formatShortDate(result.syncedAt.slice(0, 10))} at{" "}
            {new Date(result.syncedAt).toLocaleTimeString("en-NZ", { hour: "2-digit", minute: "2-digit" })}.
          </p>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
              Ready to confirm ({result.confidentMatches.length})
            </h3>
            {result.confidentMatches.length === 0 ? (
              <p className="text-sm text-charcoal/50">No one-to-one matches right now.</p>
            ) : (
              result.confidentMatches.map(({ invoice, payment }) => {
                const key = `confident-${invoice.id}`;
                return (
                  <div key={key} className="card flex flex-wrap items-center justify-between gap-3 p-4">
                    <div>
                      <p className="text-sm font-medium text-charcoal">
                        {invoice.bill_payer_name} — {invoice.invoice_number}
                      </p>
                      <p className="text-xs text-charcoal/50">
                        Xero: {formatShortDate(payment.date)}
                        {payment.contactName ? ` · ${payment.contactName}` : ""}
                        {payment.reference ? ` · "${payment.reference}"` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <p className="font-display text-lg font-bold text-charcoal">{formatCurrency(payment.amount)}</p>
                      <button
                        type="button"
                        disabled={syncPending}
                        onClick={() => handleConfirm(key, invoice, payment)}
                        className="btn-primary px-3 py-1.5 text-xs"
                      >
                        {confirmingKey === key ? "Confirming…" : "Confirm paid"}
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
              Needs you to pick ({result.ambiguousMatches.length})
            </h3>
            {result.ambiguousMatches.length === 0 ? (
              <p className="text-sm text-charcoal/50">Nothing ambiguous right now.</p>
            ) : (
              result.ambiguousMatches.map((am) => (
                <div key={am.payment.bankTransactionId} className="card flex flex-col gap-3 p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm text-charcoal/70">
                      A {formatCurrency(am.payment.amount)} payment on {formatShortDate(am.payment.date)}
                      {am.payment.contactName ? ` from ${am.payment.contactName}` : ""}
                      {am.payment.reference ? ` ("${am.payment.reference}")` : ""} matches{" "}
                      {am.candidates.length} outstanding invoices at that amount — pick which one:
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {am.candidates.map((candidate) => {
                      const key = `ambiguous-${am.payment.bankTransactionId}-${candidate.id}`;
                      return (
                        <button
                          key={candidate.id}
                          type="button"
                          disabled={syncPending}
                          onClick={() => handleConfirm(key, candidate, am.payment)}
                          className="btn-secondary px-3 py-1.5 text-xs"
                        >
                          {confirmingKey === key
                            ? "Confirming…"
                            : `${candidate.bill_payer_name} — ${candidate.invoice_number}`}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))
            )}
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
              Unmatched Xero payments ({result.unmatchedPayments.length})
            </h3>
            {result.unmatchedPayments.length === 0 ? (
              <p className="text-sm text-charcoal/50">None.</p>
            ) : (
              <div className="card divide-y divide-sand-100 p-0">
                {result.unmatchedPayments.map((p) => (
                  <div key={p.bankTransactionId} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="text-charcoal/70">
                      {formatShortDate(p.date)}
                      {p.contactName ? ` · ${p.contactName}` : ""}
                      {p.reference ? ` · "${p.reference}"` : ""}
                    </span>
                    <span className="font-medium text-charcoal">{formatCurrency(p.amount)}</span>
                  </div>
                ))}
              </div>
            )}
            <p className="text-xs text-charcoal/40">
              No outstanding invoice currently shares this amount — could be an overpayment, a deposit from before
              this feature existed, or something unrelated to fees. Nothing happens to these automatically.
            </p>
          </section>

          <section className="flex flex-col gap-2">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
              Outstanding invoices with no payment found ({result.unmatchedInvoices.length})
            </h3>
            {result.unmatchedInvoices.length === 0 ? (
              <p className="text-sm text-charcoal/50">None.</p>
            ) : (
              <div className="card divide-y divide-sand-100 p-0">
                {result.unmatchedInvoices.map((inv) => (
                  <div key={inv.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <span className="text-charcoal/70">
                      {inv.bill_payer_name} — {inv.invoice_number}
                    </span>
                    <span className="font-medium text-charcoal">{formatCurrency(inv.total_due)}</span>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

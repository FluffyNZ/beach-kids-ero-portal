"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { sendPeriodStatement } from "@/lib/actions/statements";
import { formatCurrency } from "@/lib/utils";
import { fmtRange } from "@/lib/finance-format";

/** Send controls beside a statement preview. Sending always goes through a
 * confirmation that names the recipient, period and closing balance. */
export function SendStatementPanel({
  billPayerId,
  accountName,
  recipient,
  from,
  to,
  closing,
  entryCount,
}: {
  billPayerId: string;
  accountName: string;
  recipient: string | null;
  from: string;
  to: string;
  closing: number;
  entryCount: number;
}) {
  const router = useRouter();
  const busy = useRef(false);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{ kind: "success" | "error"; message: string } | null>(null);

  async function send() {
    if (busy.current || !recipient) return;
    busy.current = true;
    setSaving(true);
    setResult(null);
    const res = await sendPeriodStatement({ billPayerId, from, to, expectedRecipient: recipient, expectedClosing: closing });
    busy.current = false;
    setSaving(false);
    setOpen(false);
    setResult(res.success ? { kind: "success", message: `Statement sent to ${res.recipient}.` } : { kind: "error", message: res.error });
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-4 sm:p-5 print:hidden">
      <h2 className="text-base font-semibold text-charcoal">Send or print</h2>
      <dl className="grid grid-cols-[5.5rem_1fr] gap-x-3 gap-y-1.5 text-sm">
        <dt className="text-charcoal/70">To</dt>
        <dd className="min-w-0 break-words text-charcoal">{recipient ?? "No email on file"}</dd>
        <dt className="text-charcoal/70">Period</dt>
        <dd className="text-charcoal">{fmtRange(from, to)}</dd>
        <dt className="text-charcoal/70">Closing</dt>
        <dd className="font-semibold tabular-nums text-charcoal">{formatCurrency(closing)}</dd>
      </dl>

      {result && (
        <p role={result.kind === "error" ? "alert" : "status"} className={result.kind === "error" ? "rounded-xl border border-status-action/40 bg-status-actionBg px-3 py-2 text-sm text-charcoal" : "rounded-xl bg-status-readyBg px-3 py-2 text-sm text-charcoal"}>
          {result.message}
        </p>
      )}

      <div className="flex flex-wrap gap-2">
        {recipient ? (
          <button type="button" className="btn-primary" onClick={() => setOpen(true)}>
            Send statement…
          </button>
        ) : (
          <Link href={`/finances/clients/${billPayerId}`} className="btn-primary">
            Add an email address
          </Link>
        )}
        <button type="button" className="btn-secondary" onClick={() => window.print()}>
          Print
        </button>
      </div>
      {entryCount === 0 && <p className="text-xs text-charcoal/70">There are no charges or payments in this period — the statement only shows balances.</p>}

      <Modal open={open} onClose={() => !saving && setOpen(false)} title="Send this statement?">
        <div className="flex flex-col gap-4">
          <dl className="grid grid-cols-[7rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-charcoal/70">Family account</dt>
            <dd className="text-charcoal">{accountName}</dd>
            <dt className="text-charcoal/70">Recipient</dt>
            <dd className="break-words font-medium text-charcoal">{recipient}</dd>
            <dt className="text-charcoal/70">Period</dt>
            <dd className="text-charcoal">{fmtRange(from, to)}</dd>
            <dt className="text-charcoal/70">Closing balance</dt>
            <dd className="font-semibold tabular-nums text-charcoal">{formatCurrency(closing)}</dd>
          </dl>
          <p className="text-sm text-charcoal/70">The email contains the statement shown in the preview and is recorded in this family account&apos;s history.</p>
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={saving} onClick={send}>
              {saving ? "Sending…" : `Send to ${recipient}`}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}

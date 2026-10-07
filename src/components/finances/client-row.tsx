"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Modal } from "@/components/ui/modal";
import { updateBillPayer } from "@/lib/actions/bill-payers";
import { formatCurrency } from "@/lib/utils";
import type { BillPayerSummary } from "@/lib/data/bill-payers";

/** One client (bill payer) card — who they're billed for, what they
 * currently owe, and an Edit modal that's also the fix for a real dead
 * end: invoices/statements refuse to send with "no email on file", and
 * until now there was nowhere in the app to actually add one. */
export function ClientRow({ client }: { client: BillPayerSummary }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await updateBillPayer(client.id, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setEditing(false);
      router.refresh();
    });
  }

  return (
    <div className="card flex flex-col gap-3 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="font-display text-lg font-semibold text-charcoal">{client.full_name}</h3>
          <p className="text-xs text-charcoal/50">
            {client.activeChildrenCount > 0
              ? `Billed for ${client.childNames.join(", ")}`
              : "No active children currently billed"}
          </p>
        </div>
        <p
          className={`font-display text-lg font-bold ${
            client.totalOwing > 0 ? "text-status-attention" : "text-charcoal"
          }`}
        >
          {formatCurrency(client.totalOwing)}
        </p>
      </div>

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm text-charcoal/70">
        {client.email ? <span>{client.email}</span> : <span className="text-status-action">No email on file</span>}
        {client.phone && <span>{client.phone}</span>}
        {client.address && <span className="text-charcoal/50">{client.address}</span>}
      </div>

      <div className="flex justify-end gap-2">
        <Link href="/finances/statements" className="btn-ghost px-3 py-1.5 text-xs">
          View statements
        </Link>
        <button type="button" onClick={() => setEditing(true)} className="btn-ghost px-3 py-1.5 text-xs">
          Edit
        </button>
      </div>

      <Modal open={editing} onClose={() => setEditing(false)} title={`Edit ${client.full_name}`}>
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor={`full_name_${client.id}`}>
              Full name
            </label>
            <input
              id={`full_name_${client.id}`}
              name="full_name"
              type="text"
              required
              defaultValue={client.full_name}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor={`email_${client.id}`}>
              Email
            </label>
            <input id={`email_${client.id}`} name="email" type="email" defaultValue={client.email ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`phone_${client.id}`}>
              Phone
            </label>
            <input id={`phone_${client.id}`} name="phone" type="text" defaultValue={client.phone ?? ""} className="input" />
          </div>
          <div>
            <label className="label" htmlFor={`address_${client.id}`}>
              Address
            </label>
            <input
              id={`address_${client.id}`}
              name="address"
              type="text"
              defaultValue={client.address ?? ""}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor={`notes_${client.id}`}>
              Notes
            </label>
            <textarea id={`notes_${client.id}`} name="notes" rows={2} defaultValue={client.notes ?? ""} className="input" />
          </div>

          {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setEditing(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

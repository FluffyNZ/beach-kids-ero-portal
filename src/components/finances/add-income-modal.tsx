"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { addIncome } from "@/lib/actions/finances";
import { PlusIcon } from "@/components/icons";
import { FINANCE_INCOME_SOURCE_LABEL } from "@/lib/constants";
import type { FinanceIncomeSource } from "@/lib/supabase/database.types";

const SOURCES: FinanceIncomeSource[] = ["moe_funding", "parent_invoice", "other"];

export function AddIncomeModal() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [alreadyReceived, setAlreadyReceived] = useState(false);

  function handleClose() {
    setOpen(false);
    setError(null);
    setAlreadyReceived(false);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const gstRaw = String(formData.get("gst_amount") ?? "").trim();

    startTransition(async () => {
      try {
        await addIncome({
          income_date: String(formData.get("income_date") ?? ""),
          source: (String(formData.get("source") ?? "other") as FinanceIncomeSource),
          payer_name: String(formData.get("payer_name") ?? ""),
          description: String(formData.get("description") ?? ""),
          invoice_number: String(formData.get("invoice_number") ?? ""),
          amount,
          gst_amount: gstRaw !== "" ? Number(gstRaw) : null,
          due_date: String(formData.get("due_date") ?? "") || null,
          notes: String(formData.get("notes") ?? ""),
          received_date: alreadyReceived
            ? String(formData.get("received_date") ?? "") || String(formData.get("income_date") ?? "")
            : null,
        });
        formRef.current?.reset();
        handleClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong adding this income record.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        <PlusIcon className="h-4 w-4" />
        Add income
      </button>

      <Modal open={open} onClose={handleClose} title="Add income">
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="income_date">
                Date
              </label>
              <input id="income_date" name="income_date" type="date" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="source">
                Source
              </label>
              <select id="source" name="source" className="input" defaultValue="other">
                {SOURCES.map((s) => (
                  <option key={s} value={s}>
                    {FINANCE_INCOME_SOURCE_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="payer_name">
                From
              </label>
              <input id="payer_name" name="payer_name" type="text" className="input" placeholder="e.g. Ministry of Education" />
            </div>
            <div>
              <label className="label" htmlFor="amount">
                Amount ($)
              </label>
              <input id="amount" name="amount" type="number" min={0.01} step="0.01" required className="input" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="description">
              Description
            </label>
            <input id="description" name="description" type="text" className="input" placeholder="Optional" />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="invoice_number">
                Invoice number — optional
              </label>
              <input id="invoice_number" name="invoice_number" type="text" className="input" />
            </div>
            <div>
              <label className="label" htmlFor="gst_amount">
                GST amount ($) — optional
              </label>
              <input id="gst_amount" name="gst_amount" type="number" min={0} step="0.01" className="input" />
            </div>
          </div>

          <div>
            <label className="label" htmlFor="due_date">
              Due date — optional
            </label>
            <input id="due_date" name="due_date" type="date" className="input" />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border border-sand-200 p-3">
            <label className="flex items-center gap-2 text-sm font-medium text-charcoal">
              <input
                type="checkbox"
                checked={alreadyReceived}
                onChange={(e) => setAlreadyReceived(e.target.checked)}
                className="h-4 w-4"
              />
              This has already been received
            </label>
            {alreadyReceived && (
              <div>
                <label className="label" htmlFor="received_date">
                  Date received
                </label>
                <input id="received_date" name="received_date" type="date" className="input" />
                <p className="mt-1 text-xs text-charcoal/50">Leave blank to use the date above.</p>
              </div>
            )}
          </div>

          <div>
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={2} className="input" placeholder="Optional" />
          </div>

          {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={handleClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Adding…" : "Add income"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { addOutgoing } from "@/lib/actions/finances";
import { PlusIcon } from "@/components/icons";
import { FINANCE_OUTGOING_CATEGORY_SUGGESTIONS } from "@/lib/constants";

export function AddOutgoingModal() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClose() {
    setOpen(false);
    setError(null);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const amount = Number(formData.get("amount"));
    const gstRaw = String(formData.get("gst_amount") ?? "").trim();

    startTransition(async () => {
      try {
        await addOutgoing({
          expense_date: String(formData.get("expense_date") ?? ""),
          supplier: String(formData.get("supplier") ?? ""),
          category: String(formData.get("category") ?? ""),
          description: String(formData.get("description") ?? ""),
          amount,
          gst_amount: gstRaw !== "" ? Number(gstRaw) : null,
          due_date: String(formData.get("due_date") ?? "") || null,
          notes: String(formData.get("notes") ?? ""),
        });
        formRef.current?.reset();
        handleClose();
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong adding this outgoing.");
      }
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        <PlusIcon className="h-4 w-4" />
        Add outgoing
      </button>

      <Modal open={open} onClose={handleClose} title="Add outgoing">
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="expense_date">
                Date
              </label>
              <input id="expense_date" name="expense_date" type="date" required className="input" />
            </div>
            <div>
              <label className="label" htmlFor="amount">
                Amount ($, GST inclusive)
              </label>
              <input id="amount" name="amount" type="number" min={0.01} step="0.01" required className="input" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label" htmlFor="supplier">
                Supplier
              </label>
              <input id="supplier" name="supplier" type="text" className="input" placeholder="e.g. Gilmours" />
            </div>
            <div>
              <label className="label" htmlFor="category">
                Category
              </label>
              <input id="category" name="category" type="text" list="outgoing-categories" className="input" placeholder="e.g. Power" />
              <datalist id="outgoing-categories">
                {FINANCE_OUTGOING_CATEGORY_SUGGESTIONS.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
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
              <label className="label" htmlFor="gst_amount">
                GST amount ($) — optional
              </label>
              <input id="gst_amount" name="gst_amount" type="number" min={0} step="0.01" className="input" placeholder="For your own records" />
            </div>
            <div>
              <label className="label" htmlFor="due_date">
                Due date — optional
              </label>
              <input id="due_date" name="due_date" type="date" className="input" />
            </div>
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
              {pending ? "Adding…" : "Add outgoing"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { createBillPayer } from "@/lib/actions/bill-payers";

/** The "+ Add client" entry point on /finances/clients — creates a bill
 * payer directly with full contact details, rather than the old only
 * path (typing a name while adding a child, which never captured email,
 * phone or address at all). */
export function AddClientButton() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createBillPayer(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      setOpen(false);
      router.refresh();
    });
  }

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className="btn-primary">
        + Add client
      </button>
      <Modal open={open} onClose={() => setOpen(false)} title="Add client">
        <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="label" htmlFor="full_name">
              Full name
            </label>
            <input id="full_name" name="full_name" type="text" required className="input" placeholder="e.g. Jane Smith" />
          </div>
          <div>
            <label className="label" htmlFor="email">
              Email
            </label>
            <input id="email" name="email" type="email" className="input" placeholder="e.g. jane@example.com" />
          </div>
          <div>
            <label className="label" htmlFor="phone">
              Phone
            </label>
            <input id="phone" name="phone" type="text" className="input" placeholder="e.g. 027 123 4567" />
          </div>
          <div>
            <label className="label" htmlFor="address">
              Address
            </label>
            <input id="address" name="address" type="text" className="input" placeholder="Optional" />
          </div>
          <div>
            <label className="label" htmlFor="notes">
              Notes
            </label>
            <textarea id="notes" name="notes" rows={2} className="input" placeholder="Optional" />
          </div>

          {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setOpen(false)} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Adding…" : "Add client"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

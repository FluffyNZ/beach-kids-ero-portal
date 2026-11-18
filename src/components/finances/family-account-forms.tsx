"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { createBillPayer, updateBillPayer } from "@/lib/actions/bill-payers";
import type { BillPayer } from "@/lib/types";

const label = "mb-1.5 block text-sm font-medium text-charcoal";

function Fields({ account }: { account?: Partial<BillPayer> }) {
  return (
    <>
      <div>
        <label className={label} htmlFor="fa-name">
          Name
        </label>
        <input id="fa-name" name="full_name" required defaultValue={account?.full_name ?? ""} className="input" autoComplete="off" />
      </div>
      <div>
        <label className={label} htmlFor="fa-email">
          Email
        </label>
        <input id="fa-email" name="email" type="email" defaultValue={account?.email ?? ""} className="input" autoComplete="off" />
        <p className="mt-1 text-xs text-charcoal/70">Invoices and statements are emailed here.</p>
      </div>
      <div>
        <label className={label} htmlFor="fa-phone">
          Phone
        </label>
        <input id="fa-phone" name="phone" defaultValue={account?.phone ?? ""} className="input" autoComplete="off" />
      </div>
      <div>
        <label className={label} htmlFor="fa-address">
          Address
        </label>
        <input id="fa-address" name="address" defaultValue={account?.address ?? ""} className="input" autoComplete="off" />
      </div>
      <div>
        <label className={label} htmlFor="fa-notes">
          Notes
        </label>
        <textarea id="fa-notes" name="notes" rows={2} defaultValue={account?.notes ?? ""} className="input" />
      </div>
    </>
  );
}

function useSubmit(action: (fd: FormData) => Promise<{ success: true } | { success: false; error: string }>, onDone: () => void) {
  const router = useRouter();
  const busy = useRef(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy.current) return;
    busy.current = true;
    setSaving(true);
    setError(null);
    const result = await action(new FormData(e.currentTarget));
    busy.current = false;
    setSaving(false);
    if (!result.success) {
      setError(result.error);
      return;
    }
    onDone();
    router.refresh();
  }
  return { submit, saving, error, setError };
}

export function EditFamilyAccountButton({ account }: { account: BillPayer }) {
  const [open, setOpen] = useState(false);
  const { submit, saving, error, setError } = useSubmit((fd) => updateBillPayer(account.id, fd), () => setOpen(false));
  return (
    <>
      <button type="button" className="btn-secondary" onClick={() => { setError(null); setOpen(true); }}>
        Edit details
      </button>
      <Modal open={open} onClose={() => !saving && setOpen(false)} title="Edit family account">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Fields account={account} />
          {error && <p role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-3 py-2 text-sm text-charcoal">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Saving…" : "Save changes"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

export function AddFamilyAccountButton() {
  const [open, setOpen] = useState(false);
  const { submit, saving, error, setError } = useSubmit(async (fd) => {
    const r = await createBillPayer(fd);
    return r.success ? { success: true as const } : r;
  }, () => setOpen(false));
  return (
    <>
      <button type="button" className="btn-primary" onClick={() => { setError(null); setOpen(true); }}>
        Add family account
      </button>
      <Modal open={open} onClose={() => !saving && setOpen(false)} title="Add family account">
        <form onSubmit={submit} className="flex flex-col gap-4">
          <Fields />
          <p className="text-xs text-charcoal/70">Link children to this family account from each child&apos;s profile.</p>
          {error && <p role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-3 py-2 text-sm text-charcoal">{error}</p>}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" disabled={saving} onClick={() => setOpen(false)}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={saving}>
              {saving ? "Adding…" : "Add family account"}
            </button>
          </div>
        </form>
      </Modal>
    </>
  );
}

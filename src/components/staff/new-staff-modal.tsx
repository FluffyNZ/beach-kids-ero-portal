"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { createStaffMember } from "@/lib/actions/staff";
import { STAFF_CONTRACT_TYPES, STAFF_CONTRACT_TYPE_LABEL } from "@/lib/constants";

export function NewStaffModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createStaffMember(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      onClose();
      router.push(`/staff/${result.staffId}`);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add staff member">
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="full_name">
            Full name
          </label>
          <input id="full_name" name="full_name" type="text" required className="input" placeholder="e.g. Jane Smith" />
        </div>

        <div>
          <label className="label" htmlFor="role">
            Role
          </label>
          <input id="role" name="role" type="text" className="input" placeholder="e.g. Head Teacher" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="start_date">
              Start date
            </label>
            <input id="start_date" name="start_date" type="date" className="input" />
          </div>
          <div>
            <label className="label" htmlFor="contract_type">
              Contract type
            </label>
            <select id="contract_type" name="contract_type" className="input">
              <option value="">Not set</option>
              {STAFF_CONTRACT_TYPES.map((c) => (
                <option key={c} value={c}>
                  {STAFF_CONTRACT_TYPE_LABEL[c]}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

        <p className="text-xs text-charcoal/40">
          Only add real staff members here — this creates a profile you&apos;ll then upload their real documents to.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Adding…" : "Add staff member"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

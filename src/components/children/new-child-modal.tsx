"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { createChild } from "@/lib/actions/children";
import type { RosterRoom } from "@/lib/types";

export function NewChildModal({
  open,
  onClose,
  rooms,
  billPayerOptions,
}: {
  open: boolean;
  onClose: () => void;
  rooms: RosterRoom[];
  billPayerOptions: Array<{ id: string; full_name: string }>;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createChild(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      onClose();
      router.push(`/children/${result.childId}`);
    });
  }

  return (
    <Modal open={open} onClose={onClose} title="Add child">
      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="full_name">
            Full name
          </label>
          <input id="full_name" name="full_name" type="text" required className="input" placeholder="e.g. Jane Smith" />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="age_years">
              Age — years
            </label>
            <input id="age_years" name="age_years" type="number" min={0} className="input" placeholder="e.g. 2" />
          </div>
          <div>
            <label className="label" htmlFor="age_months">
              Age — months
            </label>
            <input id="age_months" name="age_months" type="number" min={0} max={11} className="input" placeholder="e.g. 6" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="room_id">
            Room
          </label>
          <select id="room_id" name="room_id" className="input">
            <option value="">Not set</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="bill_payer_name">
            Bill payer
          </label>
          <input
            id="bill_payer_name"
            name="bill_payer_name"
            type="text"
            list="bill-payer-options"
            className="input"
            placeholder="e.g. Jane Smith — start typing to match an existing bill payer"
          />
          <datalist id="bill-payer-options">
            {billPayerOptions.map((b) => (
              <option key={b.id} value={b.full_name} />
            ))}
          </datalist>
          <p className="mt-1 text-xs text-charcoal/40">
            Typing a name that matches an existing bill payer links to them (useful for siblings) — anything else
            creates a new bill payer.
          </p>
        </div>

        <p className="rounded-lg bg-sand-50 px-3 py-2 text-xs text-charcoal/60">
          20 Hours ECE eligibility is set automatically once you save — every child aged 3 and over gets it,
          capped at 6 hours a day.
        </p>

        <div>
          <label className="label" htmlFor="special_weekly_override">
            Special weekly rate override ($) — optional
          </label>
          <input
            id="special_weekly_override"
            name="special_weekly_override"
            type="number"
            min={0}
            step="0.01"
            className="input"
            placeholder="Leave blank unless there's an agreed special rate"
          />
        </div>

        <div>
          <label className="label" htmlFor="notes">
            Notes
          </label>
          <textarea id="notes" name="notes" rows={2} className="input" placeholder="Optional" />
        </div>

        {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

        <p className="text-xs text-charcoal/40">
          Only add real children here — this creates a profile you&apos;ll then build fee and enrolment details on.
        </p>

        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Adding…" : "Add child"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

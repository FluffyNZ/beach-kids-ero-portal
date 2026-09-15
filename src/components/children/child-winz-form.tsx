"use client";

import { useState, useTransition } from "react";
import type { ChildWinzSubsidy } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export function ChildWinzForm({
  subsidy,
  onSave,
}: {
  subsidy: ChildWinzSubsidy | null;
  onSave: (fields: {
    caregiver_name?: string | null;
    weekly_cca_hours?: number | null;
    weekly_payment?: number | null;
    renewal_date?: string | null;
    notes?: string | null;
  }) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [caregiverName, setCaregiverName] = useState(subsidy?.caregiver_name ?? "");
  const [ccaHours, setCcaHours] = useState(subsidy?.weekly_cca_hours !== null && subsidy?.weekly_cca_hours !== undefined ? String(subsidy.weekly_cca_hours) : "");
  const [payment, setPayment] = useState(subsidy?.weekly_payment !== null && subsidy?.weekly_payment !== undefined ? String(subsidy.weekly_payment) : "");
  const [renewalDate, setRenewalDate] = useState(subsidy?.renewal_date ?? "");
  const [notes, setNotes] = useState(subsidy?.notes ?? "");

  function markDirty() {
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-4">
      {subsidy?.updated_at && (
        <p className="text-xs text-charcoal/40">Last updated {formatDate(subsidy.updated_at)}.</p>
      )}

      <div>
        <label className="label">Caregiver name on the WINZ statement</label>
        <input
          className="input"
          placeholder="May differ slightly from the bill payer's name — kept as WINZ has it"
          value={caregiverName}
          onChange={(e) => {
            setCaregiverName(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Weekly CCA hours</label>
          <input
            type="number"
            min={0}
            step="0.5"
            className="input"
            value={ccaHours}
            onChange={(e) => {
              setCcaHours(e.target.value);
              markDirty();
            }}
          />
        </div>
        <div>
          <label className="label">Weekly payment ($)</label>
          <input
            type="number"
            min={0}
            step="0.01"
            className="input"
            value={payment}
            onChange={(e) => {
              setPayment(e.target.value);
              markDirty();
            }}
          />
        </div>
      </div>

      <div>
        <label className="label">Renewal date</label>
        <input
          type="date"
          className="input"
          value={renewalDate}
          onChange={(e) => {
            setRenewalDate(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div>
        <label className="label">Notes</label>
        <input
          className="input"
          placeholder="Optional"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            markDirty();
          }}
        />
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

      <p className="text-xs text-charcoal/40">
        Clearing every field and saving removes this child&apos;s WINZ subsidy record.
      </p>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          className="btn-primary"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await onSave({
                  caregiver_name: caregiverName || null,
                  weekly_cca_hours: ccaHours !== "" ? Number(ccaHours) : null,
                  weekly_payment: payment !== "" ? Number(payment) : null,
                  renewal_date: renewalDate || null,
                  notes: notes || null,
                });
                setSaved(true);
              } catch (err) {
                setSaved(false);
                setError(err instanceof Error ? err.message : "Something went wrong saving the WINZ subsidy.");
              }
            })
          }
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

"use client";

import { useId, useState } from "react";
import type { ChildWinzSubsidy } from "@/lib/types";
import { formatNzDate } from "@/lib/child-format";
import { SaveStatus, FormError, useSaveState } from "@/components/ui/save-status";

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
  const id = useId();
  const save = useSaveState();
  const [caregiverName, setCaregiverName] = useState(subsidy?.caregiver_name ?? "");
  const [ccaHours, setCcaHours] = useState(
    subsidy?.weekly_cca_hours !== null && subsidy?.weekly_cca_hours !== undefined ? String(subsidy.weekly_cca_hours) : ""
  );
  const [payment, setPayment] = useState(
    subsidy?.weekly_payment !== null && subsidy?.weekly_payment !== undefined ? String(subsidy.weekly_payment) : ""
  );
  const [renewalDate, setRenewalDate] = useState(subsidy?.renewal_date ?? "");
  const [notes, setNotes] = useState(subsidy?.notes ?? "");
  const [validation, setValidation] = useState<string | null>(null);

  const fieldLabel = "mb-1.5 block text-sm font-medium text-charcoal";

  function change<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      save.markDirty();
    };
  }

  async function handleSave() {
    const hours = ccaHours !== "" ? Number(ccaHours) : null;
    const pay = payment !== "" ? Number(payment) : null;
    if ((hours !== null && (Number.isNaN(hours) || hours < 0)) || (pay !== null && (Number.isNaN(pay) || pay < 0))) {
      setValidation("Hours and payment must be 0 or more.");
      save.setState("error");
      return;
    }
    setValidation(null);
    await save.run(
      () =>
        onSave({
          caregiver_name: caregiverName || null,
          weekly_cca_hours: hours,
          weekly_payment: pay,
          renewal_date: renewalDate || null,
          notes: notes || null,
        }),
      "Something went wrong saving the WINZ subsidy."
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {subsidy?.updated_at ? (
        <p className="text-xs text-charcoal/70">Last updated {formatNzDate(subsidy.updated_at)}</p>
      ) : (
        <p className="text-sm text-charcoal/70">No WINZ subsidy recorded for this child.</p>
      )}

      <div>
        <label htmlFor={`${id}-caregiver`} className={fieldLabel}>
          Caregiver name on the WINZ statement
        </label>
        <input
          id={`${id}-caregiver`}
          className="input"
          value={caregiverName}
          onChange={(e) => change(setCaregiverName)(e.target.value)}
        />
        <p className="mt-1 text-xs text-charcoal/70">Kept as WINZ has it — may differ slightly from the bill payer.</p>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor={`${id}-hours`} className={fieldLabel}>
            Weekly CCA hours
          </label>
          <input
            id={`${id}-hours`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.5"
            className="input"
            value={ccaHours}
            onChange={(e) => change(setCcaHours)(e.target.value)}
          />
        </div>
        <div>
          <label htmlFor={`${id}-payment`} className={fieldLabel}>
            Weekly payment ($)
          </label>
          <input
            id={`${id}-payment`}
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            className="input"
            value={payment}
            onChange={(e) => change(setPayment)(e.target.value)}
          />
        </div>
      </div>

      <div>
        <label htmlFor={`${id}-renewal`} className={fieldLabel}>
          Renewal date
        </label>
        <input
          id={`${id}-renewal`}
          type="date"
          className="input"
          value={renewalDate}
          onChange={(e) => change(setRenewalDate)(e.target.value)}
        />
      </div>

      <div>
        <label htmlFor={`${id}-notes`} className={fieldLabel}>
          Notes <span className="font-normal text-charcoal/70">(optional)</span>
        </label>
        <input id={`${id}-notes`} className="input" value={notes} onChange={(e) => change(setNotes)(e.target.value)} />
      </div>

      <p className="text-xs text-charcoal/70">Clearing every field and saving removes this child&apos;s WINZ subsidy record.</p>

      <FormError message={validation ?? save.error} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <SaveStatus state={save.state} />
        <button type="button" disabled={save.state === "saving"} className="btn-primary" onClick={handleSave}>
          {save.state === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

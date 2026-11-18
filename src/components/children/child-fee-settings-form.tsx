"use client";

import { useId, useState } from "react";
import { isEceEligible } from "@/lib/constants";
import { SaveStatus, FormError, useSaveState } from "@/components/ui/save-status";

/** Per-child fee settings that feed Finance → Fees. Nothing is calculated
 * here: 20 Hours ECE and the sibling discount are worked out automatically
 * (shown for reference), and the two overrides are stored for the fees
 * calculation to use. */
export function ChildFeeSettingsForm({
  hourlyRate: initialHourlyRate,
  ageYears,
  specialWeeklyOverride: initialSpecialWeeklyOverride,
  siblingDiscountEligible,
  onSave,
}: {
  hourlyRate: number | null;
  ageYears: number | null;
  specialWeeklyOverride: number | null;
  siblingDiscountEligible: boolean;
  onSave: (fields: { hourly_rate?: number | null; special_weekly_override?: number | null }) => Promise<void>;
}) {
  const id = useId();
  const save = useSaveState();
  const [hourlyRate, setHourlyRate] = useState(initialHourlyRate !== null ? String(initialHourlyRate) : "");
  const [specialOverride, setSpecialOverride] = useState(
    initialSpecialWeeklyOverride !== null ? String(initialSpecialWeeklyOverride) : ""
  );
  const [validation, setValidation] = useState<string | null>(null);

  const eceEligible = isEceEligible(ageYears);
  const fieldLabel = "mb-1.5 block text-sm font-medium text-charcoal";

  async function handleSave() {
    const rate = hourlyRate !== "" ? Number(hourlyRate) : null;
    const special = specialOverride !== "" ? Number(specialOverride) : null;
    if ((rate !== null && (Number.isNaN(rate) || rate < 0)) || (special !== null && (Number.isNaN(special) || special < 0))) {
      setValidation("Amounts must be 0 or more.");
      save.setState("error");
      return;
    }
    setValidation(null);
    await save.run(
      () => onSave({ hourly_rate: rate, special_weekly_override: special }),
      "Something went wrong saving these fee settings."
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label htmlFor={`${id}-rate`} className={fieldLabel}>
          Hourly rate override ($)
        </label>
        <input
          id={`${id}-rate`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          className="input"
          placeholder="Centre's standard rate"
          value={hourlyRate}
          onChange={(e) => {
            setHourlyRate(e.target.value);
            save.markDirty();
          }}
        />
        <p className="mt-1 text-xs text-charcoal/70">Leave blank to use the centre&apos;s standard rate.</p>
      </div>

      <div>
        <label htmlFor={`${id}-special`} className={fieldLabel}>
          Special weekly rate ($)
        </label>
        <input
          id={`${id}-special`}
          type="number"
          inputMode="decimal"
          min={0}
          step="0.01"
          className="input"
          placeholder="Only for an agreed special rate"
          value={specialOverride}
          onChange={(e) => {
            setSpecialOverride(e.target.value);
            save.markDirty();
          }}
        />
        <p className="mt-1 text-xs text-charcoal/70">Replaces the calculated weekly fee entirely.</p>
      </div>

      <dl className="flex flex-col gap-2 rounded-xl border border-charcoal/10 bg-canvas px-4 py-3 text-sm">
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt className="text-charcoal/70">20 Hours ECE</dt>
          <dd className="text-charcoal">{eceEligible ? "Eligible (aged 3 or over)" : "Not yet eligible (under 3)"}</dd>
        </div>
        <div className="flex flex-wrap justify-between gap-x-3">
          <dt className="text-charcoal/70">Sibling discount</dt>
          <dd className="text-charcoal">{siblingDiscountEligible ? "Applies (10%)" : "Doesn't apply"}</dd>
        </div>
        <p className="text-xs text-charcoal/70">Both are worked out automatically — 20 Hours ECE is capped at 6 hours a day.</p>
      </dl>

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

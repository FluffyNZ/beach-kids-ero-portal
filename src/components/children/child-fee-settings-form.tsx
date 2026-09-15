"use client";

import { useState, useTransition } from "react";
import { isEceEligible } from "@/lib/constants";

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
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [hourlyRate, setHourlyRate] = useState(initialHourlyRate !== null ? String(initialHourlyRate) : "");
  const [specialOverride, setSpecialOverride] = useState(
    initialSpecialWeeklyOverride !== null ? String(initialSpecialWeeklyOverride) : ""
  );

  const eceEligible = isEceEligible(ageYears);

  function markDirty() {
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label">Hourly rate override ($) — leave blank to use the centre&apos;s standard rate</label>
        <input
          type="number"
          min={0}
          step="0.01"
          className="input"
          value={hourlyRate}
          onChange={(e) => {
            setHourlyRate(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div className="rounded-lg bg-sand-50 px-3 py-2 text-xs text-charcoal/60">
        20 Hours ECE: {eceEligible ? "eligible (aged 3 or over)" : "not yet eligible (under 3)"}, capped at 6 hours a
        day. This is calculated automatically from the child&apos;s age, not set here.
      </div>

      <div className="rounded-lg bg-sand-50 px-3 py-2 text-xs text-charcoal/60">
        Sibling discount: {siblingDiscountEligible ? "applies (10%) — this bill payer has more than one active child" : "does not currently apply"}.
        This is calculated automatically, not set here.
      </div>

      <div>
        <label className="label">Special weekly rate override ($) — overrides the calculated fee entirely</label>
        <input
          type="number"
          min={0}
          step="0.01"
          className="input"
          placeholder="Leave blank unless there's an agreed special rate"
          value={specialOverride}
          onChange={(e) => {
            setSpecialOverride(e.target.value);
            markDirty();
          }}
        />
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

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
                  hourly_rate: hourlyRate !== "" ? Number(hourlyRate) : null,
                  special_weekly_override: specialOverride !== "" ? Number(specialOverride) : null,
                });
                setSaved(true);
              } catch (err) {
                setSaved(false);
                setError(err instanceof Error ? err.message : "Something went wrong saving these fee settings.");
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

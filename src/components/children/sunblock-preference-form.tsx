"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { updateChildSunblockPreference } from "@/lib/actions/children";
import { SaveStatus, FormError, useSaveState } from "@/components/ui/save-status";

/** The "which sunblock do we use for this child" form, embedded two places
 * that must never drift apart: the child's own profile (Health tab) and a
 * Modal opened by clicking a child's name on the Sunblock Charts page. Both
 * call the exact same server action against the exact same two columns
 * (see migration 0062). `onSaved` lets the chart's modal close itself after
 * a successful save. */
export function SunblockPreferenceForm({
  childId,
  initialUsesOwn,
  initialInstructions,
  onSaved,
}: {
  childId: string;
  initialUsesOwn: boolean;
  initialInstructions: string | null;
  onSaved?: () => void;
}) {
  const id = useId();
  const router = useRouter();
  const [usesOwn, setUsesOwn] = useState(initialUsesOwn);
  const [instructions, setInstructions] = useState(initialInstructions ?? "");
  const save = useSaveState();

  async function handleSave() {
    const ok = await save.run(
      () =>
        updateChildSunblockPreference(childId, {
          uses_own_sunblock: usesOwn,
          sunblock_instructions: instructions.trim() || null,
        }),
      "Couldn't save the sunblock preference."
    );
    if (ok) {
      router.refresh();
      onSaved?.();
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={`${id}-own`} className="flex items-start gap-2.5 text-sm text-charcoal">
        <input
          id={`${id}-own`}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-charcoal/40 accent-charcoal"
          checked={usesOwn}
          onChange={(e) => {
            setUsesOwn(e.target.checked);
            save.markDirty();
          }}
        />
        <span>Uses own or special sunblock</span>
      </label>

      <div>
        <label htmlFor={`${id}-instructions`} className="mb-1.5 block text-sm font-medium text-charcoal">
          Product or instructions
        </label>
        <textarea
          id={`${id}-instructions`}
          className="input min-h-[80px]"
          placeholder="e.g. Own SPF50+ lotion — labelled bottle in bag"
          value={instructions}
          onChange={(e) => {
            setInstructions(e.target.value);
            save.markDirty();
          }}
        />
        <p className="mt-1 text-xs text-charcoal/70">
          Shown under the child&apos;s name on printed charts. This isn&apos;t sunscreen consent — there&apos;s no
          record for that yet.
        </p>
      </div>

      <FormError message={save.error} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <SaveStatus state={save.state} />
        <button type="button" disabled={save.state === "saving"} className="btn-primary" onClick={handleSave}>
          {save.state === "saving" ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}

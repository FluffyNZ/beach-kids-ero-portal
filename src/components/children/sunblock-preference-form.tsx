"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateChildSunblockPreference } from "@/lib/actions/children";

/** The "which sunblock do we use for this child" form, embedded two places
 * that must never drift apart: inline on the child's own profile (Health &
 * permissions tab) and inside a Modal opened by clicking a child's name on
 * the Sunblock Charts page. Both call the exact same server action against
 * the exact same two columns (see migration 0062) — there's no separate
 * copy of this data anywhere, so there's nothing to keep in sync by hand.
 * `onSaved` lets the chart's modal close itself after a successful save;
 * the inline profile usage just leaves it on the page afterwards. */
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
  const router = useRouter();
  const [usesOwn, setUsesOwn] = useState(initialUsesOwn);
  const [instructions, setInstructions] = useState(initialInstructions ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await updateChildSunblockPreference(childId, {
        uses_own_sunblock: usesOwn,
        sunblock_instructions: instructions.trim() || null,
      });
      setSaved(true);
      router.refresh();
      onSaved?.();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <label className="flex items-start gap-2 text-sm text-charcoal">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-charcoal/30 text-burgundy-500 focus:ring-burgundy-500"
          checked={usesOwn}
          onChange={(e) => {
            setUsesOwn(e.target.checked);
            setSaved(false);
          }}
        />
        <span>Uses own / special sunblock</span>
      </label>

      <div>
        <label className="label">Product / instructions</label>
        <textarea
          className="input min-h-[80px]"
          placeholder="e.g. Own SPF50+ lotion — labelled bottle in bag"
          value={instructions}
          onChange={(e) => {
            setInstructions(e.target.value);
            setSaved(false);
          }}
        />
        <p className="mt-1 text-xs text-charcoal/50">Shown beneath the child&apos;s name on printed charts.</p>
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-charcoal/40">
          This isn&apos;t sunscreen consent — this app doesn&apos;t have a place to record that yet, only which
          sunblock to use.
        </p>
        <button type="button" disabled={pending} className="btn-primary shrink-0" onClick={handleSave}>
          {pending ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

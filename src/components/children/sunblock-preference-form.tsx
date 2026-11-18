"use client";

import { useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import { updateChildSunblockPreference } from "@/lib/actions/children";
import { SaveStatus, FormError, useSaveState } from "@/components/ui/save-status";
import {
  SUNBLOCK_INSTRUCTIONS_MAX,
  SUNBLOCK_PRODUCT_MAX,
  composeSunblockDetails,
  parseSunblockDetails,
} from "@/lib/sunblock-format";

/** Special sunblock details for one child. Used on the child's Health &
 * permissions tab and in "Manage sunblock details" on the Sunblock Charts
 * page — both save the same two existing fields on the child record
 * (`uses_own_sunblock`, `sunblock_instructions`). The product name and
 * instructions share `sunblock_instructions`; see lib/sunblock-format.ts. */
export function SunblockPreferenceForm({
  childId,
  initialUsesOwn,
  initialInstructions,
  onSaved,
  onDirtyChange,
}: {
  childId: string;
  initialUsesOwn: boolean;
  initialInstructions: string | null;
  onSaved?: () => void;
  onDirtyChange?: (dirty: boolean) => void;
}) {
  const id = useId();
  const router = useRouter();
  const initial = parseSunblockDetails(initialInstructions);
  const [usesOwn, setUsesOwn] = useState(initialUsesOwn);
  const [product, setProduct] = useState(initial.product);
  const [instructions, setInstructions] = useState(initial.instructions);
  const [baseline, setBaseline] = useState({ usesOwn: initialUsesOwn, ...initial });
  const save = useSaveState();

  const dirty =
    usesOwn !== baseline.usesOwn ||
    product.trim() !== baseline.product.trim() ||
    instructions.trim() !== baseline.instructions.trim();

  useEffect(() => {
    onDirtyChange?.(dirty);
  }, [dirty, onDirtyChange]);

  function change(fn: () => void) {
    fn();
    save.markDirty();
  }

  async function handleSave() {
    if (usesOwn && !product.trim() && !instructions.trim()) {
      save.setError("Add the product name or instructions so staff know what to use.");
      save.setState("error");
      return;
    }
    const ok = await save.run(
      () =>
        updateChildSunblockPreference(childId, {
          uses_own_sunblock: usesOwn,
          sunblock_instructions: composeSunblockDetails(product, instructions),
        }),
      "Couldn't save the sunblock details."
    );
    if (ok) {
      setBaseline({ usesOwn, product: product.trim(), instructions: instructions.trim() });
      router.refresh();
      onSaved?.();
    }
  }

  const hasAnything = usesOwn || product.trim() !== "" || instructions.trim() !== "";

  return (
    <div className="flex flex-col gap-4">
      <label htmlFor={`${id}-own`} className="flex items-start gap-2.5 text-sm font-medium text-charcoal">
        <input
          id={`${id}-own`}
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-charcoal/40 accent-charcoal"
          checked={usesOwn}
          onChange={(e) => change(() => setUsesOwn(e.target.checked))}
        />
        <span>
          Uses own/special sunblock
          <span className="block text-xs font-normal text-charcoal/70">
            Marked on printed sunblock charts with the details below.
          </span>
        </span>
      </label>

      <div>
        <label htmlFor={`${id}-product`} className="mb-1.5 block text-sm font-medium text-charcoal">
          Product name
        </label>
        <input
          id={`${id}-product`}
          className="input"
          maxLength={SUNBLOCK_PRODUCT_MAX}
          placeholder="e.g. Cancer Society Kids SPF50+"
          value={product}
          onChange={(e) => change(() => setProduct(e.target.value.replace(/\n/g, " ")))}
        />
      </div>

      <div>
        <label htmlFor={`${id}-instructions`} className="mb-1.5 block text-sm font-medium text-charcoal">
          Application instructions
        </label>
        <textarea
          id={`${id}-instructions`}
          className="input min-h-[72px]"
          maxLength={SUNBLOCK_INSTRUCTIONS_MAX}
          aria-describedby={`${id}-instructions-hint`}
          placeholder="e.g. Labelled bottle in bag. Face and arms only."
          value={instructions}
          onChange={(e) => change(() => setInstructions(e.target.value))}
        />
        <p id={`${id}-instructions-hint`} className="mt-1 flex justify-between gap-3 text-xs text-charcoal/70">
          <span>
            {usesOwn
              ? "Printed in the chart's special sunblock column."
              : "Not printed on charts unless “Uses own/special sunblock” is ticked."}
          </span>
          <span className="shrink-0 tabular-nums">
            {instructions.length}/{SUNBLOCK_INSTRUCTIONS_MAX}
          </span>
        </p>
      </div>

      <p className="text-xs text-charcoal/70">This isn&apos;t a record of sunscreen consent — Earlydesk doesn&apos;t hold one yet.</p>

      <FormError message={save.error} />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <button
          type="button"
          className="btn-ghost px-3 py-1.5"
          disabled={!hasAnything || save.state === "saving"}
          onClick={() =>
            change(() => {
              setUsesOwn(false);
              setProduct("");
              setInstructions("");
            })
          }
        >
          Clear details
        </button>
        <div className="flex flex-wrap items-center gap-3">
          <SaveStatus state={dirty || save.state !== "dirty" ? save.state : "idle"} />
          <button type="button" disabled={save.state === "saving" || !dirty} className="btn-primary" onClick={handleSave}>
            {save.state === "saving" ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

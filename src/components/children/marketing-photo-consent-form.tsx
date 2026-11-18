"use client";

import { useId, useState } from "react";
import { useRouter } from "next/navigation";
import { setChildMarketingPhotoConsent } from "@/lib/actions/children";
import { SaveStatus, FormError, useSaveState } from "@/components/ui/save-status";
import { cn } from "@/lib/utils";

/** "Can we use this child in marketing / social media posts?" — a real
 * consent flag (migration 0064), not a guess. Starts at "Not yet
 * confirmed" for every child and only changes when a staff member actually
 * sets it here, after checking with the family. This is what the
 * Marketing feature's photo-permission review step reads before a post with
 * this child tagged can be scheduled or published. */
export function MarketingPhotoConsentForm({
  childId,
  initialConsent,
  initialNotes,
}: {
  childId: string;
  initialConsent: boolean | null;
  initialNotes: string | null;
}) {
  const id = useId();
  const router = useRouter();
  const [consent, setConsent] = useState<boolean | null>(initialConsent);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const save = useSaveState();

  async function handleSave() {
    const ok = await save.run(
      () => setChildMarketingPhotoConsent(childId, consent, notes.trim() || null),
      "Couldn't save the photo permission."
    );
    if (ok) router.refresh();
  }

  const options = [
    { value: true, label: "OK to use", dot: "bg-status-ready" },
    { value: false, label: "Not OK to use", dot: "bg-status-action" },
    { value: null, label: "Not yet confirmed", dot: "bg-charcoal/40" },
  ] as const;

  return (
    <div className="flex flex-col gap-4">
      <div role="radiogroup" aria-label="Marketing photo permission" className="flex flex-wrap gap-2">
        {options.map((opt) => {
          const selected = consent === opt.value;
          return (
            <button
              key={String(opt.value)}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => {
                setConsent(opt.value);
                save.markDirty();
              }}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
                selected ? "border-charcoal bg-charcoal text-white" : "border-charcoal/15 bg-white text-charcoal hover:bg-charcoal/5"
              )}
            >
              <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", opt.dot)} />
              {opt.label}
            </button>
          );
        })}
      </div>

      <div>
        <label htmlFor={`${id}-notes`} className="mb-1.5 block text-sm font-medium text-charcoal">
          Notes <span className="font-normal text-charcoal/70">(optional)</span>
        </label>
        <input
          id={`${id}-notes`}
          className="input"
          placeholder="e.g. Confirmed with Mum 12/10, happy for Facebook & Instagram"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            save.markDirty();
          }}
        />
        <p className="mt-1 text-xs text-charcoal/70">
          The Marketing feature checks this before a post with this child can be scheduled or published. Only choose
          “OK to use” after confirming with the family.
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

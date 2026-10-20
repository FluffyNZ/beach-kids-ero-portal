"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setChildMarketingPhotoConsent } from "@/lib/actions/children";

/** "Can we use this child in marketing / social media posts?" — a real
 * consent flag (migration 0064), not a guess. Starts at "Not yet
 * confirmed" for every child and only changes when a staff member actually
 * ticks it here, after checking with the family. This is what the
 * Marketing feature's photo-permission review step reads before letting a
 * post with this child tagged be scheduled or published — see
 * src/lib/marketing/*. */
export function MarketingPhotoConsentForm({
  childId,
  initialConsent,
  initialNotes,
}: {
  childId: string;
  initialConsent: boolean | null;
  initialNotes: string | null;
}) {
  const router = useRouter();
  const [consent, setConsent] = useState<boolean | null>(initialConsent);
  const [notes, setNotes] = useState(initialNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await setChildMarketingPhotoConsent(childId, consent, notes.trim() || null);
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        {(
          [
            { value: true, label: "OK to use" },
            { value: false, label: "Not OK to use" },
            { value: null, label: "Not yet confirmed" },
          ] as const
        ).map((opt) => (
          <button
            key={String(opt.value)}
            type="button"
            onClick={() => {
              setConsent(opt.value);
              setSaved(false);
            }}
            className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
              consent === opt.value
                ? opt.value === true
                  ? "border-kelp-500 bg-kelp-50 text-kelp-600"
                  : opt.value === false
                    ? "border-status-action bg-status-actionBg text-status-action"
                    : "border-charcoal/30 bg-charcoal/[0.04] text-charcoal/60"
                : "border-charcoal/10 text-charcoal/50 hover:border-charcoal/30"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>

      <div>
        <label className="label">Notes (optional)</label>
        <input
          className="input"
          placeholder="e.g. Confirmed with Mum 12/10, happy for Facebook & Instagram"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      <div className="flex items-center justify-between gap-3">
        <p className="text-xs text-charcoal/40">
          This is what the Marketing feature checks before a post with this child in it can be scheduled or
          published. Only tick &quot;OK to use&quot; after actually confirming with the family.
        </p>
        <button type="button" disabled={pending} className="btn-primary shrink-0" onClick={handleSave}>
          {pending ? "Saving…" : saved ? "Saved" : "Save"}
        </button>
      </div>
    </div>
  );
}

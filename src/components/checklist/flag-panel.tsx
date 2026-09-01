"use client";

import { useState, useTransition } from "react";

export function FlagPanel({
  criterionId,
  criterionCode,
  isFlagged: initialIsFlagged,
  flagNotes: initialFlagNotes,
  onSave,
}: {
  criterionId: string;
  criterionCode: string;
  isFlagged: boolean;
  flagNotes: string | null;
  onSave: (
    criterionId: string,
    criterionCode: string,
    fields: { is_flagged: boolean; flag_notes: string | null }
  ) => Promise<void>;
}) {
  const [isFlagged, setIsFlagged] = useState(initialIsFlagged);
  const [flagNotes, setFlagNotes] = useState(initialFlagNotes ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-3">
      <label className="flex w-fit items-center gap-2 text-sm font-medium text-ocean-900">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-ocean-300 text-status-action focus:ring-status-action"
          checked={isFlagged}
          onChange={(e) => {
            setIsFlagged(e.target.checked);
            setSaved(false);
          }}
        />
        Flag this criterion
      </label>

      {isFlagged && (
        <div>
          <label className="label">What was flagged</label>
          <textarea
            className="input min-h-[90px]"
            placeholder="Describe the concern that was flagged…"
            value={flagNotes}
            onChange={(e) => {
              setFlagNotes(e.target.value);
              setSaved(false);
            }}
          />
        </div>
      )}

      {error && (
        <p className="rounded-lg bg-status-actionBg px-3 py-2 text-xs text-status-action">{error}</p>
      )}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          className="btn-primary"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await onSave(criterionId, criterionCode, {
                  is_flagged: isFlagged,
                  flag_notes: flagNotes || null,
                });
                setSaved(true);
              } catch (err) {
                setSaved(false);
                setError(err instanceof Error ? err.message : "Something went wrong saving the flag.");
              }
            })
          }
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save flag"}
        </button>
      </div>
    </div>
  );
}

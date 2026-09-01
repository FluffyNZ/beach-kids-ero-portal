"use client";

import { useState, useTransition } from "react";

export function StaffProfileForm({
  notes: initialNotes,
  onSave,
}: {
  notes: string | null;
  onSave: (fields: { notes?: string | null }) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(initialNotes ?? "");

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="label">Notes &amp; other information</label>
        <textarea
          className="input min-h-[120px]"
          placeholder="Anything else worth keeping on this person's profile — emergency contact, medical notes, general observations, etc."
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            setSaved(false);
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
                await onSave({ notes: notes || null });
                setSaved(true);
              } catch (err) {
                setSaved(false);
                setError(err instanceof Error ? err.message : "Something went wrong saving this.");
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

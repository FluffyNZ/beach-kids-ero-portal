"use client";

import { useState, useTransition } from "react";
import { WEEKDAYS } from "@/lib/constants";
import type { StaffAvailability } from "@/lib/types";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";

/** A person's general weekly availability — a template of when they're
 * usually free to work, kept deliberately separate from both their
 * contracted min_hours (an agreed minimum, not a schedule) and the actual
 * rostered shifts in Roster (roster_shifts) — this never writes to either
 * of those, and neither of those ever overwrites this. Labelled plainly as
 * "availability", not a schedule or roster, so the three stay distinct. */
export function StaffAvailabilityForm({
  availability,
  onSave,
}: {
  availability: StaffAvailability | null;
  onSave: (fields: Record<string, string | null>) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [times, setTimes] = useState<Record<DayKey, { start: string; end: string }>>(() => {
    const result = {} as Record<DayKey, { start: string; end: string }>;
    (["mon", "tue", "wed", "thu", "fri"] as DayKey[]).forEach((key) => {
      result[key] = {
        start: (availability?.[`${key}_start` as keyof StaffAvailability] as string | null) ?? "",
        end: (availability?.[`${key}_end` as keyof StaffAvailability] as string | null) ?? "",
      };
    });
    return result;
  });
  const [notes, setNotes] = useState(availability?.notes ?? "");

  function setDay(key: DayKey, field: "start" | "end", value: string) {
    setTimes((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="overflow-x-auto rounded-xl border border-charcoal/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal/10 bg-cream/40 text-left text-xs font-semibold uppercase tracking-wide text-charcoal/50">
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">Available from</th>
              <th className="px-3 py-2">Available to</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {WEEKDAYS.map((d) => (
              <tr key={d.key}>
                <td className="px-3 py-2 font-medium text-charcoal">{d.label}</td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    className="input"
                    value={times[d.key as DayKey].start}
                    onChange={(e) => setDay(d.key as DayKey, "start", e.target.value)}
                  />
                </td>
                <td className="px-3 py-2">
                  <input
                    type="time"
                    className="input"
                    value={times[d.key as DayKey].end}
                    onChange={(e) => setDay(d.key as DayKey, "end", e.target.value)}
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          className="input min-h-[60px]"
          placeholder="Anything else about this person's availability — e.g. can do extra Fridays with notice."
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
                const fields: Record<string, string | null> = { notes: notes || null };
                (["mon", "tue", "wed", "thu", "fri"] as DayKey[]).forEach((key) => {
                  fields[`${key}_start`] = times[key].start || null;
                  fields[`${key}_end`] = times[key].end || null;
                });
                await onSave(fields);
                setSaved(true);
              } catch (err) {
                setSaved(false);
                setError(err instanceof Error ? err.message : "Something went wrong saving availability.");
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

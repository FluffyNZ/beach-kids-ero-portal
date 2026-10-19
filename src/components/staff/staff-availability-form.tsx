"use client";

import { useState, useTransition } from "react";
import { WEEKDAYS } from "@/lib/constants";
import type { StaffAvailability } from "@/lib/types";

type DayKey = "mon" | "tue" | "wed" | "thu" | "fri";
const DAY_KEYS: DayKey[] = ["mon", "tue", "wed", "thu", "fri"];

/** A person's general weekly availability — a template of when they're
 * usually free to work, kept deliberately separate from both their
 * contracted min_hours (an agreed minimum, not a schedule) and the actual
 * rostered shifts in Roster (roster_shifts) — this never writes to either
 * of those, and neither of those ever overwrites this. Labelled plainly as
 * "availability", not a schedule or roster, so the three stay distinct.
 *
 * Per-day Start/To times still get saved exactly as before (same
 * `mon_start`/`mon_end`/etc. fields, same action) — nothing changed about
 * what's stored. What changed is how you fill it in: a day only counts as
 * available once you tick it, and ticking a day fills it from the shared
 * "Usual time" above the table so you're not retyping the same hours five
 * times over — each day's own Start/To stays editable afterwards for
 * whichever day actually differs. */
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
    DAY_KEYS.forEach((key) => {
      result[key] = {
        start: (availability?.[`${key}_start` as keyof StaffAvailability] as string | null) ?? "",
        end: (availability?.[`${key}_end` as keyof StaffAvailability] as string | null) ?? "",
      };
    });
    return result;
  });

  // Whether each day is ticked "available" — starts from whether it already
  // has both a start and an end time saved, the same rule the read-only
  // Overview card uses (see StaffAvailabilitySection). Kept as its own
  // state, not inferred live from the time fields, so unticking a day can
  // immediately clear its times and ticking one can immediately fill them
  // in from the shared default below.
  const [enabled, setEnabled] = useState<Record<DayKey, boolean>>(() => {
    const result = {} as Record<DayKey, boolean>;
    DAY_KEYS.forEach((key) => {
      result[key] = Boolean(times[key].start && times[key].end);
    });
    return result;
  });

  const [notes, setNotes] = useState(availability?.notes ?? "");

  // The shared "usual" time — not saved anywhere itself, just a quick-fill
  // source. Ticking a day copies these in (if that day doesn't already have
  // its own times); "Apply to ticked days" overwrites every already-ticked
  // day with whatever's set here right now, for changing several at once.
  const [defaultStart, setDefaultStart] = useState("");
  const [defaultEnd, setDefaultEnd] = useState("");

  function setDay(key: DayKey, field: "start" | "end", value: string) {
    setTimes((prev) => ({ ...prev, [key]: { ...prev[key], [field]: value } }));
    setSaved(false);
  }

  function toggleDay(key: DayKey, checked: boolean) {
    setEnabled((prev) => ({ ...prev, [key]: checked }));
    setTimes((prev) => ({
      ...prev,
      [key]: checked
        ? { start: prev[key].start || defaultStart, end: prev[key].end || defaultEnd }
        : { start: "", end: "" },
    }));
    setSaved(false);
  }

  function applyDefaultToTicked() {
    if (!defaultStart && !defaultEnd) return;
    setTimes((prev) => {
      const next = { ...prev };
      DAY_KEYS.forEach((key) => {
        if (enabled[key]) {
          next[key] = { start: defaultStart || next[key].start, end: defaultEnd || next[key].end };
        }
      });
      return next;
    });
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end gap-3 rounded-xl border border-charcoal/10 bg-cream/30 p-3">
        <div>
          <label className="label">Usual time</label>
          <div className="flex items-center gap-2">
            <input
              type="time"
              className="input"
              value={defaultStart}
              onChange={(e) => setDefaultStart(e.target.value)}
            />
            <span className="text-sm text-charcoal/40">to</span>
            <input type="time" className="input" value={defaultEnd} onChange={(e) => setDefaultEnd(e.target.value)} />
          </div>
        </div>
        <button type="button" className="btn-secondary text-xs" onClick={applyDefaultToTicked}>
          Apply to ticked days
        </button>
        <p className="max-w-xs text-xs text-charcoal/40">
          Tick a day below to fill it in from here — then adjust that day&apos;s own times if it&apos;s different.
        </p>
      </div>

      <div className="overflow-x-auto rounded-xl border border-charcoal/10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-charcoal/10 bg-cream/40 text-left text-xs font-semibold uppercase tracking-wide text-charcoal/50">
              <th className="px-3 py-2">Available</th>
              <th className="px-3 py-2">Day</th>
              <th className="px-3 py-2">From</th>
              <th className="px-3 py-2">To</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-charcoal/5">
            {WEEKDAYS.map((d) => {
              const key = d.key as DayKey;
              const isOn = enabled[key];
              return (
                <tr key={d.key} className={isOn ? "" : "opacity-50"}>
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      aria-label={`${d.label} available`}
                      className="h-4 w-4 rounded border-charcoal/30 text-burgundy-500 focus:ring-burgundy-500"
                      checked={isOn}
                      onChange={(e) => toggleDay(key, e.target.checked)}
                    />
                  </td>
                  <td className="px-3 py-2 font-medium text-charcoal">{d.label}</td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      className="input"
                      disabled={!isOn}
                      value={times[key].start}
                      onChange={(e) => setDay(key, "start", e.target.value)}
                    />
                  </td>
                  <td className="px-3 py-2">
                    <input
                      type="time"
                      className="input"
                      disabled={!isOn}
                      value={times[key].end}
                      onChange={(e) => setDay(key, "end", e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
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
                DAY_KEYS.forEach((key) => {
                  // An unticked day was already cleared to "" by toggleDay,
                  // so this naturally saves it as not-available — no extra
                  // branch needed here for the ticked/unticked split.
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

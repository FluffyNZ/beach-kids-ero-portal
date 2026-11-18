"use client";

import { useId, useMemo, useState, useTransition } from "react";
import type { ChildEnrolledSchedule } from "@/lib/types";
import { formatHours, formatNzDate, hoursBetween, WEEKDAYS } from "@/lib/child-format";
import { SaveStatus, FormError, useSaveState } from "@/components/ui/save-status";

type ScheduleFields = {
  mon_start?: string | null;
  mon_end?: string | null;
  tue_start?: string | null;
  tue_end?: string | null;
  wed_start?: string | null;
  wed_end?: string | null;
  thu_start?: string | null;
  thu_end?: string | null;
  fri_start?: string | null;
  fri_end?: string | null;
};

// Postgres returns "HH:MM:SS" — <input type="time"> wants "HH:MM".
function toInputTime(value: string | null | undefined): string {
  return value ? value.slice(0, 5) : "";
}

/** A child's regular booked days/times — a template of a normal week,
 * used by the booked sessions roll, ratios and as the starting estimate on
 * the Weekly Hours page. Editing this doesn't change any week's confirmed
 * hours.
 *
 * "To be confirmed" is a separate one-click switch (its own action): the
 * roll shows "TBC" and leaves this child out of booked totals while it's
 * on, without touching the times saved below. */
export function ChildEnrolledScheduleForm({
  schedule,
  onSave,
  onToggleTbc,
}: {
  schedule: ChildEnrolledSchedule | null;
  onSave: (fields: ScheduleFields) => Promise<void>;
  onToggleTbc: (tbc: boolean) => Promise<void>;
}) {
  const id = useId();
  const save = useSaveState();
  const [validation, setValidation] = useState<string | null>(null);

  const [tbc, setTbc] = useState(schedule?.tbc ?? false);
  const [tbcPending, startTbcTransition] = useTransition();
  const [tbcError, setTbcError] = useState<string | null>(null);

  const [times, setTimes] = useState<Record<string, { start: string; end: string }>>(() =>
    Object.fromEntries(
      WEEKDAYS.map((d) => [
        d.key,
        {
          start: toInputTime(schedule?.[`${d.key}_start` as keyof ChildEnrolledSchedule] as string | null),
          end: toInputTime(schedule?.[`${d.key}_end` as keyof ChildEnrolledSchedule] as string | null),
        },
      ])
    )
  );

  const weeklyTotal = useMemo(
    () => WEEKDAYS.reduce((sum, d) => sum + hoursBetween(times[d.key].start, times[d.key].end), 0),
    [times]
  );

  function setDay(day: string, field: "start" | "end", value: string) {
    save.markDirty();
    setTimes((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  function clearDay(day: string) {
    save.markDirty();
    setTimes((prev) => ({ ...prev, [day]: { start: "", end: "" } }));
  }

  async function handleSave() {
    for (const d of WEEKDAYS) {
      const { start, end } = times[d.key];
      if ((start && !end) || (!start && end)) {
        setValidation(`${d.long} needs both a start and a finish time (or neither).`);
        save.setState("error");
        return;
      }
      if (start && end && end <= start) {
        setValidation(`${d.long}'s finish time is before its start time.`);
        save.setState("error");
        return;
      }
    }
    setValidation(null);
    const fields: ScheduleFields = {};
    for (const d of WEEKDAYS) {
      fields[`${d.key}_start` as keyof ScheduleFields] = times[d.key].start || null;
      fields[`${d.key}_end` as keyof ScheduleFields] = times[d.key].end || null;
    }
    await save.run(() => onSave(fields), "Something went wrong saving this schedule.");
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 rounded-xl border border-charcoal/10 bg-canvas px-4 py-3 sm:flex-row sm:items-center">
        <div className="flex-1">
          <p className="text-sm font-medium text-charcoal">
            {tbc ? "Times are to be confirmed (TBC)" : "Times are confirmed"}
          </p>
          <p className="text-sm text-charcoal/70">
            {tbc
              ? "The booked sessions roll shows “TBC” and leaves this child out of totals. Saved times are kept."
              : "Switch to TBC if the family hasn’t confirmed their days yet."}
          </p>
        </div>
        <button
          type="button"
          disabled={tbcPending}
          className="btn-secondary shrink-0"
          aria-pressed={tbc}
          onClick={() =>
            startTbcTransition(async () => {
              setTbcError(null);
              const next = !tbc;
              try {
                await onToggleTbc(next);
                setTbc(next);
              } catch (err) {
                setTbcError(err instanceof Error ? err.message : "Could not update TBC status.");
              }
            })
          }
        >
          {tbcPending ? "Saving…" : tbc ? "Mark as confirmed" : "Mark as TBC"}
        </button>
      </div>
      <FormError message={tbcError} />

      <fieldset>
        <legend className="sr-only">Usual booked times</legend>
        <div className="hidden grid-cols-[7rem_1fr_1fr_4.5rem_2.5rem] gap-3 px-1 pb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/70 sm:grid">
          <span>Day</span>
          <span>Start</span>
          <span>Finish</span>
          <span className="text-right">Hours</span>
          <span />
        </div>
        <ul className="flex flex-col divide-y divide-charcoal/10 rounded-xl border border-charcoal/10">
          {WEEKDAYS.map((d) => {
            const dayHours = hoursBetween(times[d.key].start, times[d.key].end);
            const booked = Boolean(times[d.key].start || times[d.key].end);
            return (
              <li
                key={d.key}
                className="grid grid-cols-2 items-center gap-x-3 gap-y-2 px-3 py-3 sm:grid-cols-[7rem_1fr_1fr_4.5rem_2.5rem] sm:py-2"
              >
                <span className="col-span-2 flex items-center justify-between text-sm font-medium text-charcoal sm:col-span-1">
                  {d.long}
                  <span className="text-xs font-normal text-charcoal/70 sm:hidden">{dayHours > 0 ? formatHours(dayHours) : "Not booked"}</span>
                </span>
                <div>
                  <label htmlFor={`${id}-${d.key}-start`} className="mb-1 block text-xs text-charcoal/70 sm:sr-only">
                    {d.long} start
                  </label>
                  <input
                    id={`${id}-${d.key}-start`}
                    type="time"
                    className="input"
                    value={times[d.key].start}
                    onChange={(e) => setDay(d.key, "start", e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor={`${id}-${d.key}-end`} className="mb-1 block text-xs text-charcoal/70 sm:sr-only">
                    {d.long} finish
                  </label>
                  <input
                    id={`${id}-${d.key}-end`}
                    type="time"
                    className="input"
                    value={times[d.key].end}
                    onChange={(e) => setDay(d.key, "end", e.target.value)}
                  />
                </div>
                <span className="hidden text-right text-sm tabular-nums text-charcoal sm:block">
                  {dayHours > 0 ? formatHours(dayHours) : "—"}
                </span>
                <span className="col-span-2 sm:col-span-1">
                  {booked && (
                    <button
                      type="button"
                      onClick={() => clearDay(d.key)}
                      className="rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
                    >
                      Clear<span className="sr-only"> {d.long}</span>
                    </button>
                  )}
                </span>
              </li>
            );
          })}
        </ul>
      </fieldset>

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-sm font-medium text-charcoal">Weekly total: {formatHours(weeklyTotal)}</p>
        {schedule?.updated_at && <p className="text-xs text-charcoal/70">Last updated {formatNzDate(schedule.updated_at)}</p>}
      </div>

      <FormError message={validation ?? save.error} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <SaveStatus state={save.state} />
        <button type="button" disabled={save.state === "saving"} className="btn-primary" onClick={handleSave}>
          {save.state === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

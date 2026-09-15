"use client";

import { useMemo, useState, useTransition } from "react";
import type { ChildEnrolledSchedule } from "@/lib/types";
import { formatDate } from "@/lib/utils";

const DAYS: Array<{ key: "mon" | "tue" | "wed" | "thu" | "fri"; label: string }> = [
  { key: "mon", label: "Monday" },
  { key: "tue", label: "Tuesday" },
  { key: "wed", label: "Wednesday" },
  { key: "thu", label: "Thursday" },
  { key: "fri", label: "Friday" },
];

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

function hoursBetween(start: string, end: string): number {
  if (!start || !end) return 0;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  const minutes = eh * 60 + em - (sh * 60 + sm);
  return minutes > 0 ? minutes / 60 : 0;
}

/** A child's regular booked days/times — a template of a normal week,
 * used to estimate fees for weeks nobody has entered actual attendance
 * for yet (see the Weekly Hours page). Editing this doesn't change any
 * week's confirmed hours, only the estimate future weeks start from. */
export function ChildEnrolledScheduleForm({
  schedule,
  onSave,
}: {
  schedule: ChildEnrolledSchedule | null;
  onSave: (fields: ScheduleFields) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [times, setTimes] = useState<Record<string, { start: string; end: string }>>(() =>
    Object.fromEntries(
      DAYS.map((d) => [
        d.key,
        {
          start: toInputTime(schedule?.[`${d.key}_start` as keyof ChildEnrolledSchedule] as string | null),
          end: toInputTime(schedule?.[`${d.key}_end` as keyof ChildEnrolledSchedule] as string | null),
        },
      ])
    )
  );

  const weeklyTotal = useMemo(
    () => DAYS.reduce((sum, d) => sum + hoursBetween(times[d.key].start, times[d.key].end), 0),
    [times]
  );

  function markDirty() {
    setSaved(false);
  }

  function setDay(day: string, field: "start" | "end", value: string) {
    markDirty();
    setTimes((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));
  }

  return (
    <div className="flex flex-col gap-4">
      {schedule?.updated_at && (
        <p className="text-xs text-charcoal/40">Last updated {formatDate(schedule.updated_at)}.</p>
      )}
      <p className="text-sm text-charcoal/60">
        This child&apos;s usual booked days and times. Leave a day blank if they&apos;re not normally enrolled
        then — it feeds the Weekly Hours page as a starting estimate, which can still be adjusted for any
        specific week (holidays, absences, extra days).
      </p>

      <div className="flex flex-col gap-2">
        {DAYS.map((d) => {
          const dayHours = hoursBetween(times[d.key].start, times[d.key].end);
          return (
            <div key={d.key} className="flex items-center gap-3">
              <span className="w-24 shrink-0 text-sm font-medium text-charcoal">{d.label}</span>
              <input
                type="time"
                className="input"
                value={times[d.key].start}
                onChange={(e) => setDay(d.key, "start", e.target.value)}
              />
              <span className="text-charcoal/40">to</span>
              <input
                type="time"
                className="input"
                value={times[d.key].end}
                onChange={(e) => setDay(d.key, "end", e.target.value)}
              />
              <span className="w-16 shrink-0 text-right text-xs text-charcoal/50">
                {dayHours > 0 ? `${dayHours.toFixed(1)} hrs` : "—"}
              </span>
            </div>
          );
        })}
      </div>

      <p className="text-sm font-medium text-charcoal">Weekly total: {weeklyTotal.toFixed(1)} hrs</p>

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
                const fields: ScheduleFields = {};
                for (const d of DAYS) {
                  fields[`${d.key}_start` as keyof ScheduleFields] = times[d.key].start || null;
                  fields[`${d.key}_end` as keyof ScheduleFields] = times[d.key].end || null;
                }
                await onSave(fields);
                setSaved(true);
              } catch (err) {
                setSaved(false);
                setError(err instanceof Error ? err.message : "Something went wrong saving this schedule.");
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

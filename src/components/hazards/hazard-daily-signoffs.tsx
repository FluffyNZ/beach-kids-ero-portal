"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateHazardCheckDailySignoff } from "@/lib/actions/hazard-checks";
import { StatusBadge } from "@/components/status-badge";
import type { HazardCheckDailySignoff, StaffMember } from "@/lib/types";

function weekdayLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-NZ", { weekday: "long", timeZone: "UTC" }).format(date);
}

function shortDateLabel(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  return new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", timeZone: "UTC" }).format(date);
}

/** One weekday's own row — its own staff member, time, and signed-off tick,
 * saved independently of every other day so a doubled-up week (started by
 * hand, or filled in over several photo imports) never forces one day's
 * save to touch another day's. Mirrors one "Mon/Tue/Wed/Thu/Fri" column on
 * the real paper chart. */
function DailySignoffRow({ signoff, staff }: { signoff: HazardCheckDailySignoff; staff: StaffMember[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);

    startTransition(async () => {
      const result = await updateHazardCheckDailySignoff(signoff.id, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <form
      id={`day-${signoff.check_date}`}
      data-signoff-form
      onSubmit={handleSubmit}
      className="flex scroll-mt-20 flex-col gap-3 rounded-lg border border-charcoal/10 p-3 sm:flex-row sm:items-end sm:justify-between target:border-burgundy-300 target:ring-2 target:ring-burgundy-200"
    >
      <div className="shrink-0 sm:w-32">
        <p className="text-sm font-medium text-charcoal">{weekdayLabel(signoff.check_date)}</p>
        <p className="text-xs text-charcoal/50">{shortDateLabel(signoff.check_date)}</p>
      </div>

      <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor={`staff_id_${signoff.id}`}>
            Completed by
          </label>
          <select id={`staff_id_${signoff.id}`} name="staff_id" defaultValue={signoff.staff_id ?? ""} className="input">
            <option value="">Select who did this day&apos;s check…</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.status === "former" ? " (former)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor={`completed_time_${signoff.id}`}>
            Time
          </label>
          <input
            id={`completed_time_${signoff.id}`}
            name="completed_time"
            type="time"
            defaultValue={signoff.completed_time ?? ""}
            className="input"
          />
        </div>
      </div>

      <div className="flex shrink-0 flex-col items-start gap-2 sm:items-end">
        <label className="flex items-center gap-2 text-xs text-charcoal/70">
          <input type="checkbox" name="signed_off" defaultChecked={signoff.signed_off} className="h-4 w-4 rounded" />
          Signed off
        </label>
        <div className="flex items-center gap-2">
          {saved && !error && <StatusBadge tone="ready">Saved</StatusBadge>}
          <button type="submit" disabled={pending} className="btn-secondary text-xs">
            {pending ? "Saving…" : "Save"}
          </button>
        </div>
      </div>

      {error && <p className="w-full text-xs text-status-action sm:text-right">{error}</p>}
    </form>
  );
}

/** The week's five daily sign-off columns — one per weekday, each its own
 * staff member/time/signed-off tick, saved independently. "Tick all" is for
 * when the whole week's being filled in at once: it checks every day's own
 * "Signed off" box (leaving whatever staff/time has already been picked per
 * day untouched) and submits every row's own save in one go, rather than
 * ticking and saving each of the five days one at a time. */
export function HazardDailySignoffs({ signoffs, staff }: { signoffs: HazardCheckDailySignoff[]; staff: StaffMember[] }) {
  const containerRef = useRef<HTMLDivElement>(null);

  function tickAllSignedOff() {
    const forms = containerRef.current?.querySelectorAll<HTMLFormElement>("form[data-signoff-form]");
    forms?.forEach((form) => {
      const checkbox = form.querySelector<HTMLInputElement>('input[name="signed_off"]');
      if (checkbox && !checkbox.checked) checkbox.checked = true;
      form.requestSubmit();
    });
  }

  if (signoffs.length === 0) {
    return <p className="text-sm text-charcoal/50">No sign-off rows exist yet for this week.</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      <div className="-mb-1 flex justify-end">
        <button type="button" onClick={tickAllSignedOff} className="text-xs font-medium text-burgundy-600 hover:underline">
          Tick all days as signed off
        </button>
      </div>
      <div ref={containerRef} className="flex flex-col gap-2">
        {signoffs.map((s) => (
          <DailySignoffRow key={s.id} signoff={s} staff={staff} />
        ))}
      </div>
    </div>
  );
}

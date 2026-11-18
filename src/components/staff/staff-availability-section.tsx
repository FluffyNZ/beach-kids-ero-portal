"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Panel } from "@/components/ui/panel";
import { StaffAvailabilityForm } from "./staff-availability-form";
import { availabilityDays } from "@/lib/staff-format";
import { formatNzDate } from "@/lib/child-format";
import { formatTime } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { StaffAvailability } from "@/lib/types";

/** Regular weekly availability — when this person is usually free to work.
 * Separate from contracted hours and from the roster. Read-only by default,
 * with Edit swapping in the availability form in place (same save action
 * as before). With nothing saved yet every day reads "Not recorded" rather
 * than "Unavailable". */
export function StaffAvailabilitySection({
  availability,
  onSave,
}: {
  availability: StaffAvailability | null;
  onSave: (fields: Record<string, string | null>) => Promise<void>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editing, setEditing] = useState(false);
  const days = availabilityDays(availability);
  const availableCount = days.filter((d) => d.state === "available").length;

  async function handleSave(fields: Record<string, string | null>) {
    await onSave(fields);
    startTransition(() => router.refresh());
  }

  return (
    <Panel
      id="panel-availability"
      title="Weekly availability"
      description={
        availability
          ? `Available ${availableCount} ${availableCount === 1 ? "day" : "days"} a week · not the roster`
          : "When they're usually free to work · not the roster"
      }
      headerAction={
        <button
          type="button"
          onClick={() => setEditing((e) => !e)}
          aria-expanded={editing}
          className="shrink-0 rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
        >
          {editing ? "Close editor" : availability ? "Edit" : "Add availability"}
        </button>
      }
    >
      {editing ? (
        <div className="border-t border-charcoal/10 px-5 py-4">
          <StaffAvailabilityForm availability={availability} onSave={handleSave} />
        </div>
      ) : (
        <>
          {!availability && (
            <p className="border-t border-charcoal/10 px-5 py-3 text-sm text-charcoal/70">
              No availability has been recorded yet.
            </p>
          )}
          <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
            {days.map((d) => (
              <li key={d.key} className="flex items-center justify-between gap-3 px-5 py-2.5 text-sm">
                <span className="font-medium text-charcoal">{d.label}</span>
                <span className="flex items-center gap-2">
                  <span
                    aria-hidden="true"
                    className={cn(
                      "h-2 w-2 rounded-full",
                      d.state === "available" ? "bg-status-ready" : d.state === "unavailable" ? "bg-charcoal/50" : "border border-charcoal/40"
                    )}
                  />
                  <span className={d.state === "not_recorded" ? "text-charcoal/70" : "text-charcoal"}>
                    {d.state === "available"
                      ? `Available ${formatTime(d.start)}–${formatTime(d.end)}`
                      : d.state === "unavailable"
                        ? "Unavailable"
                        : d.start || d.end
                          ? "Not recorded (time incomplete)"
                          : "Not recorded"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
          {(availability?.notes || availability?.updated_at) && (
            <div className="border-t border-charcoal/10 px-5 py-3 text-sm">
              {availability?.notes && <p className="text-charcoal">{availability.notes}</p>}
              {availability?.updated_at && <p className="mt-0.5 text-xs text-charcoal/70">Last updated {formatNzDate(availability.updated_at)}</p>}
            </div>
          )}
        </>
      )}
    </Panel>
  );
}

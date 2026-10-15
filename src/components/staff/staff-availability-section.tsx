"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StaffAvailabilityForm } from "./staff-availability-form";
import { EditIcon } from "@/components/icons";
import { WEEKDAYS } from "@/lib/constants";
import { formatTime } from "@/lib/utils";
import type { StaffAvailability } from "@/lib/types";

/** Overview's read-only "Weekly availability" card, with a small Edit button
 * that swaps in the real StaffAvailabilityForm in place — same
 * view/edit-toggle pattern as StaffContactSection, reusing the existing save
 * action unchanged. */
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

  async function handleSave(fields: Record<string, string | null>) {
    await onSave(fields);
    startTransition(() => router.refresh());
    setEditing(false);
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Weekly availability</h2>
        {!editing && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-burgundy-600 hover:underline"
            onClick={() => setEditing(true)}
          >
            <EditIcon className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      {editing ? (
        <div className="flex flex-col gap-3">
          <StaffAvailabilityForm availability={availability} onSave={handleSave} />
          <button type="button" className="self-start text-xs text-charcoal/50 hover:underline" onClick={() => setEditing(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          <div className="divide-y divide-charcoal/5">
            {WEEKDAYS.map((d) => {
              const start = availability?.[`${d.key}_start` as keyof StaffAvailability] as string | null | undefined;
              const end = availability?.[`${d.key}_end` as keyof StaffAvailability] as string | null | undefined;
              const isAvailable = Boolean(start && end);
              return (
                <div key={d.key} className="flex items-center justify-between py-1.5 text-sm">
                  <span className="font-medium text-charcoal">{d.label}</span>
                  <span className={isAvailable ? "text-charcoal" : "text-charcoal/40"}>
                    {isAvailable ? `${formatTime(start)} – ${formatTime(end)}` : "Not available"}
                  </span>
                </div>
              );
            })}
          </div>
          {availability?.notes && (
            <p className="mt-2 border-t border-charcoal/5 pt-2 text-sm text-charcoal/60">{availability.notes}</p>
          )}
        </div>
      )}
    </section>
  );
}

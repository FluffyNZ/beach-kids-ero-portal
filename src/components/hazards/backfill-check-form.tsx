"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHazardCheck } from "@/lib/actions/hazard-checks";
import { PlusIcon } from "@/components/icons";
import { mondayOfDateString } from "@/lib/utils";
import type { RosterRoom } from "@/lib/types";

/** For starting a chart for a week other than this one — e.g. a paper form
 * from a past week that only got filled in (or photographed) late. Hidden
 * behind a toggle since the common case is just this week's one-click room
 * cards above. Any date picked is resolved to that date's own week (its
 * Monday) before the chart is started, so picking a Wednesday still opens
 * the whole Monday-to-Friday chart for that week rather than a single day. */
export function BackfillCheckForm({ rooms, today }: { rooms: RosterRoom[]; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    const roomId = String(formData.get("room_id") ?? "");
    const date = String(formData.get("check_date") ?? "");

    if (!roomId || !date) {
      setError("Choose a room and a date within the week you mean.");
      return;
    }

    const weekStartDate = mondayOfDateString(date);

    startTransition(async () => {
      const result = await createHazardCheck(roomId, weekStartDate);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/records/hazards/${result.id}`);
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 self-start text-sm font-medium text-burgundy-600 hover:underline"
      >
        <PlusIcon className="h-4 w-4" /> Start a chart for another week
      </button>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="card flex flex-wrap items-end gap-3 p-4">
      <div>
        <label className="label" htmlFor="backfill_room_id">
          Room
        </label>
        <select id="backfill_room_id" name="room_id" className="input w-auto">
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label" htmlFor="backfill_check_date">
          Any date in that week
        </label>
        <input id="backfill_check_date" name="check_date" type="date" defaultValue={today} max={today} className="input w-auto" />
      </div>
      {error && <p className="text-sm text-status-action">{error}</p>}
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="btn-secondary">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Starting…" : "Start check"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useState, useTransition } from "react";
import { saveRosterShift, deleteRosterShift } from "@/lib/actions/roster";
import { formatShortDate } from "@/lib/utils";
import { CloseIcon } from "@/components/icons";
import type { RosterRoom, RosterShift } from "@/lib/types";

/** The brief's "clicking a cell opens a side panel, closing it returns the
 * roster to full width" — same docked-panel pattern already used for
 * invoice detail (see InvoiceDetailPanel): sticky on desktop beside a
 * shrinking grid, a full-screen sheet on mobile.
 *
 * Phase 1 only edits what roster_shifts already stores — room, start/end
 * time, and the notes field it already had but the old modal never
 * exposed. Breaks, non-contact time, split room assignments, relievers/
 * cover and unavailability-conflict checks need their own schema first
 * (see the Roster redesign report) — deliberately not faked here. */
export function RosterShiftPanel({
  onClose,
  weekStartDate,
  staffId,
  staffName,
  shiftDate,
  rooms,
  existingShift,
}: {
  onClose: () => void;
  weekStartDate: string;
  staffId: string;
  staffName: string;
  shiftDate: string;
  rooms: RosterRoom[];
  existingShift: RosterShift | null;
}) {
  const [roomId, setRoomId] = useState(existingShift?.room_id ?? "");
  const [startTime, setStartTime] = useState(existingShift?.start_time.slice(0, 5) ?? "08:30");
  const [endTime, setEndTime] = useState(existingShift?.end_time.slice(0, 5) ?? "15:00");
  const [notes, setNotes] = useState(existingShift?.notes ?? "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!roomId) {
      setError("Choose a room.");
      return;
    }
    if (endTime <= startTime) {
      setError("End time must be after the start time.");
      return;
    }
    startTransition(async () => {
      try {
        await saveRosterShift({
          weekStartDate,
          staffId,
          shiftDate,
          roomId,
          startTime,
          endTime,
          notes: notes.trim() || null,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save the shift.");
      }
    });
  }

  function handleClear() {
    if (!existingShift) return;
    setError(null);
    startTransition(async () => {
      try {
        await deleteRosterShift(existingShift.id);
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not remove the shift.");
      }
    });
  }

  return (
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-3 border-b border-charcoal/10 px-5 py-4">
        <div>
          <h2 className="text-sm font-semibold text-charcoal">{staffName}</h2>
          <p className="text-xs text-charcoal/50">{formatShortDate(shiftDate)}</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg p-1.5 text-charcoal/40 hover:bg-cream hover:text-charcoal"
          aria-label="Close"
        >
          <CloseIcon className="h-4 w-4" />
        </button>
      </div>

      <form onSubmit={handleSave} className="flex flex-1 flex-col gap-4 overflow-y-auto px-5 py-4">
        <div>
          <label className="label" htmlFor="room">
            Room
          </label>
          <select id="room" className="input" value={roomId ?? ""} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">Choose a room…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label" htmlFor="start_time">
              Start
            </label>
            <input
              id="start_time"
              type="time"
              className="input"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="label" htmlFor="end_time">
              End
            </label>
            <input
              id="end_time"
              type="time"
              className="input"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
              required
            />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="shift_notes">
            Notes
          </label>
          <textarea
            id="shift_notes"
            className="input min-h-[70px]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Optional — e.g. a room move partway through the day"
          />
        </div>

        {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

        <div className="mt-auto flex items-center justify-between gap-2 pt-2">
          {existingShift ? (
            <button
              type="button"
              onClick={handleClear}
              disabled={pending}
              className="btn-ghost text-status-action hover:bg-status-actionBg"
            >
              Remove shift
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" onClick={onClose} className="btn-ghost">
              Cancel
            </button>
            <button type="submit" disabled={pending} className="btn-primary">
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}

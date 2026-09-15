"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { saveRosterShift, deleteRosterShift } from "@/lib/actions/roster";
import { formatShortDate } from "@/lib/utils";
import type { RosterRoom, RosterShift } from "@/lib/types";

export function ShiftEditorModal({
  open,
  onClose,
  weekStartDate,
  staffId,
  staffName,
  shiftDate,
  rooms,
  existingShift,
}: {
  open: boolean;
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
        await saveRosterShift({ weekStartDate, staffId, shiftDate, roomId, startTime, endTime });
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
    <Modal open={open} onClose={onClose} title={`${staffName} — ${formatShortDate(shiftDate)}`}>
      <form onSubmit={handleSave} className="flex flex-col gap-4">
        <div>
          <label className="label" htmlFor="room">
            Room
          </label>
          <select
            id="room"
            className="input"
            value={roomId ?? ""}
            onChange={(e) => setRoomId(e.target.value)}
          >
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

        {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
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
    </Modal>
  );
}

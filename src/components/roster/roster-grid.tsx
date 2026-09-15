"use client";

import { useState } from "react";
import { addDays, formatShortDate, formatTime } from "@/lib/utils";
import { getRoomColorClasses } from "@/lib/constants";
import { PlusIcon } from "@/components/icons";
import { ShiftEditorModal } from "@/components/roster/shift-editor-modal";
import type { RosterRoom, RosterShift } from "@/lib/types";

const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];

type StaffOption = { id: string; full_name: string };

export function RosterGrid({
  weekStartDate,
  shifts,
  staff,
  rooms,
}: {
  weekStartDate: string;
  shifts: RosterShift[];
  staff: StaffOption[];
  rooms: RosterRoom[];
}) {
  const [editing, setEditing] = useState<{
    staffId: string;
    staffName: string;
    shiftDate: string;
    shift: RosterShift | null;
  } | null>(null);

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStartDate, i));

  const shiftByStaffAndDate = new Map<string, RosterShift>();
  shifts.forEach((s) => shiftByStaffAndDate.set(`${s.staff_id}__${s.shift_date}`, s));

  const roomById = new Map(rooms.map((r) => [r.id, r]));

  if (staff.length === 0) {
    return (
      <div className="card p-6 text-sm text-charcoal/60">
        No active staff yet — add staff members in the Staff section first, then come back here to roster them on.
      </div>
    );
  }

  return (
    <>
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[760px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-charcoal/10 bg-sand-50">
              <th className="sticky left-0 z-10 min-w-[160px] bg-sand-50 px-4 py-3 text-left font-display text-sm font-semibold text-charcoal">
                Staff
              </th>
              {days.map((d, i) => (
                <th key={d} className="px-3 py-3 text-left font-display text-sm font-semibold text-charcoal">
                  {WEEKDAY_LABELS[i]}
                  <span className="block text-xs font-normal text-charcoal/50">{formatShortDate(d)}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {staff.map((person) => (
              <tr key={person.id} className="border-b border-charcoal/5 last:border-0">
                <td className="sticky left-0 z-10 min-w-[160px] bg-white px-4 py-2.5 font-medium text-charcoal">
                  {person.full_name}
                </td>
                {days.map((d) => {
                  const shift = shiftByStaffAndDate.get(`${person.id}__${d}`) ?? null;
                  const room = shift?.room_id ? roomById.get(shift.room_id) ?? null : null;
                  const colors = getRoomColorClasses(room?.color);
                  return (
                    <td key={d} className="px-1.5 py-1.5 align-top">
                      <button
                        type="button"
                        onClick={() =>
                          setEditing({ staffId: person.id, staffName: person.full_name, shiftDate: d, shift })
                        }
                        className={
                          shift
                            ? `flex w-full min-w-[110px] flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-opacity hover:opacity-75 ${colors.bg} ${colors.text}`
                            : "flex w-full min-w-[110px] items-center justify-center rounded-lg border border-dashed border-charcoal/15 px-2.5 py-3 text-charcoal/25 hover:border-charcoal/30 hover:text-charcoal/50"
                        }
                      >
                        {shift ? (
                          <>
                            <span>{room?.name ?? "Room removed"}</span>
                            <span className="font-normal opacity-80">
                              {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                            </span>
                          </>
                        ) : (
                          <PlusIcon className="h-4 w-4" />
                        )}
                      </button>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap gap-3">
        {rooms.map((r) => {
          const colors = getRoomColorClasses(r.color);
          return (
            <span key={r.id} className={`badge ${colors.bg} ${colors.text}`}>
              <span className={`h-2 w-2 rounded-full ${colors.chip}`} />
              {r.name}
            </span>
          );
        })}
      </div>

      {editing && (
        <ShiftEditorModal
          open
          onClose={() => setEditing(null)}
          weekStartDate={weekStartDate}
          staffId={editing.staffId}
          staffName={editing.staffName}
          shiftDate={editing.shiftDate}
          rooms={rooms}
          existingShift={editing.shift}
        />
      )}
    </>
  );
}

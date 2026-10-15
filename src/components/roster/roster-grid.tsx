"use client";

import { useState } from "react";
import { addDays, formatShortDate, formatTime } from "@/lib/utils";
import { getRoomColorClasses, STAFF_LEAVE_TYPES, STAFF_LEAVE_TYPE_LABEL } from "@/lib/constants";
import { PlusIcon } from "@/components/icons";
import { RosterShiftPanel } from "@/components/roster/roster-shift-panel";
import type { RosterRoom, RosterShift, StaffLeave } from "@/lib/types";
import type { Weekday, RoomWeekRatioRow } from "@/lib/data/roster-ratios";

const WEEKDAY_LABELS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"];
const WEEKDAY_KEYS: Weekday[] = ["mon", "tue", "wed", "thu", "fri"];

// Restrained, distinct-from-room-colour tones for leave, reusing existing
// design tokens rather than inventing a new palette — lilac (the app's
// existing accent) for annual, the status-attention amber for sick, and a
// neutral sand tone for unpaid/other so none of the three are mistaken for
// a room colour.
const LEAVE_TONE: Record<string, string> = {
  annual: "bg-lilac-100 text-lilac-700",
  sick: "bg-status-attentionBg text-status-attention",
  unpaid: "bg-sand-200 text-charcoal/60",
  other: "bg-sand-100 text-charcoal/50",
  unavailable: "bg-status-actionBg text-status-action",
  day_off: "bg-charcoal/5 text-charcoal/50",
};

type StaffOption = { id: string; full_name: string; room_id: string | null; is_relief: boolean };

function timeToMinutes(value: string): number {
  const [h, m] = value.split(":").map(Number);
  return h * 60 + (m || 0);
}

/** Weekly worked hours — sum of each shift's duration this week. Leave
 * (even a partial-day one) isn't folded into this number — it's shown as
 * its own "days leave" count alongside it instead, since a day of leave
 * and a day of rostered work are different kinds of thing to total up. */
function weeklyWorkedHours(shifts: RosterShift[]): number {
  const minutes = shifts.reduce((sum, s) => sum + (timeToMinutes(s.end_time) - timeToMinutes(s.start_time)), 0);
  return Math.round((minutes / 60) * 10) / 10;
}

// Declined/cancelled leave didn't happen — the roster grid ignores it
// entirely, same as the Calendar and Home dashboard. Requested leave shows
// as an informational pill (see dayLeaveFor below) but, unlike Approved,
// doesn't count toward the "days leave" total or block the normal +
// add-shift button, since nothing has been decided yet.
function leaveDaysThisWeek(leave: StaffLeave[], staffId: string, days: string[]): number {
  return days.filter((d) =>
    leave.some((l) => l.staff_id === staffId && l.status === "approved" && d >= l.start_date && d <= l.end_date)
  ).length;
}

function dayLeaveFor(leave: StaffLeave[], staffId: string, date: string): StaffLeave | null {
  return (
    leave.find(
      (l) =>
        l.staff_id === staffId &&
        l.status !== "declined" &&
        l.status !== "cancelled" &&
        date >= l.start_date &&
        date <= l.end_date
    ) ?? null
  );
}

export function RosterGrid({
  weekStartDate,
  shifts,
  staff,
  rooms,
  leave,
  ratioRows,
}: {
  weekStartDate: string;
  shifts: RosterShift[];
  staff: StaffOption[];
  rooms: RosterRoom[];
  leave: StaffLeave[];
  ratioRows: RoomWeekRatioRow[];
}) {
  const [editing, setEditing] = useState<{
    staffId: string;
    staffName: string;
    shiftDate: string;
    shift: RosterShift | null;
  } | null>(null);

  // Staff someone has deliberately brought into view this week via "+ Add to
  // roster" even though they don't have a shift (or leave) yet — purely a
  // display thing, not persisted. Once they're given a real shift they stay
  // visible on their own (see hasEngagementThisWeek below), so this is only
  // needed for the gap between clicking "Add" and saving their first shift.
  const [pinnedStaffIds, setPinnedStaffIds] = useState<Set<string>>(new Set());
  const [addingSectionId, setAddingSectionId] = useState<string | null>(null);
  const [addPickerValue, setAddPickerValue] = useState("");

  const days = Array.from({ length: 5 }, (_, i) => addDays(weekStartDate, i));

  const shiftByStaffAndDate = new Map<string, RosterShift>();
  shifts.forEach((s) => shiftByStaffAndDate.set(`${s.staff_id}__${s.shift_date}`, s));

  const ratioByRoomId = new Map(ratioRows.filter((r) => r.room).map((r) => [r.room!.id, r]));

  function hasEngagementThisWeek(staffId: string): boolean {
    const hasShift = days.some((d) => shiftByStaffAndDate.has(`${staffId}__${d}`));
    if (hasShift) return true;
    // Any leave touching this week — not just Approved — keeps someone
    // visible too, since a Requested day still shows its pill on the grid
    // and shouldn't vanish along with the row it's attached to.
    return days.some((d) => dayLeaveFor(leave, staffId, d) !== null);
  }

  // Grouped by each staff member's home room (set on their profile), not by
  // where they happen to be rostered this particular week — a day they're
  // covering a different room still shows under their usual section, with
  // that room named on the cell itself (see roomLabelForCell below).
  // Nobody with no home room set is grouped under Float, same as the room's
  // existing "not tied to one room" meaning elsewhere in the app.
  //
  // Float is further split into "Float" and "Relief" sub-sections, going by
  // each person's is_relief flag (set on their profile) — Relief only shows
  // up at all once someone's actually flagged that way. This is a display
  // split only: it isn't a real room, so it never changes which room a
  // Relief person is actually rostered to on a given day (still the normal
  // Tainui/Pukewa/Ohinemuri/Float choice, same as everyone else) — see
  // migration 0061 for why this lives on staff rather than roster_rooms.
  //
  // Within a section, only staff actually rostered on this week (a shift or
  // booked leave) show by default — someone not working this particular
  // week shouldn't clutter the grid every week regardless. "+ Add to
  // roster" below brings anyone else in that section into view (pinned
  // client-side via pinnedStaffIds) so their day cells can be clicked to
  // give them a first shift; once saved they show up normally on their own.
  const floatRoom = rooms.find((r) => r.name === "Float") ?? null;
  const sections = rooms.flatMap((room) => {
    const everyoneInRoom = staff.filter((s) => (s.room_id ?? floatRoom?.id ?? null) === room.id);
    const isFloat = room.id === floatRoom?.id;
    const everyoneInSection = isFloat ? everyoneInRoom.filter((s) => !s.is_relief) : everyoneInRoom;
    const floatGroup = {
      key: room.id,
      room,
      headerLabel: room.name,
      isRelief: false,
      everyoneInSection,
      people: everyoneInSection.filter((s) => hasEngagementThisWeek(s.id) || pinnedStaffIds.has(s.id)),
    };
    if (!isFloat) return [floatGroup];

    const reliefEveryone = everyoneInRoom.filter((s) => s.is_relief);
    if (reliefEveryone.length === 0) return [floatGroup];

    const reliefGroup = {
      key: `${room.id}-relief`,
      room,
      headerLabel: "Relief",
      isRelief: true,
      everyoneInSection: reliefEveryone,
      people: reliefEveryone.filter((s) => hasEngagementThisWeek(s.id) || pinnedStaffIds.has(s.id)),
    };
    return [floatGroup, reliefGroup];
  });

  if (staff.length === 0) {
    return (
      <div className="card p-6 text-sm text-charcoal/60">
        No active staff yet — add staff members in the Staff section first, then come back here to roster them on.
      </div>
    );
  }

  return (
    <div className="relative flex items-start gap-6">
      <div className="flex min-w-0 flex-1 flex-col gap-4">
      <div className="card overflow-x-auto p-0">
        <table className="w-full min-w-[820px] border-collapse text-sm">
          <thead>
            <tr className="border-b border-charcoal/10 bg-sand-50">
              <th className="sticky left-0 top-0 z-20 min-w-[180px] bg-sand-50 px-4 py-3 text-left text-sm font-semibold text-charcoal">
                Staff
              </th>
              {days.map((d, i) => (
                <th key={d} className="sticky top-0 z-10 min-w-[120px] bg-sand-50 px-3 py-3 text-left text-sm font-semibold text-charcoal">
                  {WEEKDAY_LABELS[i]}
                  <span className="block text-xs font-normal text-charcoal/50">{formatShortDate(d)}</span>
                </th>
              ))}
            </tr>
          </thead>
          {sections.map(({ key, room, headerLabel, isRelief, people, everyoneInSection }) => {
              // Relief isn't a real room, so it gets a neutral header
              // instead of borrowing Float's colour — the app's colour
              // discipline reserves colour for actual room identification.
              const colors = isRelief
                ? { bg: "bg-sand-100", text: "text-charcoal/70", chip: "bg-charcoal/30" }
                : getRoomColorClasses(room.color);
              const ratioRow = ratioByRoomId.get(room.id);
              const visibleIds = new Set(people.map((p) => p.id));
              const hiddenCandidates = everyoneInSection.filter((s) => !visibleIds.has(s.id));
              return (
                <tbody key={key}>
                  <tr className={`border-b border-charcoal/10 ${colors.bg}`}>
                    <th
                      scope="colgroup"
                      className={`sticky left-0 z-10 px-4 py-2 text-left text-xs font-semibold uppercase tracking-wide ${colors.text} ${colors.bg}`}
                    >
                      {headerLabel}
                      {!isRelief && (
                        <span className="block text-[11px] font-normal normal-case opacity-70">Booked children</span>
                      )}
                    </th>
                    {WEEKDAY_KEYS.map((wd) => {
                      const cell = isRelief ? undefined : ratioRow?.cells[wd];
                      return (
                        <td key={wd} className={`px-3 py-2 text-sm font-semibold ${colors.text}`}>
                          {cell && cell.enrolledTotal > 0 ? cell.enrolledTotal : <span className="opacity-40">—</span>}
                        </td>
                      );
                    })}
                  </tr>

                  {people.length === 0 && everyoneInSection.length === 0 ? (
                    <tr className="border-b border-charcoal/5">
                      <td colSpan={6} className="px-4 py-2.5 text-xs text-charcoal/40">
                        Nobody&apos;s home room is set to {headerLabel} — set it on a staff profile&apos;s Overview tab.
                      </td>
                    </tr>
                  ) : people.length === 0 ? (
                    <tr className="border-b border-charcoal/5">
                      <td colSpan={6} className="px-4 py-2.5 text-xs text-charcoal/40">
                        Nobody from {headerLabel} is rostered on this week.
                      </td>
                    </tr>
                  ) : (
                    people.map((person) => {
                      const personShifts = days
                        .map((d) => shiftByStaffAndDate.get(`${person.id}__${d}`))
                        .filter((s): s is RosterShift => Boolean(s));
                      const hours = weeklyWorkedHours(personShifts);
                      const leaveDays = leaveDaysThisWeek(leave, person.id, days);

                      return (
                        <tr key={person.id} className="border-b border-charcoal/5 last:border-0">
                          <td className="sticky left-0 z-10 min-w-[180px] bg-white px-4 py-2.5 align-top font-medium text-charcoal">
                            {person.full_name}
                            <span className="block text-[11px] font-normal text-charcoal/40">
                              {hours > 0 ? `${hours}h worked` : "—"}
                              {leaveDays > 0 ? ` · ${leaveDays} day${leaveDays === 1 ? "" : "s"} leave` : ""}
                            </span>
                          </td>
                          {days.map((d) => {
                            const shift = shiftByStaffAndDate.get(`${person.id}__${d}`) ?? null;
                            const shiftRoom = shift?.room_id ? rooms.find((r) => r.id === shift.room_id) ?? null : null;
                            const shiftColors = getRoomColorClasses(shiftRoom?.color);
                            const dayLeave = dayLeaveFor(leave, person.id, d);
                            // Only Approved leave blocks the normal
                            // add-shift button and switches it to "Arrange
                            // cover" — a Requested day still shows the
                            // pill, but is otherwise rostered normally
                            // until it's actually approved.
                            const approvedLeave = dayLeave?.status === "approved" ? dayLeave : null;
                            const coveringElsewhere = shift && shiftRoom && shiftRoom.id !== room.id;

                            return (
                              <td key={d} className="px-1.5 py-1.5 align-top">
                                <div className="flex min-w-[110px] flex-col gap-1">
                                  {dayLeave && (
                                    <span
                                      className={`rounded-lg px-2.5 py-1.5 text-xs font-medium ${LEAVE_TONE[dayLeave.leave_type] ?? LEAVE_TONE.other} ${
                                        dayLeave.status === "requested" ? "border border-dashed border-current opacity-70" : ""
                                      }`}
                                      title={dayLeave.notes ?? undefined}
                                    >
                                      {STAFF_LEAVE_TYPE_LABEL[dayLeave.leave_type]}
                                      {dayLeave.status === "requested" ? " (requested)" : ""}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setEditing({ staffId: person.id, staffName: person.full_name, shiftDate: d, shift })
                                    }
                                    className={
                                      shift
                                        ? `flex w-full flex-col items-start gap-0.5 rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-opacity hover:opacity-75 ${shiftColors.bg} ${shiftColors.text}`
                                        : approvedLeave
                                          ? "flex w-full items-center justify-center rounded-lg border border-dashed border-charcoal/10 px-2.5 py-1.5 text-[11px] text-charcoal/30 hover:border-charcoal/30 hover:text-charcoal/50"
                                          : "flex w-full items-center justify-center rounded-lg border border-dashed border-charcoal/15 px-2.5 py-3 text-charcoal/25 hover:border-charcoal/30 hover:text-charcoal/50"
                                    }
                                  >
                                    {shift ? (
                                      <>
                                        <span>
                                          {formatTime(shift.start_time)} – {formatTime(shift.end_time)}
                                        </span>
                                        {coveringElsewhere && <span className="font-normal opacity-80">{shiftRoom!.name} cover</span>}
                                      </>
                                    ) : approvedLeave ? (
                                      "Arrange cover"
                                    ) : (
                                      <PlusIcon className="h-4 w-4" />
                                    )}
                                  </button>
                                </div>
                              </td>
                            );
                          })}
                        </tr>
                      );
                    })
                  )}

                  {hiddenCandidates.length > 0 && (
                    <tr className="border-b border-charcoal/5">
                      <td colSpan={6} className="px-4 py-2 align-top">
                        {addingSectionId === key ? (
                          <div className="flex flex-wrap items-center gap-2">
                            <select
                              value={addPickerValue}
                              onChange={(e) => setAddPickerValue(e.target.value)}
                              className="input w-auto min-w-[180px] py-1 text-xs"
                              autoFocus
                            >
                              <option value="">Choose a staff member…</option>
                              {hiddenCandidates.map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.full_name}
                                </option>
                              ))}
                            </select>
                            <button
                              type="button"
                              disabled={!addPickerValue}
                              className="btn-secondary px-2.5 py-1 text-xs disabled:opacity-40"
                              onClick={() => {
                                if (!addPickerValue) return;
                                setPinnedStaffIds((prev) => new Set(prev).add(addPickerValue));
                                setAddingSectionId(null);
                                setAddPickerValue("");
                              }}
                            >
                              Add
                            </button>
                            <button
                              type="button"
                              className="btn-ghost px-2.5 py-1 text-xs"
                              onClick={() => {
                                setAddingSectionId(null);
                                setAddPickerValue("");
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            className="flex items-center gap-1 text-xs font-medium text-charcoal/50 hover:text-charcoal"
                            onClick={() => setAddingSectionId(key)}
                          >
                            <PlusIcon className="h-3.5 w-3.5" />
                            Add someone from {headerLabel} to this week
                          </button>
                        )}
                      </td>
                    </tr>
                  )}
                </tbody>
              );
            })}
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-4">
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
          {staff.some((s) => s.is_relief) && (
            <span className="badge bg-sand-100 text-charcoal/70">
              <span className="h-2 w-2 rounded-full bg-charcoal/30" />
              Relief
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-3 border-l border-charcoal/10 pl-4">
          {STAFF_LEAVE_TYPES.map((t) => (
            <span key={t} className={`badge ${LEAVE_TONE[t]}`}>
              {STAFF_LEAVE_TYPE_LABEL[t]}
            </span>
          ))}
        </div>
      </div>
      </div>

      {editing && (
        <>
          <div className="fixed inset-0 z-40 bg-charcoal/20 md:hidden" onClick={() => setEditing(null)} aria-hidden="true" />
          <div className="fixed inset-0 z-50 md:sticky md:top-20 md:inset-auto md:z-auto md:max-h-[calc(100vh-6rem)] md:w-[26rem] md:shrink-0 md:rounded-xl md:border md:border-charcoal/10 md:bg-white md:shadow-cardHover">
            <RosterShiftPanel
              onClose={() => setEditing(null)}
              weekStartDate={weekStartDate}
              staffId={editing.staffId}
              staffName={editing.staffName}
              shiftDate={editing.shiftDate}
              rooms={rooms}
              existingShift={editing.shift}
            />
          </div>
        </>
      )}
    </div>
  );
}

import { StaffAvatar } from "@/components/staff/staff-avatar";
import { StatusBadge } from "@/components/status-badge";
import { getRoomColorClasses } from "@/lib/constants";
import type { RoomToday } from "@/lib/data/home";

/**
 * Phase 3 (Contra visual refit): was a grid of three separate bordered
 * cards; now a single bordered table, one row per room, matching Contra's
 * Jobs/Network row structure (see DESIGN_SYSTEM.md) — no per-room card, no
 * alternating row colours, just a header row and thin dividers between
 * rows. No "Actions" column: there's no per-room detail page or action
 * this app actually supports yet, so nothing is added there to look busy.
 */
export function RoomsToday({ rooms, isWeekend }: { rooms: RoomToday[]; isWeekend: boolean }) {
  if (isWeekend) {
    return (
      <p className="py-6 text-center text-sm text-charcoal/50">
        Beach Kids is closed on weekends — rooms will show here again on Monday.
      </p>
    );
  }

  if (rooms.length === 0) {
    return <p className="py-6 text-center text-sm text-charcoal/50">No rooms are set up in the Roster yet.</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-left text-sm">
        <thead>
          <tr className="border-b border-charcoal/10 text-xs font-medium text-charcoal/45">
            <th className="py-2 pr-4 font-medium">Room</th>
            <th className="py-2 pr-4 font-medium">Children</th>
            <th className="py-2 pr-4 font-medium">Staff</th>
            <th className="py-2 pr-4 font-medium">Ratio</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal/5">
          {rooms.map((r) => {
            const colors = getRoomColorClasses(r.room.color);
            const ratioKnown = r.minStaffRequired > 0;
            const ratioOk = r.staffCount >= r.minStaffRequired;

            return (
              <tr key={r.room.id}>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${colors.chip}`} />
                    <span className="font-medium text-charcoal">{r.room.name}</span>
                  </div>
                </td>
                <td className="py-3 pr-4 text-charcoal/70">{r.childCount}</td>
                <td className="py-3 pr-4">
                  {r.staffNames.length === 0 ? (
                    <span className="text-charcoal/40">No one rostered yet</span>
                  ) : (
                    <div className="flex items-center -space-x-1.5">
                      {r.staffNames.slice(0, 4).map((name) => (
                        <span key={name} title={name} className="ring-2 ring-white">
                          <StaffAvatar fullName={name} size="xs" />
                        </span>
                      ))}
                      {r.staffNames.length > 4 && (
                        <span className="pl-2.5 text-xs text-charcoal/45">+{r.staffNames.length - 4}</span>
                      )}
                    </div>
                  )}
                </td>
                <td className="py-3 pr-4">
                  {ratioKnown ? (
                    <StatusBadge tone={ratioOk ? "ready" : "action"}>
                      {r.staffCount}/{r.minStaffRequired} staff
                    </StatusBadge>
                  ) : (
                    <span className="text-charcoal/30">—</span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

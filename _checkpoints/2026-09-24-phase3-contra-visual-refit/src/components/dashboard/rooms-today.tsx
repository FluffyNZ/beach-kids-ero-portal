import { StaffAvatar } from "@/components/staff/staff-avatar";
import { getRoomColorClasses } from "@/lib/constants";
import type { RoomToday } from "@/lib/data/home";

export function RoomsToday({ rooms, isWeekend }: { rooms: RoomToday[]; isWeekend: boolean }) {
  if (isWeekend) {
    return (
      <div className="card px-6 py-10 text-center text-sm text-charcoal/50">
        Beach Kids is closed on weekends — rooms will show here again on Monday.
      </div>
    );
  }

  if (rooms.length === 0) {
    return (
      <div className="card px-6 py-10 text-center text-sm text-charcoal/50">
        No rooms are set up in the Roster yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
      {rooms.map((r) => {
        const colors = getRoomColorClasses(r.room.color);
        const ratioKnown = r.minStaffRequired > 0;
        const ratioOk = r.staffCount >= r.minStaffRequired;

        return (
          <div key={r.room.id} className="card flex flex-col gap-4 p-5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className={`h-2.5 w-2.5 shrink-0 rounded-full ${colors.chip}`} />
                <h3 className="text-base font-semibold text-charcoal">{r.room.name}</h3>
              </div>
              {ratioKnown && (
                <span
                  className={`badge ${ratioOk ? "bg-status-readyBg text-status-ready" : "bg-status-actionBg text-status-action"}`}
                >
                  {r.staffCount}/{r.minStaffRequired} staff
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-sm text-charcoal/60">
              <span>
                <span className="font-semibold text-charcoal">{r.childCount}</span> children expected
              </span>
              <span>
                <span className="font-semibold text-charcoal">{r.staffCount}</span> staff rostered
              </span>
            </div>

            {r.staffNames.length === 0 ? (
              <p className="text-xs text-charcoal/40">No one rostered here yet today</p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                {r.staffNames.map((name) => (
                  <span
                    key={name}
                    className="flex items-center gap-1.5 rounded-full bg-charcoal/5 py-1 pl-1 pr-2.5 text-xs font-medium text-charcoal/70"
                  >
                    <StaffAvatar fullName={name} size="xs" />
                    {name}
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

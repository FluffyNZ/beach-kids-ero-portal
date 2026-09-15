import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { getRoomColorClasses } from "@/lib/constants";
import { formatShortDate } from "@/lib/utils";
import type { HazardCheckSummary } from "@/lib/types";

export function HazardCheckCard({ check }: { check: HazardCheckSummary }) {
  const roomClasses = getRoomColorClasses(check.room_color);
  const allItemsChecked = check.itemsTotal > 0 && check.itemsChecked === check.itemsTotal;
  const allDaysSignedOff = check.totalWeekdays > 0 && check.daysSignedOff === check.totalWeekdays;

  return (
    <Link
      href={`/records/hazards/${check.id}`}
      className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-cardHover"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${roomClasses.bg} ${roomClasses.text}`}>
        {check.room_name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-charcoal">{check.room_name}</p>
          {allDaysSignedOff ? (
            <StatusBadge tone="ready">
              {check.daysSignedOff}/{check.totalWeekdays} days signed off
            </StatusBadge>
          ) : (
            <StatusBadge tone="attention">
              {check.daysSignedOff}/{check.totalWeekdays} days signed off
            </StatusBadge>
          )}
          {check.openHazardCount > 0 && (
            <StatusBadge tone="action">
              {check.openHazardCount} open hazard{check.openHazardCount === 1 ? "" : "s"}
            </StatusBadge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-charcoal/50">
          Week of {formatShortDate(check.week_start_date)} · {check.itemsChecked}/{check.itemsTotal} items ticked
          {allItemsChecked ? " (all)" : ""}
        </p>
      </div>
    </Link>
  );
}

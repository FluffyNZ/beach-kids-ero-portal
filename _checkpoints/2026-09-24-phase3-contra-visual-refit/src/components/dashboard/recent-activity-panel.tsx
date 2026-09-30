import { formatDateTime } from "@/lib/utils";
import type { RecentActivityItem } from "@/lib/data/home";

/**
 * Reads the app's real `activity_log` table (see lib/data/home.ts). Nothing
 * currently writes to it, so today this will always render the empty state
 * below rather than a fabricated feed — that's intentional, not a bug.
 */
export function RecentActivityPanel({ items }: { items: RecentActivityItem[] }) {
  if (items.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-5 py-10 text-center">
        <p className="text-sm font-medium text-charcoal">No recent activity yet</p>
        <p className="text-xs text-charcoal/45">
          This will fill in automatically as activity logging gets wired into more of the app.
        </p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-charcoal/5">
      {items.map((item) => (
        <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3">
          <p className="truncate text-sm text-charcoal">{item.description}</p>
          <span className="shrink-0 text-xs text-charcoal/45">{formatDateTime(item.createdAt)}</span>
        </div>
      ))}
    </div>
  );
}

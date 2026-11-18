import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import type { ActivityEntry } from "@/lib/data/home-dashboard";

const timeFormat = new Intl.DateTimeFormat("en-NZ", {
  timeZone: "Pacific/Auckland",
  day: "numeric",
  month: "short",
  hour: "numeric",
  minute: "2-digit",
});

function when(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? "" : timeFormat.format(d);
}

/** The latest changes to ERO self-review records, in plain words
 * ("Evidence marked as not required") rather than raw field values. */
export function RecentActivity({ entries }: { entries: ActivityEntry[] }) {
  return (
    <Panel id="recent-activity" title="Recent activity" description="Latest changes to your ERO self-review.">
      {entries.length === 0 ? (
        <EmptyState title="No recent activity" description="Changes to ERO criteria, evidence and tasks will show here." />
      ) : (
        <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
          {entries.map((entry) => (
            <li key={entry.id} className="flex flex-col gap-0.5 px-5 py-3 sm:flex-row sm:items-baseline sm:justify-between sm:gap-4">
              <p className="min-w-0 text-sm text-charcoal">
                {entry.text}
                {entry.context && (
                  <>
                    {" · "}
                    <Link
                      href={entry.context.href}
                      className="rounded font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
                    >
                      {entry.context.label}
                    </Link>
                  </>
                )}
              </p>
              <time dateTime={entry.at} className="shrink-0 text-xs text-charcoal/70">
                {when(entry.at)}
              </time>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

import Link from "next/link";
import { getMonthlyTracker, currentMonthKey, monthLabel as monthLabelFor } from "@/lib/data/learning-stories";
import { MonthNav } from "@/components/learning-stories/month-nav";
import { StatusBadge } from "@/components/status-badge";
import { LEARNING_STORY_STATUS_LABEL, getRoomColorClasses, trackerCellTone } from "@/lib/constants";

export const dynamic = "force-dynamic";

export default async function LearningStoriesTrackerPage({
  searchParams,
}: {
  searchParams: { month?: string };
}) {
  const monthKey = searchParams.month || currentMonthKey();
  const rows = await getMonthlyTracker(monthKey);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Monthly Story Tracker</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Every active child, by room — computed live from actual learning-story records.
          </p>
        </div>
        <Link href="/learning/stories" className="btn-ghost">
          ← Learning Stories
        </Link>
      </div>

      <MonthNav monthKey={monthKey} monthLabel={monthLabelFor(monthKey)} basePath="/learning/stories/tracker" />

      <div className="flex flex-wrap gap-3 text-xs text-charcoal/60">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-ready" /> Published
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-attention" /> Draft / Awaiting Approval
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-action" /> No Story
        </span>
      </div>

      {rows.map((row) => {
        const colors = getRoomColorClasses(row.room?.color);
        return (
          <section key={row.room?.id ?? "unassigned"} className="card overflow-hidden p-0">
            <div className={`flex items-center gap-2 px-4 py-3 ${colors.bg}`}>
              <span className={`h-2.5 w-2.5 rounded-full ${colors.chip}`} />
              <h2 className={`font-display text-sm font-semibold ${colors.text}`}>
                {row.room?.name ?? "No room assigned"}
              </h2>
              <span className="text-xs text-charcoal/40">
                {row.children.length} {row.children.length === 1 ? "child" : "children"}
              </span>
            </div>

            {row.children.length === 0 ? (
              <p className="px-4 py-4 text-sm text-charcoal/40">No active children in this room.</p>
            ) : (
              <div className="divide-y divide-charcoal/5">
                {row.children.map((child) => {
                  const label = child.status === "none" ? "No Story" : LEARNING_STORY_STATUS_LABEL[child.status];
                  const badge = <StatusBadge tone={trackerCellTone(child.status)}>{label}</StatusBadge>;
                  return (
                    <div key={child.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                      <Link href={`/children/${child.id}#learning-stories`} className="text-sm font-medium text-charcoal hover:text-burgundy-600">
                        {child.full_name}
                      </Link>
                      {child.storyId ? <Link href={`/learning/stories/${child.storyId}`}>{badge}</Link> : badge}
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}

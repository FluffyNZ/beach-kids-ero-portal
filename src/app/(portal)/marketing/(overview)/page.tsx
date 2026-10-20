import Link from "next/link";
import {
  getMarketingOverviewStats,
  getMarketingPosts,
  getMarketingSuggestions,
  getMarketingSettings,
  getMarketingCalendarMonth,
} from "@/lib/data/marketing";
import { MarketingStatCard } from "@/components/marketing/stat-card";
import { MarketingPostListRow } from "@/components/marketing/post-list-row";
import { SuggestionCard } from "@/components/marketing/suggestion-card";
import { MarketingSettingsForm } from "@/components/marketing/marketing-settings-form";
import { MarketingCalendarGrid } from "@/components/marketing/marketing-calendar-grid";
import { todayIso } from "@/lib/marketing/timezone";

export const dynamic = "force-dynamic";

export default async function MarketingOverviewPage() {
  const monthKey = todayIso().slice(0, 7);
  const [stats, scheduled, drafts, suggestions, settings, calendarWeeks] = await Promise.all([
    getMarketingOverviewStats(),
    getMarketingPosts("scheduled"),
    getMarketingPosts("draft"),
    getMarketingSuggestions(),
    getMarketingSettings(),
    getMarketingCalendarMonth(monthKey),
  ]);

  const monthLabel = new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" });

  return (
    <div className="flex flex-col gap-6">
      {stats.failedCount > 0 && (
        <div className="card border-status-action/30 bg-status-actionBg p-4 text-sm text-status-action">
          {stats.failedCount} platform {stats.failedCount === 1 ? "publish" : "publishes"} failed and need attention —
          see the <Link href="/marketing/published" className="font-semibold underline">Published</Link> tab.
        </div>
      )}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <MarketingStatCard
          label="Monthly goal"
          value={`${stats.publishedThisMonth}/${stats.monthlyGoal}`}
          sublabel="posts published this month"
        />
        <MarketingStatCard label="Scheduled" value={String(stats.scheduledCount)} sublabel="waiting to go out" />
        <MarketingStatCard label="Drafts" value={String(stats.draftCount)} sublabel="not yet scheduled" />
        <MarketingStatCard label="Needs attention" value={String(stats.failedCount)} tone={stats.failedCount > 0 ? "action" : undefined} sublabel="failed platform publishes" />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="flex flex-col gap-6 lg:col-span-2">
          <section className="flex flex-col gap-3">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Upcoming posts</h2>
            {scheduled.length === 0 && drafts.length === 0 ? (
              <div className="card flex flex-col items-center gap-1 px-5 py-10 text-center">
                <p className="text-sm font-medium text-charcoal">Nothing drafted or scheduled yet</p>
                <p className="text-xs text-charcoal/45">Use "+ Create post" above, or try one of the ideas on the right.</p>
              </div>
            ) : (
              <div className="card flex flex-col divide-y divide-charcoal/5">
                {[...scheduled, ...drafts].slice(0, 8).map((post) => (
                  <MarketingPostListRow key={post.id} post={post} />
                ))}
              </div>
            )}
          </section>

          <section className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Your content plan — {monthLabel}</h2>
              <Link href="/marketing/calendar" className="text-xs font-medium text-ocean-600 hover:underline">
                Full calendar →
              </Link>
            </div>
            <MarketingCalendarGrid weeks={calendarWeeks} monthLabel={monthLabel} />
          </section>
        </div>

        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Ideas for your next post</h2>
          {suggestions.length === 0 ? (
            <p className="text-xs text-charcoal/45">No suggestions right now.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {suggestions
                .filter((s) => !s.alreadyDrafted)
                .slice(0, 6)
                .map((s) => (
                  <SuggestionCard key={s.key} suggestion={s} />
                ))}
            </div>
          )}
        </section>
      </div>

      <MarketingSettingsForm settings={settings} />
    </div>
  );
}

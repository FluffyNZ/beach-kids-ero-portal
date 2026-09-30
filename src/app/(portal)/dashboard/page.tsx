import { getCurrentProfile } from "@/lib/data/profiles";
import { getNeedsAttention } from "@/lib/data/dashboard";
import { getTodaySummary, getRoomsToday, getUpcomingEvents, getRecentActivity } from "@/lib/data/home";
import { formatLongDate } from "@/lib/utils";
import { HomeHeader } from "@/components/dashboard/home-header";
import { TodaySummaryInline } from "@/components/dashboard/today-summary";
import { RoomsToday } from "@/components/dashboard/rooms-today";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { UpcomingPanel } from "@/components/dashboard/upcoming-panel";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";

export const dynamic = "force-dynamic";

function greetingForHour(hour: number): string {
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

// This is the operational Home screen for Beach Kids management and staff —
// not an ERO dashboard. The ERO readiness overview that used to live here
// (the readiness ring and the "at a glance" compliance tiles) has moved to
// the top of /checklist, which is where "ERO & Compliance" in the sidebar
// now points — nothing was deleted, it just has a more fitting home.
export default async function DashboardPage() {
  const [profile, summary, rooms, needsAttention, upcoming, recentActivity] = await Promise.all([
    getCurrentProfile(),
    getTodaySummary(),
    getRoomsToday(),
    getNeedsAttention(6),
    getUpcomingEvents(14),
    getRecentActivity(8),
  ]);

  const rawFirstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  const now = new Date();
  const greeting = `${greetingForHour(now.getHours())}, ${firstName}`;
  const dateLabel = formatLongDate(now);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
      <HomeHeader greeting={greeting} dateLabel={dateLabel} />

      {/* Phase 3 (Contra visual refit): "Today at Beach Kids" and "Rooms
          today" used to be two separately-carded sections; they're now one
          bordered workspace surface, per DESIGN_SYSTEM.md's Phase 3 notes —
          the inline metrics row sits above a divider, the rooms table below
          it, both inside the same surface rather than fragmented further. */}
      <section className="card overflow-hidden">
        <div className="border-b border-charcoal/10 p-5">
          <h2 className="mb-3 text-sm font-semibold text-charcoal">Today at Beach Kids</h2>
          <TodaySummaryInline summary={summary} />
        </div>
        <div className="p-5">
          <h2 className="mb-3 text-sm font-semibold text-charcoal">Rooms today</h2>
          <RoomsToday rooms={rooms} isWeekend={summary.isWeekend} />
        </div>
      </section>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-charcoal">Needs attention</h2>
          <NeedsAttention items={needsAttention} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-charcoal">Upcoming</h2>
          <UpcomingPanel events={upcoming} />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Recent activity</h2>
        <RecentActivityPanel items={recentActivity} />
      </section>
    </div>
  );
}

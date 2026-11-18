import { getCurrentProfile } from "@/lib/data/profiles";
import {
  getHeaderInfo,
  getTodayOverview,
  getAttentionItems,
  getComingUp,
  getActivityEntries,
} from "@/lib/data/home-dashboard";
import { DashboardHeader } from "@/components/home/dashboard-header";
import { TodayPanel } from "@/components/home/today-panel";
import { AttentionList } from "@/components/home/attention-list";
import { RoomOverview } from "@/components/home/room-overview";
import { ComingUp } from "@/components/home/coming-up";
import { QuickActions } from "@/components/home/quick-actions";
import { RecentActivity } from "@/components/home/recent-activity";

export const dynamic = "force-dynamic";

// The Earlydesk Home screen — the operational "what's happening today and
// what needs doing" view for Beach Kids. Everything shown comes from real
// records; where a record doesn't exist yet (no roster this week, no
// attendance sign-in) it says so rather than showing a misleading zero.
// All dates are worked out in NZ time (see lib/data/home-dashboard.ts).
//
// Layout: on phones it's a single column in priority order — Today, Needs
// attention, Rooms, Coming up, Quick actions, Recent activity. On large
// screens the main column holds attention / rooms / activity and the right
// column stacks Coming up and Quick actions. (The ERO readiness overview
// lives at the top of /checklist; the weekly booked-sessions roll lives at
// /roster/attendance-roll.)
export default async function DashboardPage() {
  const profile = await getCurrentProfile();
  const header = getHeaderInfo(profile?.full_name);

  const overview = await getTodayOverview();
  const [attention, comingUp, activity] = await Promise.all([
    getAttentionItems(overview),
    getComingUp(header.today),
    getActivityEntries(6),
  ]);
  const urgentCount = attention.filter((a) => a.urgency === "high").length;

  return (
    <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-6">
      <DashboardHeader greeting={header.greeting} dateLabel={header.dateLabel} centreName="Beach Kids Waihi" />

      <TodayPanel overview={overview} attentionCount={attention.length} urgentCount={urgentCount} />

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 lg:row-start-1">
          <AttentionList items={attention} />
        </div>
        <div className="lg:col-span-2 lg:row-start-2">
          <RoomOverview
            rooms={overview.rooms}
            weekStart={overview.weekStart}
            rosterEntered={overview.rosterEntered}
            closedReason={overview.closedReason}
          />
        </div>
        <div className="flex flex-col gap-6 lg:col-start-3 lg:row-span-3 lg:row-start-1">
          <ComingUp items={comingUp} today={header.today} />
          <QuickActions />
        </div>
        <div className="lg:col-span-2 lg:col-start-1 lg:row-start-3">
          <RecentActivity entries={activity} />
        </div>
      </div>
    </div>
  );
}

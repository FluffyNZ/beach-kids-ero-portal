import Link from "next/link";
import { getCurrentProfile } from "@/lib/data/profiles";
import { getNeedsAttention } from "@/lib/data/dashboard";
import { getTodaySummary, getRoomsToday, getUpcomingEvents, getRecentActivity } from "@/lib/data/home";
import { getAttendanceRoll } from "@/lib/data/attendance-roll";
import { getUpcomingFamilyReminders } from "@/lib/data/email";
import { formatLongDate, mondayOf, addDays } from "@/lib/utils";
import { HomeHeader } from "@/components/dashboard/home-header";
import { TodaySummaryInline } from "@/components/dashboard/today-summary";
import { RoomsToday } from "@/components/dashboard/rooms-today";
import { NeedsAttention } from "@/components/dashboard/needs-attention";
import { UpcomingPanel } from "@/components/dashboard/upcoming-panel";
import { EmailRemindersCard } from "@/components/dashboard/email-reminders-card";
import { RecentActivityPanel } from "@/components/dashboard/recent-activity-panel";
import { WeeklyBookedSessionsCard } from "@/components/dashboard/weekly-booked-sessions-card";

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
  const nextWeekStartDate = addDays(mondayOf(new Date()), 7);

  const [profile, summary, rooms, needsAttention, upcomingEvents, recentActivity, bookedSessionsRooms, familyReminders] = await Promise.all([
    getCurrentProfile(),
    getTodaySummary(),
    getRoomsToday(),
    getNeedsAttention(6),
    getUpcomingEvents(14),
    getRecentActivity(8),
    getAttendanceRoll(),
    // Guarded the same way as the sidebar badge (see the portal layout) —
    // this depends on the 0050 migration, and Home must never 500 just
    // because that migration hasn't been run yet.
    getUpcomingFamilyReminders(7).catch(() => []),
  ]);

  // getUpcomingFamilyReminders (above) already covers child birthdays, in
  // more detail (turning age, and whether an email's been drafted/sent) —
  // it drives the "Birthdays, starters & farewells" panel below. Filtering
  // child_birthday out of the general calendar events here means that one
  // isn't shown a second time in "Staff & dates"; staff birthdays, staff
  // leave and public holidays have no equivalent elsewhere, so they stay.
  const staffAndDateEvents = upcomingEvents.filter((e) => e.kind !== "child_birthday");

  const rawFirstName = profile?.full_name?.trim().split(/\s+/)[0] || "there";
  const firstName = rawFirstName.charAt(0).toUpperCase() + rawFirstName.slice(1);
  const now = new Date();
  const greeting = `${greetingForHour(now.getHours())}, ${firstName}`;
  const dateLabel = formatLongDate(now);

  return (
    <div className="mx-auto flex w-full max-w-[1600px] flex-col gap-8">
      <HomeHeader greeting={greeting} dateLabel={dateLabel} />

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Today</h2>
        <div className="card flex flex-col divide-y divide-charcoal/5">
          <div className="p-5">
            <TodaySummaryInline summary={summary} />
          </div>
          <div className="p-5">
            <RoomsToday rooms={rooms} isWeekend={summary.isWeekend} />
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <section className="flex flex-col gap-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-lg font-semibold text-charcoal">Birthdays, starters & farewells</h2>
            <Link href="/email" className="text-xs font-medium text-charcoal/60 hover:text-charcoal hover:underline">
              Open Email →
            </Link>
          </div>
          <EmailRemindersCard reminders={familyReminders} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-charcoal">Needs attention</h2>
          <NeedsAttention items={needsAttention} />
        </section>

        <section className="flex flex-col gap-3">
          <h2 className="text-lg font-semibold text-charcoal">Staff & dates</h2>
          <UpcomingPanel events={staffAndDateEvents} />
        </section>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Weekly booked sessions</h2>
        <WeeklyBookedSessionsCard rooms={bookedSessionsRooms} nextWeekStartDate={nextWeekStartDate} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-semibold text-charcoal">Recent activity</h2>
        <RecentActivityPanel items={recentActivity} />
      </section>
    </div>
  );
}

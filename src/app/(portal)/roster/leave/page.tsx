import Link from "next/link";
import { getStaffList } from "@/lib/data/staff";
import { getStaffLeaveForRange } from "@/lib/data/calendar";
import { addDays, mondayOf, formatShortDate } from "@/lib/utils";
import { RosterNav } from "@/components/roster/roster-nav";
import { StaffLeaveManager } from "@/components/calendar/staff-leave-manager";

export const dynamic = "force-dynamic";

/** Reuses the same staff_leave table, actions and editor (StaffLeaveManager)
 * already built for the Calendar area — booking leave here and on Calendar
 * are the same records, not a second parallel system.
 *
 * Phase 1 only: partial-day leave, a Requested/Approved/Declined/Cancelled
 * status, the Unavailable and Normal day off types, and private
 * management-only notes all need a schema change of their own (see the
 * Roster redesign report) and aren't faked here — today every booked leave
 * entry is whole-day and has no status, same as on Calendar. */
export default async function RosterLeavePage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const requested = searchParams.week ? new Date(`${searchParams.week}T00:00:00Z`) : new Date();
  const weekStartDate = Number.isNaN(requested.getTime()) ? mondayOf(new Date()) : mondayOf(requested);

  const [staff, leave] = await Promise.all([
    getStaffList({ status: "active" }),
    getStaffLeaveForRange(weekStartDate, addDays(weekStartDate, 5)),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-charcoal md:text-3xl">Roster</h1>
        <p className="mt-1 text-sm text-charcoal/60">Leave booked this week, and where weekly availability lives.</p>
      </div>

      <RosterNav weekStartDate={weekStartDate} />

      <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
        <div className="flex items-center gap-1.5">
          <Link href={`/roster/leave?week=${addDays(weekStartDate, -7)}`} className="btn-ghost px-2.5">
            ← Prev week
          </Link>
          <span className="px-2 text-sm font-semibold text-charcoal">
            {formatShortDate(weekStartDate)} – {formatShortDate(addDays(weekStartDate, 4))}
          </span>
          <Link href={`/roster/leave?week=${addDays(weekStartDate, 7)}`} className="btn-ghost px-2.5">
            Next week →
          </Link>
        </div>
      </div>

      <StaffLeaveManager leave={leave} staffOptions={staff.map((s) => ({ id: s.id, full_name: s.full_name }))} />

      <div className="card p-5 text-sm text-charcoal/60">
        Each person&apos;s regular weekly availability (the template used to flag conflicts, distinct from the leave
        above) is set on their own profile — open a staff member&apos;s page and use the Overview tab&apos;s
        Availability section.
      </div>
    </div>
  );
}

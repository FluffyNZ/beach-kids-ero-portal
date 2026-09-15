import Link from "next/link";
import { getWeeklyFeesSummary } from "@/lib/data/fees";
import { mondayOf } from "@/lib/utils";
import { FeesWeekNav } from "@/components/children/fees-week-nav";
import { WeeklyHoursGrid } from "@/components/children/weekly-hours-grid";

export const dynamic = "force-dynamic";

export default async function WeeklyHoursPage({
  searchParams,
}: {
  searchParams: { week?: string };
}) {
  const requested = searchParams.week ? new Date(`${searchParams.week}T00:00:00Z`) : new Date();
  const weekStartDate = Number.isNaN(requested.getTime()) ? mondayOf(new Date()) : mondayOf(requested);

  const summary = await getWeeklyFeesSummary(weekStartDate);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Weekly Hours</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Each child&apos;s usual booked days/times fill this in automatically — adjust for holidays, absences or
            extra days, then save to confirm what actually happened this week.
          </p>
        </div>
        <Link href="/children" className="btn-ghost">
          ← Children &amp; Fees
        </Link>
      </div>

      <FeesWeekNav weekStartDate={weekStartDate} basePath="/children/hours" />

      {!summary.hasAnyHoursEntered && (
        <div className="card border-l-4 border-l-status-attention p-4 text-sm text-charcoal/70">
          Nobody&apos;s actual hours have been confirmed for this week yet — the figures below are estimated from
          each child&apos;s enrolled schedule. Save to confirm a child&apos;s real hours for this specific week.
        </div>
      )}

      <WeeklyHoursGrid weekStartDate={weekStartDate} children={summary.children} />
    </div>
  );
}

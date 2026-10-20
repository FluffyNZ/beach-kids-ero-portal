import { getMarketingCalendarMonth } from "@/lib/data/marketing";
import { MarketingCalendarGrid } from "@/components/marketing/marketing-calendar-grid";
import { todayIso } from "@/lib/marketing/timezone";
import { addMonths } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function MarketingCalendarPage({ searchParams }: { searchParams: { month?: string } }) {
  const monthKey = searchParams.month && /^\d{4}-\d{2}$/.test(searchParams.month) ? searchParams.month : todayIso().slice(0, 7);
  const weeks = await getMarketingCalendarMonth(monthKey);

  const monthLabel = new Date(`${monthKey}-01T00:00:00Z`).toLocaleDateString("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" });
  const prevMonth = addMonths(`${monthKey}-01`, -1).slice(0, 7);
  const nextMonth = addMonths(`${monthKey}-01`, 1).slice(0, 7);

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-charcoal/60">
        Scheduled and published posts, plus NZ public holidays for reference. Click a post to open it.
      </p>
      <MarketingCalendarGrid
        weeks={weeks}
        monthLabel={monthLabel}
        prevHref={`/marketing/calendar?month=${prevMonth}`}
        nextHref={`/marketing/calendar?month=${nextMonth}`}
      />
    </div>
  );
}

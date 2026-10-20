import Link from "next/link";
import type { MarketingCalendarWeek } from "@/lib/types";
import { cn } from "@/lib/utils";
import { todayIso } from "@/lib/marketing/timezone";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function MarketingCalendarGrid({
  weeks,
  monthLabel,
  prevHref,
  nextHref,
}: {
  weeks: MarketingCalendarWeek[];
  monthLabel: string;
  prevHref?: string;
  nextHref?: string;
}) {
  const today = todayIso();

  return (
    <div className="card overflow-hidden p-0">
      <div className="flex items-center justify-between border-b border-charcoal/10 px-4 py-3">
        <p className="text-sm font-semibold text-charcoal">{monthLabel}</p>
        {(prevHref || nextHref) && (
          <div className="flex gap-1">
            {prevHref && (
              <Link href={prevHref} className="btn-ghost px-2.5 py-1 text-xs">
                ← Prev
              </Link>
            )}
            {nextHref && (
              <Link href={nextHref} className="btn-ghost px-2.5 py-1 text-xs">
                Next →
              </Link>
            )}
          </div>
        )}
      </div>

      <div className="grid grid-cols-7 border-b border-charcoal/10 bg-lilac-50 text-center text-[11px] font-semibold uppercase tracking-wide text-charcoal/50">
        {WEEKDAY_LABELS.map((d) => (
          <div key={d} className="py-1.5">
            {d}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {weeks.flatMap((week) =>
          week.days.map((day) => (
            <div
              key={day.date}
              className={cn(
                "flex min-h-[86px] flex-col gap-1 border-b border-r border-charcoal/5 p-1.5 last:border-r-0",
                !day.inMonth && "bg-charcoal/[0.02]",
                day.date === today && "bg-lilac-50"
              )}
            >
              <p className={cn("text-xs", day.inMonth ? "text-charcoal/70" : "text-charcoal/30")}>{Number(day.date.slice(8, 10))}</p>
              {day.publicHoliday && <p className="truncate text-[10px] text-ocean-600">{day.publicHoliday.name}</p>}
              {day.posts.map((post) => (
                <Link
                  key={post.id}
                  href={`/marketing/posts/${post.id}`}
                  className={cn(
                    "truncate rounded px-1 py-0.5 text-[10px] font-medium",
                    post.status === "published" ? "bg-kelp-50 text-kelp-600" : "bg-burgundy-50 text-burgundy-500"
                  )}
                >
                  {post.caption.trim() || "(no caption)"}
                </Link>
              ))}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { addDays, addMonths, mondayOfDateString, nzTodayDateString } from "@/lib/utils";
import { MAX_MONTH_SPAN } from "@/lib/sunblock-format";

export type SunblockRoomOption = { id: string; name: string };
export type SunblockPeriodType = "week" | "month" | "months";


/** Builds the `/children/sunblock` URL for a selection. The page derives
 * everything (which weeks, which rooms) from these same params. */
export function buildSunblockUrl(params: {
  period: SunblockPeriodType;
  week: string;
  month: string;
  from: string;
  to: string;
  roomId: string;
}) {
  const qs = new URLSearchParams();
  qs.set("period", params.period);
  if (params.period === "week") qs.set("week", params.week);
  if (params.period === "month") qs.set("month", params.month);
  if (params.period === "months") {
    qs.set("from", params.from);
    qs.set("to", params.to);
  }
  if (params.roomId) qs.set("room", params.roomId);
  return `/children/sunblock?${qs.toString()}`;
}

const labelCls = "mb-1.5 block text-sm font-medium text-charcoal";
const fieldCls = "input py-1.5";

function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** Room, period and week/month pickers, a summary of what will print and
 * the one Print charts button. */
export function SunblockChartControls({
  period,
  week,
  month,
  from,
  to,
  roomId,
  rooms,
  summary,
  onPrint,
}: {
  period: SunblockPeriodType;
  week: string;
  month: string;
  from: string;
  to: string;
  roomId: string;
  rooms: SunblockRoomOption[];
  summary: { rooms: number; weeks: number; pages: number; rangeLabel: string };
  onPrint: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  function go(next: Partial<{ period: SunblockPeriodType; week: string; month: string; from: string; to: string; roomId: string }>) {
    const url = buildSunblockUrl({
      period: next.period ?? period,
      week: next.week ?? week,
      month: next.month ?? month,
      from: next.from ?? from,
      to: next.to ?? to,
      roomId: next.roomId ?? roomId,
    });
    startTransition(() => router.push(url, { scroll: false }));
  }

  const thisWeek = mondayOfDateString(nzTodayDateString());
  const maxTo = addMonths(`${from}-01`, MAX_MONTH_SPAN - 1).slice(0, 7);

  return (
    <section aria-label="Chart options" className="card flex flex-col gap-4 p-4 print:hidden sm:p-5">
      <div className="flex flex-wrap items-end gap-x-4 gap-y-3">
        <div className="w-full min-[480px]:w-44">
          <label htmlFor="sunblock-room" className={labelCls}>
            Room
          </label>
          <select id="sunblock-room" value={roomId} onChange={(e) => go({ roomId: e.target.value })} className={fieldCls}>
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>

        <div className="w-full min-[480px]:w-44">
          <label htmlFor="sunblock-period" className={labelCls}>
            Period
          </label>
          <select
            id="sunblock-period"
            value={period}
            onChange={(e) => go({ period: e.target.value as SunblockPeriodType })}
            className={fieldCls}
          >
            <option value="week">One week</option>
            <option value="month">One month</option>
            <option value="months">Several months</option>
          </select>
        </div>

        {period === "week" && (
          <div>
            <label htmlFor="sunblock-week" className={labelCls}>
              Week starting
            </label>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => go({ week: addDays(week, -7) })}
                className="btn-secondary px-2.5 py-1.5"
                aria-label="Previous week"
              >
                ←
              </button>
              <input
                id="sunblock-week"
                type="date"
                value={week}
                onChange={(e) => {
                  if (e.target.value) go({ week: mondayOfDateString(e.target.value) });
                }}
                className={`${fieldCls} w-40`}
              />
              <button
                type="button"
                onClick={() => go({ week: addDays(week, 7) })}
                className="btn-secondary px-2.5 py-1.5"
                aria-label="Next week"
              >
                →
              </button>
              {week !== thisWeek && (
                <button type="button" onClick={() => go({ week: thisWeek })} className="btn-ghost px-2.5 py-1.5">
                  This week
                </button>
              )}
            </div>
          </div>
        )}

        {period === "month" && (
          <div>
            <label htmlFor="sunblock-month" className={labelCls}>
              Month
            </label>
            <input
              id="sunblock-month"
              type="month"
              value={month}
              onChange={(e) => {
                if (e.target.value) go({ month: e.target.value });
              }}
              className={`${fieldCls} w-44`}
            />
          </div>
        )}

        {period === "months" && (
          <div className="flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="sunblock-from" className={labelCls}>
                From
              </label>
              <input
                id="sunblock-from"
                type="month"
                value={from}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  const limit = addMonths(`${v}-01`, MAX_MONTH_SPAN - 1).slice(0, 7);
                  go({ from: v, to: to < v ? v : to > limit ? limit : to });
                }}
                className={`${fieldCls} w-44`}
              />
            </div>
            <div>
              <label htmlFor="sunblock-to" className={labelCls}>
                To
              </label>
              <input
                id="sunblock-to"
                type="month"
                value={to}
                min={from}
                max={maxTo}
                onChange={(e) => {
                  const v = e.target.value;
                  if (!v) return;
                  go({ to: v < from ? from : v > maxTo ? maxTo : v });
                }}
                className={`${fieldCls} w-44`}
              />
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-charcoal/10 pt-4">
        <div aria-live="polite" className={pending ? "opacity-60" : undefined}>
          <p className="text-base font-semibold text-charcoal">
            {plural(summary.rooms, "room", "rooms")} · {plural(summary.weeks, "week", "weeks")} ·{" "}
            {plural(summary.pages, "page", "pages")}
          </p>
          <p className="text-sm text-charcoal/70">
            {pending ? "Updating…" : summary.rangeLabel}
            {period === "months" && !pending && ` · up to ${MAX_MONTH_SPAN} months at a time`}
          </p>
        </div>
        <button type="button" className="btn-primary" onClick={onPrint} disabled={summary.pages === 0 || pending}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4" aria-hidden="true">
            <path d="M5.5 7.5V3h9v4.5M5.5 14.5h-2v-6a1 1 0 0 1 1-1h11a1 1 0 0 1 1 1v6h-2" strokeLinejoin="round" />
            <path d="M5.5 11.5h9V17h-9z" strokeLinejoin="round" />
          </svg>
          Print charts
        </button>
      </div>
    </section>
  );
}

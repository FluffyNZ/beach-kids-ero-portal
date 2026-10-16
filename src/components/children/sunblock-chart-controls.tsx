"use client";

import { useRouter } from "next/navigation";
import { addDays, mondayOf, nzTodayDateString } from "@/lib/utils";

export type SunblockRoomOption = { id: string; name: string };
export type SunblockPeriodType = "week" | "month" | "months";

/** Builds the `/children/sunblock` URL for a given period selection — the
 * page itself derives everything (which weeks to print, from/to labels)
 * from these same params, so this is the one place that owns the URL
 * shape. `week` is used by the controls' own Prev/Next-week buttons, which
 * only make sense in "week" mode. */
function buildUrl(params: {
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

/** The Sunblock Charts controls: pick one week, one month, or a range of
 * months, plus an optional single-room filter. The page re-renders the
 * on-screen chart(s) straight from these — that live view *is* the
 * preview; Print / Save PDF (shown alongside this, not part of this
 * component) prints exactly what's on screen. */
export function SunblockChartControls({
  period,
  week,
  month,
  from,
  to,
  roomId,
  rooms,
}: {
  period: SunblockPeriodType;
  week: string;
  month: string;
  from: string;
  to: string;
  roomId: string;
  rooms: SunblockRoomOption[];
}) {
  const router = useRouter();

  function go(next: Partial<{ period: SunblockPeriodType; week: string; month: string; from: string; to: string; roomId: string }>) {
    router.push(
      buildUrl({
        period: next.period ?? period,
        week: next.week ?? week,
        month: next.month ?? month,
        from: next.from ?? from,
        to: next.to ?? to,
        roomId: next.roomId ?? roomId,
      })
    );
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 px-4 py-3 print:hidden">
      <div className="flex items-center gap-1.5">
        <label htmlFor="sunblock-period" className="text-sm text-charcoal/60">
          Show
        </label>
        <select
          id="sunblock-period"
          value={period}
          onChange={(e) => go({ period: e.target.value as SunblockPeriodType })}
          className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-burgundy-400 focus:outline-none focus:ring-2 focus:ring-burgundy-500/20"
        >
          <option value="week">One week</option>
          <option value="month">One month</option>
          <option value="months">Several months</option>
        </select>
      </div>

      {period === "week" && (
        <>
          <button type="button" onClick={() => go({ week: addDays(week, -7) })} className="btn-ghost px-2.5">
            ← Prev week
          </button>
          <input
            type="date"
            value={week}
            onChange={(e) => {
              if (!e.target.value) return;
              go({ week: mondayOf(new Date(`${e.target.value}T00:00:00Z`)) });
            }}
            className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-burgundy-400 focus:outline-none focus:ring-2 focus:ring-burgundy-500/20"
          />
          <button type="button" onClick={() => go({ week: addDays(week, 7) })} className="btn-ghost px-2.5">
            Next week →
          </button>
          <button
            type="button"
            onClick={() => go({ week: mondayOf(new Date(`${nzTodayDateString()}T00:00:00Z`)) })}
            className="btn-ghost px-2.5 text-xs"
          >
            This week
          </button>
        </>
      )}

      {period === "month" && (
        <input
          type="month"
          value={month}
          onChange={(e) => {
            if (!e.target.value) return;
            go({ month: e.target.value });
          }}
          className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-burgundy-400 focus:outline-none focus:ring-2 focus:ring-burgundy-500/20"
        />
      )}

      {period === "months" && (
        <div className="flex items-center gap-1.5">
          <input
            type="month"
            value={from}
            onChange={(e) => {
              if (!e.target.value) return;
              // Keep `to` from being before the new `from`.
              go({ from: e.target.value, to: to < e.target.value ? e.target.value : to });
            }}
            className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-burgundy-400 focus:outline-none focus:ring-2 focus:ring-burgundy-500/20"
          />
          <span className="text-sm text-charcoal/50">to</span>
          <input
            type="month"
            value={to}
            min={from}
            onChange={(e) => {
              if (!e.target.value) return;
              go({ to: e.target.value });
            }}
            className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-burgundy-400 focus:outline-none focus:ring-2 focus:ring-burgundy-500/20"
          />
        </div>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        <label htmlFor="sunblock-room" className="text-sm text-charcoal/60">
          Room
        </label>
        <select
          id="sunblock-room"
          value={roomId}
          onChange={(e) => go({ roomId: e.target.value })}
          className="rounded-lg border border-charcoal/15 bg-white px-2.5 py-1.5 text-sm text-charcoal focus:border-burgundy-400 focus:outline-none focus:ring-2 focus:ring-burgundy-500/20"
        >
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}

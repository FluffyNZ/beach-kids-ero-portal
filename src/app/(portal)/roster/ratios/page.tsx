import Link from "next/link";
import {
  getWeekdayRoomRoll,
  minStaffRequired,
  RATIO_SNAPSHOT_TIMES,
  WEEKDAYS,
  type Weekday,
} from "@/lib/data/roster-ratios";
import { getRoomColorClasses } from "@/lib/constants";
import { formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

function isWeekday(value: string | undefined): value is Weekday {
  return value === "mon" || value === "tue" || value === "wed" || value === "thu" || value === "fri";
}

/** Defaults the picker to today when today is a weekday (server-local time,
 * same convention the roster grid uses for "this week"), falling back to
 * Monday on a weekend so the page never opens on a day with no data. */
function todaysWeekday(): Weekday | null {
  switch (new Date().getDay()) {
    case 1:
      return "mon";
    case 2:
      return "tue";
    case 3:
      return "wed";
    case 4:
      return "thu";
    case 5:
      return "fri";
    default:
      return null;
  }
}

export default async function RosterRatiosPage({
  searchParams,
}: {
  searchParams: { weekday?: string };
}) {
  const weekday: Weekday = isWeekday(searchParams.weekday) ? searchParams.weekday : todaysWeekday() ?? "mon";
  const weekdayLabel = WEEKDAYS.find((w) => w.key === weekday)?.label ?? "Monday";

  const rolls = await getWeekdayRoomRoll(weekday);

  const centreTotals = RATIO_SNAPSHOT_TIMES.map((time, i) => {
    const under2 = rolls.reduce((sum, r) => sum + r.snapshots[i].under2, 0);
    const over2 = rolls.reduce((sum, r) => sum + r.snapshots[i].over2, 0);
    const unknown = rolls.reduce((sum, r) => sum + r.snapshots[i].unknown, 0);
    return { time, under2, over2, unknown, total: under2 + over2 + unknown };
  });

  const enrolledTotal = rolls.reduce((s, r) => s + r.enrolledTotal, 0);
  const enrolledUnder2 = rolls.reduce((s, r) => s + r.enrolledUnder2, 0);
  const enrolledOver2 = rolls.reduce((s, r) => s + r.enrolledOver2, 0);
  const enrolledUnknown = rolls.reduce((s, r) => s + r.enrolledUnknown, 0);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Room Ratios</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Expected children per room on a normal {weekdayLabel}, and headcounts at the four times ratios matter
            most — early drop-off, mid-morning, and the afternoon changeover.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/roster" className="btn-ghost">
            ← Staff view
          </Link>
          <Link href="/roster/board" className="btn-ghost">
            Room board
          </Link>
        </div>
      </div>

      <div className="card flex flex-wrap items-center gap-1.5 px-4 py-3">
        {WEEKDAYS.map((w) => (
          <Link
            key={w.key}
            href={`/roster/ratios?weekday=${w.key}`}
            className={w.key === weekday ? "btn-primary px-3 py-1.5 text-sm" : "btn-ghost px-3 py-1.5 text-sm"}
          >
            {w.label}
          </Link>
        ))}
      </div>

      <div className="card overflow-hidden p-0">
        <div className="bg-sand-100 px-4 py-3">
          <h2 className="font-display text-lg font-semibold text-charcoal">Whole centre</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-charcoal/50">
                <th className="px-4 py-3 font-medium">Time</th>
                <th className="px-4 py-3 font-medium">Under 2</th>
                <th className="px-4 py-3 font-medium">2 &amp; over</th>
                <th className="px-4 py-3 font-medium">Total present</th>
                <th className="px-4 py-3 font-medium">Min. staff (Sched. 2)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/5">
              {centreTotals.map((t) => (
                <tr key={t.time}>
                  <td className="px-4 py-2.5 font-medium text-charcoal">{formatTime(t.time)}</td>
                  <td className="px-4 py-2.5 text-charcoal/80">{t.under2}</td>
                  <td className="px-4 py-2.5 text-charcoal/80">{t.over2}</td>
                  <td className="px-4 py-2.5 font-medium text-charcoal">
                    {t.total}
                    {t.unknown > 0 ? (
                      <span className="ml-1.5 text-xs font-normal text-status-attention">
                        +{t.unknown} age not recorded
                      </span>
                    ) : null}
                  </td>
                  <td className="px-4 py-2.5 text-charcoal/80">{minStaffRequired(t.under2, t.over2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="border-t border-charcoal/5 px-4 py-3 text-xs text-charcoal/50">
          Enrolled on a normal {weekdayLabel.toLowerCase()}: {enrolledTotal} children ({enrolledUnder2} under 2,{" "}
          {enrolledOver2} aged 2 &amp; over
          {enrolledUnknown > 0 ? `, ${enrolledUnknown} with no age on file` : ""}).
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {rolls.map((roll) => {
          const colors = getRoomColorClasses(roll.room?.color);
          const roomName = roll.room?.name ?? "No room assigned";
          return (
            <div key={roll.room?.id ?? "unassigned"} className="card overflow-hidden p-0">
              <div className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${colors.bg}`}>
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${colors.chip}`} />
                  <h2 className={`font-display text-lg font-semibold ${colors.text}`}>{roomName}</h2>
                </div>
                <span className={`text-sm font-medium ${colors.text}`}>
                  {roll.enrolledTotal} enrolled ({roll.enrolledUnder2} u2 / {roll.enrolledOver2} o2
                  {roll.enrolledUnknown > 0 ? ` / ${roll.enrolledUnknown} ?` : ""})
                </span>
              </div>

              {roll.enrolledTotal === 0 ? (
                <p className="px-4 py-6 text-sm text-charcoal/50">
                  No one enrolled in {roomName} on {weekdayLabel.toLowerCase()}s.
                </p>
              ) : (
                <>
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[480px] text-left text-sm">
                      <thead>
                        <tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-charcoal/50">
                          <th className="px-4 py-3 font-medium">Time</th>
                          <th className="px-4 py-3 font-medium">Under 2</th>
                          <th className="px-4 py-3 font-medium">2 &amp; over</th>
                          <th className="px-4 py-3 font-medium">Present</th>
                          <th className="px-4 py-3 font-medium">Min. staff</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-charcoal/5">
                        {roll.snapshots.map((s) => (
                          <tr key={s.time}>
                            <td className="px-4 py-2.5 font-medium text-charcoal">{formatTime(s.time)}</td>
                            <td className="px-4 py-2.5 text-charcoal/80">{s.under2}</td>
                            <td className="px-4 py-2.5 text-charcoal/80">{s.over2}</td>
                            <td className="px-4 py-2.5 font-medium text-charcoal">
                              {s.total}
                              {s.unknown > 0 ? (
                                <span className="ml-1.5 text-xs font-normal text-status-attention">
                                  +{s.unknown}?
                                </span>
                              ) : null}
                            </td>
                            <td className="px-4 py-2.5 text-charcoal/80">{minStaffRequired(s.under2, s.over2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <details className="border-t border-charcoal/5 px-4 py-3">
                    <summary className="cursor-pointer text-xs font-medium text-charcoal/60 hover:text-charcoal">
                      Who&apos;s here at each time
                    </summary>
                    <div className="mt-2 flex flex-col gap-1.5">
                      {roll.snapshots.map((s) => (
                        <div key={s.time} className="text-xs text-charcoal/70">
                          <span className="font-medium text-charcoal">{formatTime(s.time)}:</span>{" "}
                          {s.children.length === 0
                            ? "no one"
                            : s.children
                                .map(
                                  (c) =>
                                    `${c.full_name}${c.group === "under2" ? " (u2)" : c.group === "unknown" ? " (age?)" : ""}${
                                      c.borderline ? " ⚠" : ""
                                    }`
                                )
                                .join(", ")}
                        </div>
                      ))}
                    </div>
                  </details>
                </>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-xs text-charcoal/40">
        Under 2 / 2 &amp; over is estimated by projecting each child&apos;s last recorded age (from Children &amp;
        Fees) forward to today — there&apos;s no exact date of birth on file. A child marked ⚠ is within about a
        month of turning 2 either way, so double-check their record before relying on the count for a real ratio
        decision. Counts reflect each child&apos;s regular enrolled schedule for a normal week, not a specific
        calendar date — actual attendance on any given day (sick days, casual bookings) can differ.
        &quot;Min. staff&quot; is the regulatory floor under Schedule 2 of the Education (Early Childhood Services)
        Regulations 2008 (1 adult : 5 children under 2, 1 adult : 10 aged 2 and over) — it&apos;s a minimum, not a
        target, and doesn&apos;t account for qualified-teacher requirements or Beach Kids&apos; own staffing policy.
      </p>
    </div>
  );
}

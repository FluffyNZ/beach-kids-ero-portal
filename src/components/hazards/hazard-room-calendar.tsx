import Link from "next/link";
import type { HazardCalendarWeek } from "@/lib/data/hazard-checks";

const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri"];

function dayNumber(dateStr: string): number {
  return Number(dateStr.slice(8, 10));
}

/** One day's cell — a plain, non-interactive square when no chart has ever
 * been started for that week (nothing to open), otherwise a link straight
 * into that week's check, landing on this exact day's sign-off row. */
function CalendarDayCell({
  date,
  inMonth,
  checkId,
  signedOff,
}: {
  date: string;
  inMonth: boolean;
  checkId: string | null;
  signedOff: boolean | null;
}) {
  const number = dayNumber(date);
  const dimmed = inMonth ? "" : "opacity-30";

  if (!checkId) {
    return (
      <div className={`flex h-14 flex-col items-center justify-center rounded-lg border border-dashed border-charcoal/10 text-xs text-charcoal/30 ${dimmed}`}>
        {number}
      </div>
    );
  }

  const toneClasses = signedOff
    ? "border-status-ready/30 bg-status-readyBg text-status-ready hover:border-status-ready/60"
    : "border-status-attention/30 bg-status-attentionBg text-status-attention hover:border-status-attention/60";

  return (
    <Link
      href={`/records/hazards/${checkId}#day-${date}`}
      title={`${date} — ${signedOff ? "Signed off" : "Not signed off yet"}`}
      className={`flex h-14 flex-col items-center justify-center gap-0.5 rounded-lg border text-xs font-medium transition-colors ${toneClasses} ${dimmed}`}
    >
      <span>{number}</span>
      <span aria-hidden className="text-[0.6rem]">
        {signedOff ? "✓" : "•"}
      </span>
    </Link>
  );
}

/** A month's worth of one room's hazard checks, laid out as a real
 * calendar — one row per week, Monday to Friday (Beach Kids doesn't open
 * weekends, so there's nothing to show for Sat/Sun), green once a day's
 * been signed off, amber while it's still outstanding, and a plain dashed
 * square for a week that's never even been started. */
export function HazardRoomCalendar({ weeks }: { weeks: HazardCalendarWeek[] }) {
  if (weeks.length === 0) {
    return <p className="card p-6 text-center text-sm text-charcoal/50">Nothing to show for this month.</p>;
  }

  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className="grid grid-cols-5 gap-2 px-1 text-center text-[0.65rem] font-semibold uppercase tracking-wide text-charcoal/40">
        {WEEKDAY_LABELS.map((label) => (
          <span key={label}>{label}</span>
        ))}
      </div>
      {weeks.map((week) => (
        <div key={week.weekStartDate} className="grid grid-cols-5 gap-2">
          {week.days.map((day) => (
            <CalendarDayCell
              key={day.date}
              date={day.date}
              inMonth={day.inMonth}
              checkId={day.checkId}
              signedOff={day.signedOff}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

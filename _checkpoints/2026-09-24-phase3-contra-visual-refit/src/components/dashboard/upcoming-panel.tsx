import { CalendarIcon } from "@/components/icons";
import { formatShortDate } from "@/lib/utils";
import type { UpcomingEvent } from "@/lib/data/home";

const KIND_LABEL: Record<UpcomingEvent["kind"], string> = {
  public_holiday: "Public holiday",
  staff_leave: "Staff leave",
  staff_birthday: "Birthday",
  child_birthday: "Birthday",
};

export function UpcomingPanel({ events }: { events: UpcomingEvent[] }) {
  if (events.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-5 py-10 text-center">
        <CalendarIcon className="h-7 w-7 text-charcoal/20" />
        <p className="text-sm font-medium text-charcoal">Nothing on the calendar in the next two weeks</p>
        <p className="text-xs text-charcoal/45">Public holidays, booked staff leave and birthdays show up here.</p>
      </div>
    );
  }

  return (
    <div className="card divide-y divide-charcoal/5">
      {events.slice(0, 8).map((e, i) => (
        <div key={`${e.kind}-${e.date}-${i}`} className="flex items-center justify-between gap-4 px-5 py-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">{e.title}</p>
            <p className="text-xs text-charcoal/50">{KIND_LABEL[e.kind]}</p>
          </div>
          <span className="shrink-0 text-xs font-medium text-charcoal/50">{formatShortDate(e.date)}</span>
        </div>
      ))}
    </div>
  );
}

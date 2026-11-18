import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { EmptyState } from "@/components/ui/empty-state";
import { formatShortDate } from "@/lib/utils";
import { relativeDayLabel, type ComingUpItem, type ComingUpKind } from "@/lib/data/home-dashboard";

const dayFormat = new Intl.DateTimeFormat("en-NZ", { weekday: "long", day: "numeric", month: "short", timeZone: "UTC" });

/** "Today", "Tomorrow", otherwise e.g. "Friday 20 Nov". */
function dayHeading(date: string, today: string): string {
  const rel = relativeDayLabel(date, today);
  if (rel === "Today" || rel === "Tomorrow") return rel;
  const [y, m, d] = date.split("-").map(Number);
  return dayFormat.format(new Date(Date.UTC(y, m - 1, d))).replace(",", "");
}

const KIND_LABEL: Record<ComingUpKind, string> = {
  child_birthday: "Birthday",
  staff_birthday: "Staff birthday",
  starting: "Starting",
  leaving: "Leaving",
  staff_leave: "Staff leave",
  public_holiday: "Public holiday",
};

const KIND_DOT: Record<ComingUpKind, string> = {
  child_birthday: "bg-lilac-400",
  staff_birthday: "bg-lilac-400",
  starting: "bg-status-ready",
  leaving: "bg-status-attention",
  staff_leave: "bg-charcoal/40",
  public_holiday: "bg-lilac-600",
};

/** The next two weeks, grouped by day: birthdays, new starters, children
 * leaving, staff leave and public holidays. Only days with something on
 * are listed, so a quiet fortnight stays short. */
export function ComingUp({ items, today }: { items: ComingUpItem[]; today: string }) {
  const groups: { date: string; items: ComingUpItem[] }[] = [];
  for (const item of items) {
    const last = groups[groups.length - 1];
    if (last && last.date === item.date) last.items.push(item);
    else groups.push({ date: item.date, items: [item] });
  }

  return (
    <Panel
      id="coming-up"
      title="Coming up"
      description="Next 14 days"
      action={{ label: "View calendar", href: "/calendar" }}
    >
      {groups.length === 0 ? (
        <EmptyState
          title="Nothing in the next two weeks"
          description="Birthdays, starters, leavers, staff leave and public holidays will show here."
        />
      ) : (
        <ol className="border-t border-charcoal/10">
          {groups.map((group) => (
            <li key={group.date} className="border-b border-charcoal/10 last:border-b-0">
              <h3 className="bg-canvas px-5 py-2 text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                <time dateTime={group.date}>{dayHeading(group.date, today)}</time>
              </h3>
              <ul className="divide-y divide-charcoal/[0.06]">
                {group.items.map((item) => (
                  <li key={item.key} className="flex gap-3 px-5 py-3">
                    <span aria-hidden="true" className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${KIND_DOT[item.kind]}`} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-charcoal">{item.title}</p>
                      <p className="text-sm text-charcoal/70">
                        {KIND_LABEL[item.kind]}
                        {item.endDate && item.endDate !== item.date && <> · until {formatShortDate(item.endDate)}</>}
                        {item.detail && <> · {item.detail}</>}
                      </p>
                      {item.action && (
                        <Link
                          href={item.action.href}
                          className="mt-1 inline-block rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
                        >
                          {item.action.label}
                        </Link>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
      )}
      <p className="border-t border-charcoal/10 px-5 py-3 text-xs text-charcoal/70">
        Centre events aren&apos;t recorded in Earlydesk yet, so they don&apos;t appear here.
      </p>
    </Panel>
  );
}

import Link from "next/link";
import type { UpcomingFamilyReminder } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";
import { EMAIL_REMINDER_KIND_LABEL, EMAIL_REMINDER_TEMPLATE_KEY } from "@/lib/constants";
import { MailIcon } from "@/components/icons";

/** Home's own small version of the Email page's two "coming up" panels —
 * only the still-outstanding ones (nothing drafted or sent yet), since this
 * card's whole purpose is "here's something that still needs doing", same
 * spirit as "Needs attention" right next to it. The full picture — drafted
 * and sent ones included — lives on /email itself. */
export function EmailRemindersCard({ reminders }: { reminders: UpcomingFamilyReminder[] }) {
  const outstanding = reminders.filter((r) => r.alreadyHandled === null);

  if (outstanding.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-5 py-8 text-center">
        <MailIcon className="h-6 w-6 text-charcoal/20" />
        <p className="text-sm font-medium text-charcoal">All caught up</p>
        <p className="text-xs text-charcoal/45">No birthday, welcome or farewell emails outstanding for the next 7 days.</p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col divide-y divide-charcoal/5">
      {outstanding.slice(0, 5).map((r) => (
        <Link
          key={`${r.kind}-${r.childId}-${r.date}`}
          href={`/email/compose?template=${EMAIL_REMINDER_TEMPLATE_KEY[r.kind]}&childId=${r.childId}&reminderKind=${r.kind}&reminderDate=${r.date}`}
          className="flex items-center justify-between gap-3 px-5 py-3 transition-colors hover:bg-charcoal/[0.03]"
        >
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">{r.childName}</p>
            <p className="text-xs text-charcoal/50">
              {EMAIL_REMINDER_KIND_LABEL[r.kind]}
              {r.turningAge !== null ? ` — turning ${r.turningAge}` : ""}
            </p>
          </div>
          <span className="shrink-0 text-xs font-medium text-charcoal/50">{r.isToday ? "Today" : formatShortDate(r.date)}</span>
        </Link>
      ))}
      {outstanding.length > 5 && (
        <Link href="/email" className="px-5 py-2.5 text-center text-xs font-medium text-burgundy-600 hover:underline">
          +{outstanding.length - 5} more in Email →
        </Link>
      )}
    </div>
  );
}

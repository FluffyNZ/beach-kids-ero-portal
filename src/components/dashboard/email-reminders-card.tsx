import Link from "next/link";
import type { UpcomingFamilyReminder } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { formatShortDate } from "@/lib/utils";
import { EMAIL_REMINDER_TEMPLATE_KEY, emailReminderTone } from "@/lib/constants";
import { GiftIcon, HeartIcon } from "@/components/icons";

const KIND_ICON: Record<UpcomingFamilyReminder["kind"], React.ComponentType<{ className?: string }>> = {
  birthday: GiftIcon,
  welcome: HeartIcon,
  farewell: HeartIcon,
};

const KIND_DETAIL: Record<UpcomingFamilyReminder["kind"], string> = {
  birthday: "Birthday",
  welcome: "Starting",
  farewell: "Leaving",
};

/** Home's condensed view of every birthday, new starter and farewell due in
 * the next 7 days — one merged, date-sorted list (the Email page's own
 * Birthdays / Welcomes & Farewells panels show the same underlying data
 * split in two; here on Home they're combined so there's one thing to scan
 * each morning). Already-sent ones still show (so a birthday doesn't just
 * vanish from view), just without the quick-send action; everything else
 * gets a one-click "Prepare email"/"Continue draft" straight into the
 * compose wizard, which is the only place a draft is actually created or
 * sent — this card never does that itself. */
export function EmailRemindersCard({ reminders }: { reminders: UpcomingFamilyReminder[] }) {
  if (reminders.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-5 py-8 text-center">
        <GiftIcon className="h-6 w-6 text-charcoal/20" />
        <p className="text-sm font-medium text-charcoal">Nothing in the next 7 days</p>
        <p className="text-xs text-charcoal/45">Birthdays, new starters and farewells will show up here.</p>
      </div>
    );
  }

  const shown = reminders.slice(0, 6);
  const overflow = reminders.length - shown.length;

  return (
    <div className="card flex flex-col divide-y divide-charcoal/5">
      {shown.map((r) => {
        const Icon = KIND_ICON[r.kind];
        const composeHref =
          r.alreadyHandled === "draft" && r.draftEmailId
            ? `/email/compose?draftId=${r.draftEmailId}`
            : `/email/compose?template=${EMAIL_REMINDER_TEMPLATE_KEY[r.kind]}&childId=${r.childId}&reminderKind=${r.kind}&reminderDate=${r.date}`;

        return (
          <div key={`${r.kind}-${r.childId}-${r.date}`} className="flex items-center justify-between gap-3 px-5 py-3">
            <div className="flex min-w-0 items-center gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-lilac-100 text-charcoal/60">
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">
                  {r.childName}
                  {r.kind === "birthday" && r.turningAge !== null ? ` — turning ${r.turningAge}` : ""}
                </p>
                <p className="truncate text-xs text-charcoal/50">
                  {KIND_DETAIL[r.kind]} · {r.isToday ? "Today" : formatShortDate(r.date)}
                  {r.roomName ? ` · ${r.roomName}` : ""}
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {r.alreadyHandled !== null && (
                <StatusBadge tone={emailReminderTone(r.alreadyHandled)}>
                  {r.alreadyHandled === "sent" ? "Sent" : "Drafted"}
                </StatusBadge>
              )}
              {r.alreadyHandled !== "sent" && (
                <Link href={composeHref} className="btn-secondary px-3 py-1.5 text-xs">
                  {r.alreadyHandled === "draft" ? "Continue" : "Email"}
                </Link>
              )}
            </div>
          </div>
        );
      })}
      {overflow > 0 && (
        <Link href="/email" className="px-5 py-2.5 text-center text-xs font-medium text-charcoal/60 hover:text-charcoal hover:underline">
          +{overflow} more in Email →
        </Link>
      )}
    </div>
  );
}

import Link from "next/link";
import type { UpcomingFamilyReminder } from "@/lib/types";
import { StatusBadge } from "@/components/status-badge";
import { formatShortDate } from "@/lib/utils";
import { EMAIL_REMINDER_TEMPLATE_KEY, emailReminderTone } from "@/lib/constants";

/** One of the Email page's two "coming up" panels (Birthdays, or Welcomes &
 * Farewells combined) — each reminder here is one real upcoming occurrence,
 * already checked against email_messages (see getUpcomingFamilyReminders)
 * so this never invites drafting the same birthday/start/leaving email
 * twice. Nothing here ever creates anything itself: every action is a plain
 * link into the compose wizard, which is the only place a draft actually
 * gets created or sent. */
export function ReminderPanel({
  icon,
  title,
  reminders,
  emptyMessage,
}: {
  icon: React.ReactNode;
  title: string;
  reminders: UpcomingFamilyReminder[];
  emptyMessage: string;
}) {
  if (reminders.length === 0) {
    return (
      <div className="card flex flex-col gap-1 p-5">
        <h2 className="text-sm font-semibold text-charcoal">{title}</h2>
        <div className="flex flex-col items-center gap-2 py-8 text-center">
          <span className="text-charcoal/20">{icon}</span>
          <p className="text-sm text-charcoal/50">{emptyMessage}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card flex flex-col gap-3 p-5">
      <h2 className="text-sm font-semibold text-charcoal">{title}</h2>
      <div className="flex flex-col divide-y divide-charcoal/5">
        {reminders.map((r) => {
          const composeHref =
            r.alreadyHandled === "draft" && r.draftEmailId
              ? `/email/compose?draftId=${r.draftEmailId}`
              : `/email/compose?template=${EMAIL_REMINDER_TEMPLATE_KEY[r.kind]}&childId=${r.childId}&reminderKind=${r.kind}&reminderDate=${r.date}`;

          return (
            <div key={`${r.kind}-${r.childId}-${r.date}`} className="flex items-center justify-between gap-3 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">
                  {r.childName}
                  {r.kind === "birthday" && r.turningAge !== null ? ` — turning ${r.turningAge}` : ""}
                </p>
                <p className="text-xs text-charcoal/50">
                  {r.isToday ? "Today" : formatShortDate(r.date)}
                  {r.roomName ? ` · ${r.roomName}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                <StatusBadge tone={emailReminderTone(r.alreadyHandled)}>
                  {r.alreadyHandled === "sent" ? "Sent" : r.alreadyHandled === "draft" ? "Drafted" : "Outstanding"}
                </StatusBadge>
                {r.alreadyHandled !== "sent" && (
                  <Link href={composeHref} className="btn-secondary px-3 py-1.5 text-xs">
                    {r.alreadyHandled === "draft" ? "Continue draft" : "Prepare email"}
                  </Link>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

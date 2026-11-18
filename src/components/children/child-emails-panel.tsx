import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { EditProfileButton } from "./child-profile-shell";
import type { EmailMessage } from "@/lib/types";
import { EMAIL_MESSAGE_STATUS_LABEL, emailMessageStatusTone } from "@/lib/constants";
import { formatNzDateTime } from "@/lib/child-format";

/** "Notes" tab: the child's general notes (edited in the Edit profile
 * drawer) and the real history of every email sent, drafted or attempted
 * for this child — nothing fabricated. New emails start from the existing
 * Email page with this child already chosen. */
export function ChildEmailsPanel({
  childId,
  notes,
  history,
}: {
  childId: string;
  notes: string | null;
  history: EmailMessage[];
}) {
  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)]">
      <Panel
        id="notes-general"
        title="Notes"
        headerAction={<EditProfileButton variant="link">Edit</EditProfileButton>}
        bodyClassName="border-t border-charcoal/10 px-5 py-4"
      >
        {notes ? (
          <p className="whitespace-pre-line break-words text-sm text-charcoal">{notes}</p>
        ) : (
          <p className="text-sm text-charcoal/70">No notes recorded.</p>
        )}
      </Panel>

      <Panel
        id="notes-emails"
        title="Email history"
        count={history.length}
        headerAction={
          <Link
            href={`/email?childId=${childId}`}
            className="shrink-0 rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
          >
            Email whānau
          </Link>
        }
      >
        {history.length === 0 ? (
          <p className="border-t border-charcoal/10 px-5 py-4 text-sm text-charcoal/70">No emails logged for this child yet.</p>
        ) : (
          <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
            {history.map((email) => (
              <li key={email.id}>
                <Link
                  href={`/email/compose?draftId=${email.id}`}
                  className="flex flex-wrap items-start justify-between gap-2 px-5 py-3 transition-colors hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal"
                >
                  <div className="min-w-0 flex-1">
                    <p className="break-words text-sm font-medium text-charcoal">{email.subject || "(No subject)"}</p>
                    <p className="mt-0.5 break-all text-xs text-charcoal/70">
                      To {email.recipient_name ? `${email.recipient_name} · ` : ""}
                      {email.recipient_email}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <StatusPill tone={emailMessageStatusTone(email.status)}>{EMAIL_MESSAGE_STATUS_LABEL[email.status]}</StatusPill>
                    <p className="text-xs text-charcoal/70">{formatNzDateTime(email.sent_at ?? email.created_at)}</p>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </div>
  );
}

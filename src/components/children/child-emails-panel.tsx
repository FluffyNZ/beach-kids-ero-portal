import Link from "next/link";
import type { EmailMessage } from "@/lib/types";
import { EMAIL_MESSAGE_STATUS_LABEL, emailMessageStatusTone } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { StatusBadge } from "@/components/status-badge";
import { MailIcon } from "@/components/icons";

/** "Emails & notes" tab content: a quick "Email whānau" action (the
 * template grid, with this child already threaded through so whichever
 * template gets picked opens the compose wizard already pointed at this
 * family's real recipients — see app/(portal)/email/page.tsx and
 * components/email/template-grid.tsx), plus the real history of every
 * email already sent, drafted or attempted for this child, from
 * getEmailHistoryForChild — nothing fabricated. */
export function ChildEmailsPanel({ childId, history }: { childId: string; history: EmailMessage[] }) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
        <div>
          <h2 className="text-sm font-semibold text-charcoal">Email whānau</h2>
          <p className="mt-0.5 text-sm text-charcoal/60">
            Pick a template to start a new email to this child&apos;s family.
          </p>
        </div>
        <Link href={`/email?childId=${childId}`} className="btn-primary">
          <MailIcon className="h-4 w-4" />
          Email whānau
        </Link>
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Email history</h2>
        {history.length === 0 ? (
          <p className="text-sm text-charcoal/50">No emails logged for this child yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-charcoal/5">
            {history.map((email) => (
              <Link
                key={email.id}
                href={`/email/compose?draftId=${email.id}`}
                className="flex flex-wrap items-start justify-between gap-2 py-3 hover:bg-sand-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal">{email.subject || "(No subject)"}</p>
                  <p className="mt-0.5 text-xs text-charcoal/50">
                    To {email.recipient_name ? `${email.recipient_name} · ` : ""}
                    {email.recipient_email}
                  </p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <StatusBadge tone={emailMessageStatusTone(email.status)}>
                    {EMAIL_MESSAGE_STATUS_LABEL[email.status]}
                  </StatusBadge>
                  <p className="text-xs text-charcoal/40">
                    {formatDateTime(email.sent_at ?? email.created_at)}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

import Link from "next/link";
import {
  getEmailTemplateByKey,
  getRecipientOptionsForChild,
  getFamilyEnquiryById,
  getEmailMessageById,
} from "@/lib/data/email";
import { getChildById } from "@/lib/data/children";
import { ComposeWizard } from "@/components/email/compose-wizard";
import type { EmailReminderKind } from "@/lib/types";

export const dynamic = "force-dynamic";

const VALID_REMINDER_KINDS: EmailReminderKind[] = ["birthday", "welcome", "farewell"];

export default async function ComposeEmailPage({
  searchParams,
}: {
  searchParams: { template?: string; childId?: string; familyEnquiryId?: string; reminderKind?: string; reminderDate?: string; draftId?: string };
}) {
  // Resuming an existing draft (from "Continue draft", or the history page's
  // "Edit" on anything still in draft) — everything the review step needs
  // is already on the row itself, so there's nothing else to fetch.
  if (searchParams.draftId) {
    const draft = await getEmailMessageById(searchParams.draftId);
    if (!draft) {
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 py-16 text-center">
          <h1 className="font-display text-xl font-bold text-charcoal">Draft not found</h1>
          <p className="text-sm text-charcoal/60">This email may have already been sent, or the link is out of date.</p>
          <Link href="/email" className="btn-secondary">
            Back to Email
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <ComposeWizard mode="resume" draft={draft} />
      </div>
    );
  }

  const template = searchParams.template ? await getEmailTemplateByKey(searchParams.template) : null;
  if (!template) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 py-16 text-center">
        <h1 className="font-display text-xl font-bold text-charcoal">Choose a template to start</h1>
        <p className="text-sm text-charcoal/60">Pick one from the Email page to start a new draft.</p>
        <Link href="/email" className="btn-secondary">
          Back to Email
        </Link>
      </div>
    );
  }

  const reminderKind: EmailReminderKind | null =
    searchParams.reminderKind && VALID_REMINDER_KINDS.includes(searchParams.reminderKind as EmailReminderKind)
      ? (searchParams.reminderKind as EmailReminderKind)
      : null;
  const reminderDate = reminderKind ? searchParams.reminderDate ?? null : null;

  // Starting from an enquiry (the enquiries panel's "Reply") — there's only
  // ever one email on file for a prospective family, so there's no
  // recipient choice to make; the wizard goes straight to drafting.
  if (searchParams.familyEnquiryId) {
    const enquiry = await getFamilyEnquiryById(searchParams.familyEnquiryId);
    if (!enquiry) {
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 py-16 text-center">
          <h1 className="font-display text-xl font-bold text-charcoal">Enquiry not found</h1>
          <Link href="/email" className="btn-secondary">
            Back to Email
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <ComposeWizard mode="new" template={template} initialEnquiry={enquiry} />
      </div>
    );
  }

  // Starting from a reminder or a child already known — fetch who this
  // family's real email addresses belong to, so the "who's this going to?"
  // step is a genuine choice between every guardian on file, not just the
  // bill payer.
  if (searchParams.childId) {
    const [child, recipientOptions] = await Promise.all([
      getChildById(searchParams.childId),
      getRecipientOptionsForChild(searchParams.childId),
    ]);
    if (!child) {
      return (
        <div className="mx-auto flex w-full max-w-2xl flex-col items-center gap-3 py-16 text-center">
          <h1 className="font-display text-xl font-bold text-charcoal">Child not found</h1>
          <Link href="/email" className="btn-secondary">
            Back to Email
          </Link>
        </div>
      );
    }
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
        <ComposeWizard
          mode="new"
          template={template}
          initialChild={{ id: child.id, full_name: child.full_name, room_name: child.room_name, status: child.status }}
          initialRecipientOptions={recipientOptions}
          reminderKind={reminderKind}
          reminderDate={reminderDate}
        />
      </div>
    );
  }

  // Starting from the template grid with nothing else chosen yet — the
  // wizard's first step is searching for the child this email is about.
  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <ComposeWizard mode="new" template={template} />
    </div>
  );
}

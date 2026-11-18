import Link from "next/link";
import { redirect } from "next/navigation";
import { EmailPage } from "@/components/email/email-page";
import { ComposeFlow, type ComposeInitial } from "@/components/email/compose-flow";
import { getDraftBatch, getRecipientDirectory, getSenderIdentity, getTemplatesForCompose } from "@/lib/data/email-hub";
import { createClient } from "@/lib/supabase/server";
import { EMAIL_REMINDER_TEMPLATE_KEY } from "@/lib/constants";
import { fmtDate } from "@/lib/finance-format";
import type { EmailReminderKind } from "@/lib/types";
import type { MissingEntry, Recipient } from "@/components/email/recipient-picker";

export const dynamic = "force-dynamic";
// Sending to a group happens in small batches, each well inside this limit.
export const maxDuration = 60;

const KINDS: EmailReminderKind[] = ["birthday", "welcome", "farewell"];

function NotFound({ title, text }: { title: string; text: string }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-charcoal/10 bg-white p-6">
      <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
      <p className="text-sm text-charcoal/70">{text}</p>
      <Link href="/email" className="btn-secondary">
        Back to Email
      </Link>
    </div>
  );
}

export default async function ComposePage({
  searchParams,
}: {
  searchParams: { template?: string; childId?: string; staffId?: string; familyEnquiryId?: string; reminderKind?: string; reminderDate?: string; draftId?: string };
}) {
  const [directory, templates] = await Promise.all([getRecipientDirectory(), getTemplatesForCompose()]);
  const sender = getSenderIdentity();
  const frame = (content: React.ReactNode) => (
    <EmailPage title="Compose email" description="Choose who it's for, write the message, then check each version before sending.">
      {content}
    </EmailPage>
  );

  const initial: ComposeInitial = {
    batchIds: [],
    recipients: [],
    missing: [],
    templateKey: null,
    subject: "",
    body: "",
    attachments: [],
    reminder: null,
    failedNote: null,
    savedAt: null,
    notice: null,
  };
  const childById = new Map(directory.children.map((c) => [c.id, c]));

  if (searchParams.draftId) {
    const batch = await getDraftBatch(searchParams.draftId);
    if (batch.length === 0) return frame(<NotFound title="Draft not found" text="It may have been sent or discarded. Check Email history." />);
    if (batch[0].status !== "draft" && batch[0].status !== "failed") redirect(`/email/history?open=${batch[0].id}`);
    const lead = batch.find((r) => r.status === "draft") ?? batch[0];
    initial.batchIds = batch.map((r) => r.id);
    initial.recipients = batch.map((r) => {
      const child = r.childId ? childById.get(r.childId) : undefined;
      const option = child?.options.find((o) => o.email.toLowerCase() === r.recipientEmail.toLowerCase());
      return {
        key: r.recipientEmail.toLowerCase(),
        email: r.recipientEmail,
        name: r.recipientName ?? r.recipientEmail,
        relationship: option?.relationship ?? (r.staffId ? "Staff" : r.enquiryId ? "Enquiry" : r.billPayerId ? "Family account" : "Recipient"),
        childIds: r.childId ? [r.childId] : [],
        childNames: r.childName ? [r.childName] : [],
        billPayerId: r.billPayerId,
        staffId: r.staffId,
        enquiryId: r.enquiryId,
      };
    });
    initial.templateKey = lead.templateKey && templates.some((t) => t.key === lead.templateKey) ? lead.templateKey : null;
    initial.subject = lead.subject;
    initial.body = lead.body;
    initial.attachments = lead.attachments;
    initial.savedAt = batch.map((r) => r.updatedAt ?? r.createdAt).sort().reverse()[0];
    if (lead.reminderKind && lead.reminderDate && lead.childId) initial.reminder = { kind: lead.reminderKind, date: lead.reminderDate, childId: lead.childId };
    const failed = batch.filter((r) => r.status === "failed");
    if (failed.length) {
      initial.failedNote = `${failed.length === 1 ? "1 email" : `${failed.length} emails`} in this draft ${failed.length === 1 ? "wasn't" : "weren't"} sent last time: ${failed[0].error ?? "no reason recorded"}. Check the details and send again.`;
    }
    return frame(<ComposeFlow directory={directory} templates={templates} sender={sender} initial={initial} />);
  }

  const reminderKind = KINDS.find((k) => k === searchParams.reminderKind) ?? null;
  const templateKey =
    searchParams.template ?? (searchParams.familyEnquiryId ? "new_enquiry" : reminderKind ? EMAIL_REMINDER_TEMPLATE_KEY[reminderKind] : null);
  const template = templateKey ? templates.find((t) => t.key === templateKey) : undefined;
  if (template) {
    initial.templateKey = template.key;
    initial.subject = template.subject;
    initial.body = template.body;
  }

  const recipients: Recipient[] = [];
  const missing: MissingEntry[] = [];
  if (searchParams.childId) {
    const child = childById.get(searchParams.childId);
    if (!child) return frame(<NotFound title="Child not found" text="The link may be out of date." />);
    const option = child.options.find((o) => o.isDefault);
    if (option) {
      recipients.push({
        key: option.email.toLowerCase(),
        email: option.email,
        name: option.name,
        relationship: option.relationship,
        childIds: [child.id],
        childNames: [child.name],
        billPayerId: child.billPayerId,
        staffId: null,
        enquiryId: null,
      });
    } else {
      missing.push({
        key: `child-${child.id}`,
        label: child.name,
        detail: "No email on file",
        href: child.billPayerId ? `/finances/clients/${child.billPayerId}` : `/children/${child.id}`,
      });
    }
    if (child.options.length > 1) initial.notice = `${child.name}'s family has ${child.options.length} email addresses on file. Only ${option?.email} is included — add others in Recipients if they should get this too.`;

    if (reminderKind && searchParams.reminderDate) {
      const supabase = createClient();
      const { data: existing } = await supabase
        .from("email_messages")
        .select("id, status, sent_at")
        .eq("child_id", child.id)
        .eq("reminder_kind", reminderKind)
        .eq("reminder_event_date", searchParams.reminderDate)
        .neq("status", "failed")
        .maybeSingle();
      if (existing?.status === "draft") redirect(`/email/compose?draftId=${existing.id}`);
      if (existing) initial.notice = `A ${reminderKind} email for ${child.name} was already sent${existing.sent_at ? ` on ${fmtDate(existing.sent_at.slice(0, 10))}` : ""}.`;
      else initial.reminder = { kind: reminderKind, date: searchParams.reminderDate, childId: child.id };
    }
  }
  if (searchParams.staffId) {
    const s = directory.staff.find((x) => x.id === searchParams.staffId);
    if (!s) return frame(<NotFound title="Staff member not found" text="The link may be out of date." />);
    if (s.email) recipients.push({ key: s.email.toLowerCase(), email: s.email, name: s.name, relationship: "Staff", childIds: [], childNames: [], billPayerId: null, staffId: s.id, enquiryId: null });
    else initial.notice = `${s.name} has no email on file. Search their name in Recipients to enter an address for this email.`;
  }
  if (searchParams.familyEnquiryId) {
    const e = directory.enquiries.find((x) => x.id === searchParams.familyEnquiryId);
    if (!e) return frame(<NotFound title="Enquiry not found" text="It may have been converted or dismissed." />);
    recipients.push({ key: e.email.toLowerCase(), email: e.email, name: e.parentName, relationship: `Enquiry for ${e.childName}`, childIds: [], childNames: [], billPayerId: null, staffId: null, enquiryId: e.id });
  }
  initial.recipients = recipients;
  initial.missing = missing;

  return frame(<ComposeFlow directory={directory} templates={templates} sender={sender} initial={initial} />);
}

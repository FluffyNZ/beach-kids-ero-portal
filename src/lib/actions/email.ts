"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getResendClient, getContactFromAddress } from "@/lib/email/resend-client";
import { renderPlainTextEmailBody, hasUnresolvedPlaceholders, fillTemplateTokens } from "@/lib/email/template-email";
import {
  getEmailTemplateByKey,
  getTemplateTokenValues,
  getEnquiryTemplateTokenValues,
  getRecipientOptionsForChild,
  findPotentialDuplicateFamilies,
  searchChildrenForEmail,
  getEmailMessageById,
  type EmailChildSearchResult,
} from "@/lib/data/email";
import type { EmailAttachment, EmailReminderKind, EmailMessage, EmailRecipientOption } from "@/lib/types";

const ATTACHMENTS_BUCKET = "email-attachments";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function revalidateEmailPaths() {
  revalidatePath("/email");
  revalidatePath("/email/history");
  revalidatePath("/dashboard");
}

// ---------------------------------------------------------------------------
// Thin read wrappers for the compose wizard (a client component) — plain
// data reads under the hood (src/lib/data/email.ts), exposed as server
// actions purely so the client can call them directly as the wizard steps
// through picking a child/recipient and re-opening a draft to review.
// ---------------------------------------------------------------------------

export async function searchChildrenForCompose(query: string): Promise<EmailChildSearchResult[]> {
  return searchChildrenForEmail(query);
}

export async function fetchRecipientOptions(childId: string): Promise<EmailRecipientOption[]> {
  return getRecipientOptionsForChild(childId);
}

export async function fetchEmailMessage(id: string): Promise<EmailMessage | null> {
  return getEmailMessageById(id);
}

// ---------------------------------------------------------------------------
// Drafting
// ---------------------------------------------------------------------------

export type CreateDraftResult = { success: true; id: string; reused: boolean } | { success: false; error: string };

/** Starts a new draft from a template for one child (or, for the
 * enrolment-enquiry templates, one family_enquiries row) + recipient, with
 * every {{token}} already filled in from real data (or flagged inline if
 * there's nothing to fill it with — see fillTemplateTokens). Exactly one of
 * `childId`/`familyEnquiryId` must be set. For a birthday/welcome/farewell
 * reminder (always child-based), reuses the existing draft for that exact
 * occurrence instead of creating a second one if "Prepare email" is
 * clicked twice — `reused: true` tells the caller it's opening something
 * that already existed rather than something brand new. */
export async function createDraftEmailFromTemplate(input: {
  templateKey: string;
  childId?: string | null;
  familyEnquiryId?: string | null;
  recipientEmail: string;
  recipientName: string | null;
  reminderKind?: EmailReminderKind | null;
  reminderEventDate?: string | null;
}): Promise<CreateDraftResult> {
  const trimmedEmail = input.recipientEmail.trim();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { success: false, error: "Choose a recipient with a valid email address first." };
  }
  if (!input.childId && !input.familyEnquiryId) {
    return { success: false, error: "This draft needs to be linked to either a child or an enquiry." };
  }

  const supabase = createClient();

  if (input.childId && input.reminderKind && input.reminderEventDate) {
    const { data: existing } = await supabase
      .from("email_messages")
      .select("id")
      .eq("child_id", input.childId)
      .eq("reminder_kind", input.reminderKind)
      .eq("reminder_event_date", input.reminderEventDate)
      .neq("status", "failed")
      .maybeSingle();
    if (existing) return { success: true, id: existing.id, reused: true };
  }

  const template = await getEmailTemplateByKey(input.templateKey);
  if (!template) return { success: false, error: "Couldn't find that template." };

  const values = input.childId
    ? await getTemplateTokenValues(input.childId, input.recipientName)
    : await getEnquiryTemplateTokenValues(input.familyEnquiryId!);
  const subject = fillTemplateTokens(template.subject, values);
  const body = fillTemplateTokens(template.body, values);

  const userId = await currentUserId();
  const { data: created, error } = await (supabase.from("email_messages") as any)
    .insert({
      template_key: template.key,
      child_id: input.childId ?? null,
      family_enquiry_id: input.familyEnquiryId ?? null,
      recipient_name: input.recipientName,
      recipient_email: trimmedEmail,
      subject: subject.text,
      body: body.text,
      status: "draft",
      reminder_kind: input.childId ? input.reminderKind ?? null : null,
      reminder_event_date: input.childId ? input.reminderEventDate ?? null : null,
      created_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    // A concurrent click can lose the race against the partial unique
    // index even after the check above — treat that the same as finding
    // it up front, rather than surfacing a raw constraint error.
    if (error?.code === "23505" && input.childId && input.reminderKind && input.reminderEventDate) {
      const { data: existing } = await supabase
        .from("email_messages")
        .select("id")
        .eq("child_id", input.childId)
        .eq("reminder_kind", input.reminderKind)
        .eq("reminder_event_date", input.reminderEventDate)
        .neq("status", "failed")
        .maybeSingle();
      if (existing) return { success: true, id: existing.id, reused: true };
    }
    return { success: false, error: `Could not start this draft: ${error?.message ?? "unknown error"}` };
  }

  revalidateEmailPaths();
  return { success: true, id: created.id, reused: false };
}

/** A blank ad hoc draft — used when composing isn't tied to a template at
 * all (not offered directly in the UI today, but kept available for a
 * "start from scratch" option later without another migration). */
export async function createBlankDraftEmail(input: {
  childId: string | null;
  recipientEmail: string;
  recipientName: string | null;
  subject: string;
  body: string;
}): Promise<CreateDraftResult> {
  const trimmedEmail = input.recipientEmail.trim();
  if (!trimmedEmail || !trimmedEmail.includes("@")) {
    return { success: false, error: "Enter a valid recipient email address." };
  }
  const supabase = createClient();
  const userId = await currentUserId();
  const { data: created, error } = await (supabase.from("email_messages") as any)
    .insert({
      child_id: input.childId,
      recipient_name: input.recipientName,
      recipient_email: trimmedEmail,
      subject: input.subject,
      body: input.body,
      status: "draft",
      created_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();
  if (error || !created) return { success: false, error: `Could not start this draft: ${error?.message ?? "unknown error"}` };
  revalidateEmailPaths();
  return { success: true, id: created.id, reused: false };
}

/** Creates one independent draft per selected child for an event reminder
 * (or any other ad hoc bulk send) — each its own row with its own
 * recipient, so sending them later is always one separate email per
 * family. No family ever sees another family's address: each draft holds
 * exactly one `recipient_email`, and sendEmail below only ever calls Resend
 * once per draft. Children with no email on file anywhere are reported back
 * as skipped rather than silently dropped. */
export async function createBulkEventReminderDrafts(
  templateKey: string,
  childIds: string[],
  extraTokens: { event_name?: string; event_details?: string }
): Promise<{ created: string[]; skipped: Array<{ childId: string; childName: string; reason: string }> }> {
  const template = await getEmailTemplateByKey(templateKey);
  if (!template) throw new Error("Couldn't find that template.");

  const created: string[] = [];
  const skipped: Array<{ childId: string; childName: string; reason: string }> = [];

  for (const childId of childIds) {
    const options = await getRecipientOptionsForChild(childId);
    const preferred = options.find((o) => o.source === "bill_payer") ?? options[0];
    if (!preferred) {
      skipped.push({ childId, childName: "", reason: "No email address on file for this family." });
      continue;
    }

    const values = await getTemplateTokenValues(childId, preferred.name);
    const subject = fillTemplateTokens(template.subject, { ...values, ...extraTokens });
    const body = fillTemplateTokens(template.body, { ...values, ...extraTokens });

    const supabase = createClient();
    const userId = await currentUserId();
    const { data: row, error } = await (supabase.from("email_messages") as any)
      .insert({
        template_key: template.key,
        child_id: childId,
        recipient_name: preferred.name,
        recipient_email: preferred.email,
        subject: subject.text,
        body: body.text,
        status: "draft",
        created_by: userId,
      } as any)
      .select("id")
      .single<{ id: string }>();

    if (error || !row) {
      skipped.push({ childId, childName: "", reason: error?.message ?? "Could not create this draft." });
    } else {
      created.push(row.id);
    }
  }

  revalidateEmailPaths();
  return { created, skipped };
}

export type UpdateDraftResult = { success: true } | { success: false; error: string };

/** Edits a draft's recipient/subject/body — refuses once it's actually gone
 * out (sending or sent), so a half-sent or already-sent email can never be
 * silently rewritten after the fact. "failed" is treated the same as
 * "draft" here — a failed send never reached anyone, and sendEmail's own
 * retry (`.in("status", ["draft", "failed"])`) relies on being able to
 * save edits to a failed draft's content before retrying it. */
export async function updateDraftEmail(
  id: string,
  fields: { recipient_name?: string | null; recipient_email?: string; subject?: string; body?: string }
): Promise<UpdateDraftResult> {
  if (fields.recipient_email !== undefined) {
    const trimmed = fields.recipient_email.trim();
    if (!trimmed || !trimmed.includes("@")) return { success: false, error: "Enter a valid recipient email address." };
    fields.recipient_email = trimmed;
  }

  const supabase = createClient();
  const { data, error } = await (supabase.from("email_messages") as any)
    .update(fields as any)
    .eq("id", id)
    .in("status", ["draft", "failed"])
    .select("id")
    .maybeSingle();

  if (error) return { success: false, error: `Could not save changes: ${error.message}` };
  if (!data) return { success: false, error: "This email has already been sent and can no longer be edited." };

  revalidateEmailPaths();
  return { success: true };
}

/** Same "draft or failed" rule as updateDraftEmail above — a failed send
 * is still fully abandonable, not just a draft is. */
export async function deleteDraftEmail(id: string): Promise<UpdateDraftResult> {
  const supabase = createClient();
  const { error, data } = await supabase.from("email_messages").delete().eq("id", id).in("status", ["draft", "failed"]).select("id").maybeSingle();
  if (error) return { success: false, error: `Could not delete this draft: ${error.message}` };
  if (!data) return { success: false, error: "This email has already been sent and can no longer be deleted." };
  revalidateEmailPaths();
  return { success: true };
}

// ---------------------------------------------------------------------------
// Attachments
// ---------------------------------------------------------------------------

export type AttachmentActionResult = { success: true; attachments: EmailAttachment[] } | { success: false; error: string };

/** Uploads a file straight onto a draft, explicitly chosen by whoever's
 * composing — nothing is ever attached automatically. Refuses once the
 * email has actually gone out, same "draft or failed" rule as
 * updateDraftEmail above. */
export async function addEmailAttachment(emailId: string, formData: FormData): Promise<AttachmentActionResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, error: "Choose a file to attach." };

  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("email_messages")
    .select("attachments, status")
    .eq("id", emailId)
    .maybeSingle();
  if (fetchError || !existing) return { success: false, error: "Couldn't find this email." };
  if (existing.status !== "draft" && existing.status !== "failed") {
    return { success: false, error: "This email has already been sent — attachments can't be changed." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${emailId}/${randomUUID()}-${safeName}`;
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) return { success: false, error: `Upload failed: ${uploadError.message}` };

  const nextAttachments: EmailAttachment[] = [...((existing.attachments as EmailAttachment[]) ?? []), { name: file.name, storage_path: storagePath, size: file.size }];
  const { error: updateError } = await (supabase.from("email_messages") as any)
    .update({ attachments: nextAttachments } as any)
    .eq("id", emailId)
    .in("status", ["draft", "failed"]);
  if (updateError) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save this attachment: ${updateError.message}` };
  }

  revalidateEmailPaths();
  return { success: true, attachments: nextAttachments };
}

export async function removeEmailAttachment(emailId: string, storagePath: string): Promise<AttachmentActionResult> {
  const supabase = createClient();
  const { data: existing, error: fetchError } = await supabase
    .from("email_messages")
    .select("attachments, status")
    .eq("id", emailId)
    .maybeSingle();
  if (fetchError || !existing) return { success: false, error: "Couldn't find this email." };
  if (existing.status !== "draft" && existing.status !== "failed") {
    return { success: false, error: "This email has already been sent — attachments can't be changed." };
  }

  const nextAttachments = ((existing.attachments as EmailAttachment[]) ?? []).filter((a) => a.storage_path !== storagePath);
  const { error: updateError } = await (supabase.from("email_messages") as any)
    .update({ attachments: nextAttachments } as any)
    .eq("id", emailId)
    .in("status", ["draft", "failed"]);
  if (updateError) return { success: false, error: `Could not remove this attachment: ${updateError.message}` };

  await supabase.storage.from(ATTACHMENTS_BUCKET).remove([storagePath]);
  revalidateEmailPaths();
  return { success: true, attachments: nextAttachments };
}

async function loadAttachmentsForSend(
  attachments: EmailAttachment[]
): Promise<Array<{ filename: string; content: Buffer }>> {
  if (attachments.length === 0) return [];
  const supabase = createClient();
  const loaded: Array<{ filename: string; content: Buffer }> = [];
  for (const a of attachments) {
    const { data, error } = await supabase.storage.from(ATTACHMENTS_BUCKET).download(a.storage_path);
    if (error || !data) throw new Error(`Could not load attachment "${a.name}" to send it: ${error?.message ?? "not found"}`);
    loaded.push({ filename: a.name, content: Buffer.from(await data.arrayBuffer()) });
  }
  return loaded;
}

// ---------------------------------------------------------------------------
// Sending
// ---------------------------------------------------------------------------

export type SendEmailResult = { success: true } | { success: false; error: string };

/** The only way an email actually goes out — always a deliberate click,
 * never automatic. Guards against a double-send (two clicks, a retry after
 * a slow response, two tabs) by atomically moving the row from
 * draft/failed to "sending" first: the `.in("status", [...])` on the
 * update means a second concurrent call finds no row left to claim and
 * fails immediately, before ever calling Resend a second time. Refuses to
 * send while any {{token}} is still unresolved, so a sent email can never
 * carry a visible "fill in" placeholder. */
export async function sendEmail(emailId: string): Promise<SendEmailResult> {
  const supabase = createClient();

  const { data: claimed, error: claimError } = await (supabase.from("email_messages") as any)
    .update({ status: "sending" } as any)
    .eq("id", emailId)
    .in("status", ["draft", "failed"])
    .select("*")
    .maybeSingle();

  if (claimError) return { success: false, error: `Could not start sending this email: ${claimError.message}` };
  if (!claimed) return { success: false, error: "This email has already been sent (or is already being sent)." };

  if (hasUnresolvedPlaceholders(claimed.subject) || hasUnresolvedPlaceholders(claimed.body)) {
    await (supabase.from("email_messages") as any).update({ status: "draft" } as any).eq("id", emailId);
    return { success: false, error: "This email still has a [[...]] placeholder that needs filling in before it can be sent." };
  }

  try {
    const attachments = await loadAttachmentsForSend((claimed.attachments as EmailAttachment[]) ?? []);
    const resend = getResendClient();
    const { data, error } = await resend.emails.send({
      from: getContactFromAddress(),
      to: claimed.recipient_email,
      subject: claimed.subject,
      html: renderPlainTextEmailBody(claimed.body),
      attachments: attachments.length > 0 ? attachments : undefined,
    });

    if (error) {
      await (supabase.from("email_messages") as any).update({ status: "failed", error_message: error.message } as any).eq("id", emailId);
      return { success: false, error: `Resend couldn't send this email: ${error.message}` };
    }

    await (supabase.from("email_messages") as any)
      .update({ status: "sent", sent_at: new Date().toISOString(), provider_message_id: data?.id ?? null, error_message: null } as any)
      .eq("id", emailId);

    revalidateEmailPaths();
    return { success: true };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Something went wrong sending this email.";
    await (supabase.from("email_messages") as any).update({ status: "failed", error_message: message } as any).eq("id", emailId);
    return { success: false, error: message };
  }
}

// ---------------------------------------------------------------------------
// Family enquiries ("Create new family profile")
// ---------------------------------------------------------------------------

export type CreateEnquiryResult =
  | { success: true; id: string }
  | { success: false; error: string }
  | { success: false; needsConfirmation: true; duplicates: Awaited<ReturnType<typeof findPotentialDuplicateFamilies>> };

/** Adds a prospective family as an "enquiry" — deliberately not a real
 * `children` row (see migration 0050's comment on family_enquiries), so it
 * can never be counted toward active enrolments, attendance or billing.
 * Checks for a likely-existing family first and asks for confirmation
 * rather than silently creating a possible duplicate; pass `force: true`
 * (after the caller has shown those matches to a human) to create it
 * anyway. */
export async function createFamilyEnquiry(
  input: {
    childFullName: string;
    parentFullName: string;
    parentEmail: string;
    parentPhone?: string | null;
    intendedRoomId?: string | null;
    intendedStartDate?: string | null;
    notes?: string | null;
  },
  opts?: { force?: boolean }
): Promise<CreateEnquiryResult> {
  const childFullName = input.childFullName.trim();
  const parentFullName = input.parentFullName.trim();
  const parentEmail = input.parentEmail.trim();

  if (!childFullName) return { success: false, error: "Enter the child's name." };
  if (!parentFullName) return { success: false, error: "Enter the parent/guardian's name." };
  if (!parentEmail || !parentEmail.includes("@")) return { success: false, error: "Enter a valid email address." };

  if (!opts?.force) {
    const duplicates = await findPotentialDuplicateFamilies({ parentName: parentFullName, parentEmail, childName: childFullName });
    if (duplicates.length > 0) return { success: false, needsConfirmation: true, duplicates };
  }

  const supabase = createClient();
  const userId = await currentUserId();
  const { data: created, error } = await (supabase.from("family_enquiries") as any)
    .insert({
      child_full_name: childFullName,
      parent_full_name: parentFullName,
      parent_email: parentEmail,
      parent_phone: input.parentPhone?.trim() || null,
      intended_room_id: input.intendedRoomId || null,
      intended_start_date: input.intendedStartDate || null,
      notes: input.notes?.trim() || null,
      created_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) return { success: false, error: `Could not save this enquiry: ${error?.message ?? "unknown error"}` };

  revalidatePath("/email");
  return { success: true, id: created.id };
}

export async function updateFamilyEnquiryStatus(id: string, status: "enquiry" | "converted" | "dismissed"): Promise<UpdateDraftResult> {
  const supabase = createClient();
  const { error } = await (supabase.from("family_enquiries") as any).update({ status } as any).eq("id", id);
  if (error) return { success: false, error: `Could not update this enquiry: ${error.message}` };
  revalidatePath("/email");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Family contacts (additional guardians)
// ---------------------------------------------------------------------------

export async function addFamilyContact(
  billPayerId: string,
  fields: { full_name: string; relationship?: string | null; email?: string | null; phone?: string | null; is_primary?: boolean }
): Promise<UpdateDraftResult> {
  const fullName = fields.full_name.trim();
  if (!fullName) return { success: false, error: "Enter this contact's name." };

  const supabase = createClient();
  const userId = await currentUserId();
  const { error } = await (supabase.from("family_contacts") as any).insert({
    bill_payer_id: billPayerId,
    full_name: fullName,
    relationship: fields.relationship?.trim() || null,
    email: fields.email?.trim() || null,
    phone: fields.phone?.trim() || null,
    is_primary: fields.is_primary ?? false,
    created_by: userId,
  } as any);
  if (error) return { success: false, error: `Could not save this contact: ${error.message}` };

  revalidatePath("/email");
  revalidatePath("/children");
  return { success: true };
}

export async function updateFamilyContact(
  id: string,
  fields: { full_name?: string; relationship?: string | null; email?: string | null; phone?: string | null; is_primary?: boolean }
): Promise<UpdateDraftResult> {
  const supabase = createClient();
  const { error } = await (supabase.from("family_contacts") as any).update(fields as any).eq("id", id);
  if (error) return { success: false, error: `Could not save changes: ${error.message}` };
  revalidatePath("/email");
  revalidatePath("/children");
  return { success: true };
}

export async function deleteFamilyContact(id: string): Promise<UpdateDraftResult> {
  const supabase = createClient();
  const { error } = await supabase.from("family_contacts").delete().eq("id", id);
  if (error) return { success: false, error: `Could not remove this contact: ${error.message}` };
  revalidatePath("/email");
  revalidatePath("/children");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Templates (editing)
// ---------------------------------------------------------------------------

export async function updateEmailTemplate(
  key: string,
  fields: { label?: string; subject?: string; body?: string }
): Promise<UpdateDraftResult> {
  if (fields.subject !== undefined && !fields.subject.trim()) return { success: false, error: "Subject can't be blank." };
  if (fields.body !== undefined && !fields.body.trim()) return { success: false, error: "Message can't be blank." };

  const supabase = createClient();
  const userId = await currentUserId();
  const { error } = await (supabase.from("email_templates") as any)
    .update({ ...fields, updated_by: userId } as any)
    .eq("key", key);
  if (error) return { success: false, error: `Could not save this template: ${error.message}` };

  revalidatePath("/email");
  return { success: true };
}

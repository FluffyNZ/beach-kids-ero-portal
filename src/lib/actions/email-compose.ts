"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { sendEmail } from "@/lib/actions/email";
import { getDraftBatch, personalise, type MessageRow } from "@/lib/data/email-hub";
import { isValidEmail } from "@/lib/email-format";
import type { EmailAttachment, EmailReminderKind } from "@/lib/types";

// Saving, previewing and sending a message that may go to several people.
// Each recipient is one email_messages row; rows saved together share the
// same created_at and created_by so the draft reopens as one message.

const ATTACHMENTS_BUCKET = "email-attachments";

export type DraftRecipientInput = {
  email: string;
  name: string | null;
  childId: string | null;
  billPayerId: string | null;
  staffId: string | null;
  enquiryId: string | null;
};

export type SavedRow = { id: string; email: string };
export type SaveDraftResult =
  | { success: true; rows: SavedRow[]; savedAt: string }
  | { success: false; error: string; existingDraftId?: string };

function revalidate() {
  revalidatePath("/email");
  revalidatePath("/email/history");
  revalidatePath("/email/enquiries");
  revalidatePath("/dashboard");
}

async function editableRows(ids: string[]) {
  if (ids.length === 0) return { rows: [] as any[], error: null as string | null };
  const supabase = createClient();
  const { data, error } = await supabase.from("email_messages").select("*").in("id", ids);
  if (error) return { rows: [], error: `Couldn't load this draft: ${error.message}` };
  const rows = data ?? [];
  if (rows.length !== ids.length) return { rows, error: "Part of this draft no longer exists. Reopen it from Email history." };
  if (rows.some((r: any) => r.status !== "draft" && r.status !== "failed")) {
    return { rows, error: "Some of these emails have already been sent, so this draft can't be changed. Reopen it from Email history." };
  }
  return { rows, error: null };
}

/** Saves the whole message: updates rows for recipients already saved,
 * adds rows for new recipients and removes rows for recipients taken off. */
export async function saveDraftBatch(input: {
  batchIds: string[];
  recipients: DraftRecipientInput[];
  subject: string;
  body: string;
  templateKey: string | null;
  reminder: { kind: EmailReminderKind; date: string; childId: string } | null;
}): Promise<SaveDraftResult> {
  if (input.recipients.length === 0) return { success: false, error: "Add at least one recipient." };
  const seen = new Set<string>();
  for (const r of input.recipients) {
    const key = r.email.trim().toLowerCase();
    if (!isValidEmail(key)) return { success: false, error: `${r.email || "A recipient"} isn't a valid email address.` };
    if (seen.has(key)) return { success: false, error: `${r.email} is listed twice. Each address gets one email.` };
    seen.add(key);
  }

  const { rows: existing, error: loadError } = await editableRows(input.batchIds);
  if (loadError) return { success: false, error: loadError };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const createdAt: string = existing[0]?.created_at ?? new Date().toISOString();
  const createdBy: string | null = existing[0]?.created_by ?? user?.id ?? null;
  const sharedAttachments: EmailAttachment[] = existing[0]?.attachments ?? [];
  const byEmail = new Map(existing.map((r: any) => [String(r.recipient_email).toLowerCase(), r]));
  const single = input.recipients.length === 1 ? input.recipients[0] : null;
  const reminderFor = (r: DraftRecipientInput) =>
    input.reminder && single && r === single && r.childId === input.reminder.childId ? input.reminder : null;

  const fields = (r: DraftRecipientInput) => ({
    recipient_email: r.email.trim(),
    recipient_name: r.name?.trim() || null,
    child_id: r.childId,
    bill_payer_id: r.billPayerId,
    staff_id: r.staffId,
    family_enquiry_id: r.enquiryId,
    subject: input.subject,
    body: input.body,
    template_key: input.templateKey,
    reminder_kind: reminderFor(r)?.kind ?? null,
    reminder_event_date: reminderFor(r)?.date ?? null,
  });

  const keep = new Set(input.recipients.map((r) => r.email.trim().toLowerCase()));
  const removeIds = existing.filter((r: any) => !keep.has(String(r.recipient_email).toLowerCase())).map((r: any) => r.id);
  if (removeIds.length) {
    const { error } = await supabase.from("email_messages").delete().in("id", removeIds).in("status", ["draft", "failed"]);
    if (error) return { success: false, error: `Couldn't remove a recipient: ${error.message}` };
  }

  const saved: SavedRow[] = [];
  for (const r of input.recipients) {
    const row = byEmail.get(r.email.trim().toLowerCase());
    if (!row) continue;
    const { error } = await (supabase.from("email_messages") as any).update(fields(r)).eq("id", row.id).in("status", ["draft", "failed"]);
    if (error) return { success: false, error: `Couldn't save the draft: ${error.message}` };
    saved.push({ id: row.id, email: r.email.trim() });
  }

  const toInsert = input.recipients.filter((r) => !byEmail.has(r.email.trim().toLowerCase()));
  if (toInsert.length) {
    const { data, error } = await (supabase.from("email_messages") as any)
      .insert(toInsert.map((r) => ({ ...fields(r), status: "draft", attachments: sharedAttachments, created_at: createdAt, created_by: createdBy })))
      .select("id, recipient_email");
    if (error) {
      if (error.code === "23505" && input.reminder) {
        const { data: other } = await supabase
          .from("email_messages")
          .select("id, status")
          .eq("child_id", input.reminder.childId)
          .eq("reminder_kind", input.reminder.kind)
          .eq("reminder_event_date", input.reminder.date)
          .neq("status", "failed")
          .maybeSingle();
        return {
          success: false,
          error: other?.status === "sent" ? "This email has already been sent for this occasion." : "A draft already exists for this occasion.",
          existingDraftId: other?.status === "sent" ? undefined : other?.id,
        };
      }
      return { success: false, error: `Couldn't save the draft: ${error.message}` };
    }
    (data ?? []).forEach((d: any) => saved.push({ id: d.id, email: d.recipient_email }));
  }

  revalidate();
  return { success: true, rows: saved, savedAt: new Date().toISOString() };
}

export type ActionResult = { success: true } | { success: false; error: string };

async function removeUnreferenced(paths: string[]) {
  if (paths.length === 0) return;
  const supabase = createClient();
  const orphaned: string[] = [];
  for (const p of paths) {
    const { data } = await supabase.from("email_messages").select("id").contains("attachments", [{ storage_path: p }]).limit(1);
    if (!data || data.length === 0) orphaned.push(p);
  }
  if (orphaned.length) await supabase.storage.from(ATTACHMENTS_BUCKET).remove(orphaned);
}

export async function deleteDraftBatch(ids: string[]): Promise<ActionResult> {
  const { rows, error } = await editableRows(ids);
  if (error) return { success: false, error };
  const supabase = createClient();
  const { error: delError } = await supabase.from("email_messages").delete().in("id", ids).in("status", ["draft", "failed"]);
  if (delError) return { success: false, error: `Couldn't delete this draft: ${delError.message}` };
  const paths = Array.from(new Set(rows.flatMap((r: any) => (r.attachments ?? []).map((a: EmailAttachment) => a.storage_path))));
  await removeUnreferenced(paths);
  revalidate();
  return { success: true };
}

export type AttachmentsResult = { success: true; attachments: EmailAttachment[] } | { success: false; error: string };

/** Uploads a file once and attaches it to every recipient's email. */
export async function addBatchAttachment(ids: string[], formData: FormData): Promise<AttachmentsResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, error: "Choose a file to attach." };
  if (file.size > 20 * 1024 * 1024) return { success: false, error: "Attachments must be under 20 MB." };
  const { rows, error } = await editableRows(ids);
  if (error) return { success: false, error };
  if (rows.length === 0) return { success: false, error: "Save the draft before adding attachments." };

  const supabase = createClient();
  const path = `${ids[0]}/${randomUUID()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
  const { error: uploadError } = await supabase.storage.from(ATTACHMENTS_BUCKET).upload(path, await file.arrayBuffer(), {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) return { success: false, error: `Upload failed: ${uploadError.message}` };

  const next: EmailAttachment[] = [...((rows[0].attachments as EmailAttachment[]) ?? []), { name: file.name, storage_path: path, size: file.size }];
  const { error: updateError } = await (supabase.from("email_messages") as any).update({ attachments: next }).in("id", ids).in("status", ["draft", "failed"]);
  if (updateError) {
    await supabase.storage.from(ATTACHMENTS_BUCKET).remove([path]);
    return { success: false, error: `Couldn't attach the file: ${updateError.message}` };
  }
  revalidate();
  return { success: true, attachments: next };
}

export async function removeBatchAttachment(ids: string[], storagePath: string): Promise<AttachmentsResult> {
  const { rows, error } = await editableRows(ids);
  if (error) return { success: false, error };
  const supabase = createClient();
  const next = ((rows[0]?.attachments as EmailAttachment[]) ?? []).filter((a) => a.storage_path !== storagePath);
  const { error: updateError } = await (supabase.from("email_messages") as any).update({ attachments: next }).in("id", ids).in("status", ["draft", "failed"]);
  if (updateError) return { success: false, error: `Couldn't remove the attachment: ${updateError.message}` };
  await removeUnreferenced([storagePath]);
  revalidate();
  return { success: true, attachments: next };
}

export type RecipientPreview = {
  id: string;
  email: string;
  name: string | null;
  status: string;
  subject: string;
  body: string;
  missing: string[];
};

async function previewRows(rows: MessageRow[]): Promise<RecipientPreview[]> {
  const out: RecipientPreview[] = [];
  for (const r of rows) {
    const p = await personalise(
      { childId: r.childId, enquiryId: r.enquiryId, staffName: r.staffName, recipientName: r.recipientName },
      r.subject,
      r.body
    );
    out.push({ id: r.id, email: r.recipientEmail, name: r.recipientName, status: r.status, subject: p.subject, body: p.body, missing: p.missing });
  }
  return out;
}

/** Each recipient's personalised subject and message, as they'd be sent. */
export async function previewDraftBatch(leadId: string): Promise<{ success: true; previews: RecipientPreview[] } | { success: false; error: string }> {
  const rows = await getDraftBatch(leadId);
  if (rows.length === 0) return { success: false, error: "This draft couldn't be found." };
  return { success: true, previews: await previewRows(rows.filter((r) => r.status === "draft" || r.status === "failed")) };
}

export type SendBatchResult =
  | { success: true; sent: string[]; failed: Array<{ id: string; email: string; error: string }> }
  | { success: false; error: string };

const pause = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Sends some of a draft's emails (the page sends a long list in small
 * groups). Each recipient gets a separate email addressed only to them.
 * Nothing is sent if the list changed since review, an address appears
 * twice, or any recipient still has an unfilled field. A failed email keeps
 * its draft wording so it can be retried. */
export async function sendDraftBatch(input: { leadId: string; ids: string[]; expectedTotal: number }): Promise<SendBatchResult> {
  const batch = (await getDraftBatch(input.leadId)).filter((r) => r.status === "draft" || r.status === "failed");
  if (batch.length !== input.expectedTotal) {
    return { success: false, error: "The recipients changed since this was reviewed. Review the email again before sending." };
  }
  const emails = batch.map((r) => r.recipientEmail.toLowerCase());
  if (new Set(emails).size !== emails.length) return { success: false, error: "An address appears more than once. Remove the duplicate and try again." };
  const targets = batch.filter((r) => input.ids.includes(r.id));
  if (targets.length !== input.ids.length) return { success: false, error: "Some of these emails were already sent or removed. Review the email again." };

  const previews = await previewRows(batch);
  const blocked = previews.filter((p) => p.missing.length > 0);
  if (blocked.length) {
    return { success: false, error: `Fill in the missing details for ${blocked.map((b) => b.name || b.email).join(", ")} before sending.` };
  }

  const supabase = createClient();
  const sent: string[] = [];
  const failed: Array<{ id: string; email: string; error: string }> = [];
  for (const [i, r] of targets.entries()) {
    const p = previews.find((x) => x.id === r.id)!;
    const { error: writeError } = await (supabase.from("email_messages") as any)
      .update({ subject: p.subject, body: p.body })
      .eq("id", r.id)
      .in("status", ["draft", "failed"]);
    if (writeError) {
      failed.push({ id: r.id, email: r.recipientEmail, error: `Couldn't prepare this email: ${writeError.message}` });
      continue;
    }
    const result = await sendEmail(r.id);
    if (result.success) sent.push(r.id);
    else {
      failed.push({ id: r.id, email: r.recipientEmail, error: result.error });
      // Keep the draft as written (with its fields) so it can be edited and retried.
      await (supabase.from("email_messages") as any).update({ subject: r.subject, body: r.body }).eq("id", r.id).in("status", ["draft", "failed"]);
    }
    if (i < targets.length - 1) await pause(600); // stay under the sending service's rate limit
  }
  revalidate();
  return { success: true, sent, failed };
}

"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getSignedStaffDocumentUrl } from "@/lib/data/staff";
import type {
  StaffContractType,
  StaffDocumentCategory,
  StaffStatus,
  StaffQualificationStatus,
} from "@/lib/supabase/database.types";
import type { StaffDocumentExtractDraft } from "@/lib/types";

const BUCKET = process.env.NEXT_PUBLIC_STAFF_DOCUMENTS_BUCKET || "staff-documents";
const PHOTO_BUCKET = process.env.NEXT_PUBLIC_STAFF_PHOTOS_BUCKET || "staff-photos";
const ALLOWED_PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function safeStoragePath(file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${new Date().getFullYear()}/${randomUUID()}-${safeName}`;
}

function safePhotoPath(staffId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${staffId}/${randomUUID()}-${safeName}`;
}

export type CreateStaffResult = { success: true; staffId: string } | { success: false; error: string };

export async function createStaffMember(formData: FormData): Promise<CreateStaffResult> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const role = String(formData.get("role") ?? "").trim() || null;
  const startDate = (formData.get("start_date") as string) || null;
  const contractType = (String(formData.get("contract_type") ?? "").trim() || null) as StaffContractType | null;

  if (!fullName) {
    return { success: false, error: "Enter the staff member's name." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: staffRow, error } = await supabase
    .from("staff")
    .insert({
      full_name: fullName,
      role,
      start_date: startDate,
      contract_type: contractType,
      created_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !staffRow) {
    return { success: false, error: `Could not add staff member: ${error?.message}` };
  }

  revalidatePath("/staff");
  return { success: true, staffId: staffRow.id };
}

export type CreateMinimalStaffResult = { success: true; staffId: string } | { success: false; error: string };

/** A lightweight profile for a staff member named on an old paper form (e.g.
 * via Accident & Illness photo import) who turns out not to be in the system
 * at all. Status defaults to "former" — a form only just being digitised
 * usually means they've already left — and `notes` records how the profile
 * came to exist, so it never looks like a normal employment record. Finds an
 * existing exact-name match first, the same way createMinimalChildProfile
 * does, so calling this twice for the same name never creates two profiles. */
export async function createMinimalStaffProfile(fullName: string): Promise<CreateMinimalStaffResult> {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { success: false, error: "Enter the staff member's name." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: existing } = await supabase
    .from("staff")
    .select("id")
    .ilike("full_name", trimmed)
    .maybeSingle();
  if (existing) {
    return { success: true, staffId: existing.id };
  }

  const { data: staffRow, error } = await supabase
    .from("staff")
    .insert({
      full_name: trimmed,
      status: "former",
      notes: "Profile created automatically from an Accident & Illness photo import — no other details were supplied.",
      created_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !staffRow) {
    return { success: false, error: `Could not create a profile: ${error?.message ?? "unknown error"}` };
  }

  revalidatePath("/staff");
  revalidatePath("/records/accidents-illness");
  return { success: true, staffId: staffRow.id };
}

export async function updateStaffDetails(
  staffId: string,
  fields: {
    full_name?: string;
    role?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    date_of_birth?: string | null;
    contract_type?: StaffContractType | null;
    pay_rate?: number | null;
    min_hours?: number | null;
    notes?: string | null;
  }
) {
  const supabase = createClient();
  const { error } = await (supabase.from("staff") as any).update(fields as any).eq("id", staffId);
  if (error) {
    throw new Error(
      `Could not save: ${error.message}. If this mentions a missing column, migration 0014_staff_employment_terms.sql hasn't been run in Supabase yet.`
    );
  }
  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
}

export type DeleteStaffResult = { success: true } | { success: false; error: string };

/** Permanently removes a staff member and everything hanging off them —
 * their documents (both the database rows and the actual files in
 * storage), qualification record, and safety-check status all cascade
 * with the DB delete; the storage objects don't, so those are cleaned up
 * afterwards on a best-effort basis. There is no undo. */
export async function deleteStaffMember(staffId: string): Promise<DeleteStaffResult> {
  try {
    const supabase = createClient();

    const { data: docs } = await supabase.from("staff_documents").select("storage_path").eq("staff_id", staffId);

    const { error, count } = await supabase
      .from("staff")
      .delete({ count: "exact" })
      .eq("id", staffId);

    if (error) {
      return { success: false, error: `Could not delete staff member: ${error.message}` };
    }
    if (!count) {
      return {
        success: false,
        error: "Nothing was deleted — this profile may already be gone, or you may not have permission.",
      };
    }

    const storagePaths = (docs ?? []).map((d) => d.storage_path).filter(Boolean);
    if (storagePaths.length > 0) {
      await supabase.storage.from(BUCKET).remove(storagePaths);
    }

    revalidatePath("/staff");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `Could not delete staff member: ${err.message}` : "Could not delete staff member.",
    };
  }
}

/** Whether this educator's learning stories publish immediately or need a
 * reviewer first. This is a workflow setting, not real access control —
 * Beach Kids currently runs on a single shared login, so it can't be
 * enforced as a per-account permission yet. */
export async function updateStaffPublishPermission(staffId: string, canPublishDirectly: boolean) {
  const supabase = createClient();
  await (supabase.from("staff") as any).update({ can_publish_learning_stories: canPublishDirectly } as any).eq("id", staffId);
  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
}

export async function setStaffStatus(staffId: string, status: StaffStatus) {
  const supabase = createClient();
  await (supabase.from("staff") as any).update({ status } as any).eq("id", staffId);
  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
}

export type UploadStaffDocumentResult = { success: true } | { success: false; error: string };

/** Kept for reference/other callers, but the main Staff Document upload UI
 * no longer uses this — see recordStaffDocumentUpload below for why. It
 * routes the actual file bytes through this Server Action, which is capped
 * at Vercel's hard request-body limit on serverless functions — around
 * 4.5MB — regardless of the higher `bodySizeLimit` set in next.config.js.
 * That's silent and shows up to the person only as a generic "client-side
 * exception" page, which is what made a ~6MB scanned document or a big
 * phone photo fail while small files worked fine. */
export async function uploadStaffDocument(
  staffId: string,
  formData: FormData
): Promise<UploadStaffDocumentResult> {
  const file = formData.get("file") as File | null;
  const category = (String(formData.get("category") ?? "").trim() || "other") as StaffDocumentCategory;
  const documentDate = (formData.get("document_date") as string) || null;
  const expiryDate = (formData.get("expiry_date") as string) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!file || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const storagePath = safeStoragePath(file);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { error: insertError } = await supabase.from("staff_documents").insert({
    staff_id: staffId,
    category,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type || null,
    file_size_bytes: file.size,
    document_date: documentDate,
    expiry_date: expiryDate,
    notes,
    uploaded_by: userId,
  } as any);

  if (insertError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the document: ${insertError.message}` };
  }

  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
  return { success: true };
}

export type RecordStaffDocumentFields = {
  category: StaffDocumentCategory;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number;
  document_date: string | null;
  expiry_date: string | null;
  notes: string | null;
};

export type RecordStaffDocumentResult = { success: true } | { success: false; error: string };

/** Records a staff document the browser has ALREADY uploaded straight to
 * Supabase Storage (see AddStaffDocumentModal) — this action only ever
 * receives a handful of small text fields, never the file itself, so a
 * large scanned PDF or photo can't hit Vercel's request-body limit here the
 * way it could with the old formData-with-a-file-in-it approach above. If
 * the insert fails, the caller is responsible for removing the
 * now-orphaned storage object it already uploaded. */
export async function recordStaffDocumentUpload(
  staffId: string,
  fields: RecordStaffDocumentFields
): Promise<RecordStaffDocumentResult> {
  const supabase = createClient();
  const userId = await currentUserId();

  const { error: insertError } = await supabase.from("staff_documents").insert({
    staff_id: staffId,
    category: fields.category,
    storage_path: fields.storage_path,
    original_filename: fields.original_filename,
    mime_type: fields.mime_type,
    file_size_bytes: fields.file_size_bytes,
    document_date: fields.document_date,
    expiry_date: fields.expiry_date,
    notes: fields.notes,
    uploaded_by: userId,
  } as any);

  if (insertError) {
    return { success: false, error: `Could not save the document: ${insertError.message}` };
  }

  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
  return { success: true };
}

// ---------------------------------------------------------------------------
// AI photo import — reads a photo of a staff document (police vet letter,
// first aid card, contract, ID, qualification certificate, etc.) and
// returns a draft to pre-fill the upload form with. It never uploads or
// saves anything itself.
//
// Requires the same ANTHROPIC_API_KEY as Learning Stories' "Help Me Write"
// and the Accident & Illness photo import. Until that key is added this
// returns a clear "not connected" result rather than a fake response. Even
// once connected: the model only ever reads what's legibly on the page —
// told to say "unclear" (null) rather than guess — and nothing here saves
// anything; the person still reviews the pre-filled upload form and clicks
// Upload.
// ---------------------------------------------------------------------------

const ALL_STAFF_DOCUMENT_CATEGORIES: StaffDocumentCategory[] = [
  "contract",
  "identification",
  "secondary_identification",
  "police_vet",
  "first_aid",
  "qualification",
  "visa_work_entitlement",
  "professional_growth_cycle",
  "staff_profile_form",
  "cv_work_history",
  "job_description",
  "interview_recruitment",
  "induction",
  "child_protection",
  "tax_kiwisaver",
  "cv_interview",
  "pay_parity_agreement",
  "other",
];

export type ExtractStaffDocumentResult =
  | { success: true; draft: StaffDocumentExtractDraft }
  | { success: false; error: string; notConfigured?: boolean };

const EXTRACT_DOCUMENT_SYSTEM_PROMPT = `You are reading a photo of one document from a New Zealand early childhood education staff file — it could be a contract, a police vetting result, a first aid certificate, an ID, a qualification certificate, or similar — so a manager can review it before it's filed against a staff member's profile.

Strict rules:
- Only report what is actually legible on the page. Never guess, infer, or fill in a plausible-sounding value for anything you can't clearly read.
- category_guess must be exactly one of the allowed category values listed below, or null if you're not confident which one applies — never invent a category name.
- document_date_guess is the date the document was issued/completed/signed (YYYY-MM-DD), or null if there's no such date or it isn't clearly legible.
- expiry_date_guess is a renewal/expiry/"next due" date explicitly printed or written on the document (YYYY-MM-DD), or null if the document doesn't show one or it isn't clearly legible. Never calculate or estimate one yourself (e.g. from a standard validity period) — only report a date that's actually written on the page.
- List the keys of any field you're genuinely unsure about in low_confidence_fields.
- Respond with ONLY a single JSON object matching the schema you're given — no other text, no markdown code fences.

Allowed category values: ${ALL_STAFF_DOCUMENT_CATEGORIES.join(", ")}`;

function buildStaffDocumentSchemaInstruction(): string {
  return `Return exactly this JSON shape (all keys required):
{
  "category_guess": string | null,
  "document_date_guess": string | null,
  "expiry_date_guess": string | null,
  "low_confidence_fields": string[]
}`;
}

function parseStaffDocumentExtractedJson(raw: string): StaffDocumentExtractDraft | null {
  let text = raw.trim();
  // Strip a markdown code fence if the model added one despite instructions.
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) text = fenceMatch[1];

  try {
    const parsed = JSON.parse(text);
    const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
    const categoryGuess = strOrNull(parsed.category_guess);
    return {
      category_guess:
        categoryGuess && (ALL_STAFF_DOCUMENT_CATEGORIES as string[]).includes(categoryGuess)
          ? (categoryGuess as StaffDocumentCategory)
          : null,
      document_date_guess: strOrNull(parsed.document_date_guess),
      expiry_date_guess: strOrNull(parsed.expiry_date_guess),
      low_confidence_fields: Array.isArray(parsed.low_confidence_fields)
        ? parsed.low_confidence_fields.filter((f: unknown): f is string => typeof f === "string")
        : [],
    };
  } catch {
    return null;
  }
}

const SUPPORTED_DOCUMENT_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function extractStaffDocumentFromPhoto(formData: FormData): Promise<ExtractStaffDocumentResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      notConfigured: true,
      error:
        "AI photo reading isn't connected yet. Add an ANTHROPIC_API_KEY to this app's environment to turn it on — you can still fill this in by hand.",
    };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose a photo of the document first." };
  }
  if (!SUPPORTED_DOCUMENT_IMAGE_TYPES.has(file.type)) {
    return {
      success: false,
      error:
        "That file type isn't supported for photo reading — use a JPG, PNG or WEBP photo. (iPhones set to \"High Efficiency\" save HEIC photos; switch to \"Most Compatible\" in Settings → Camera → Formats, or export as JPG first.) PDFs can still be uploaded normally, just without auto-fill.",
    };
  }

  const model = process.env.ANTHROPIC_LEARNING_STORY_MODEL || "claude-sonnet-5";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 512,
        system: EXTRACT_DOCUMENT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
              { type: "text", text: buildStaffDocumentSchemaInstruction() },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { success: false, error: `AI photo reading request failed (${response.status}). ${detail.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = Array.isArray(data?.content)
      ? data.content.map((block: any) => (block?.type === "text" ? block.text : "")).join("\n").trim()
      : "";

    const draft = text ? parseStaffDocumentExtractedJson(text) : null;
    if (!draft) {
      return {
        success: false,
        error: "Couldn't read a usable result from the photo — try a clearer, well-lit photo, or fill it in by hand.",
      };
    }

    return { success: true, draft };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `AI photo reading failed: ${err.message}` : "AI photo reading failed.",
    };
  }
}

export type DeleteStaffDocumentResult = { success: true } | { success: false; error: string };

/** Removes one document from a staff member's file — used both for the
 * required-document slots (which can now hold more than one file each) and
 * the "Other documents" list. Only removes the one file picked, never the
 * whole category, and takes the actual storage object with it so nothing
 * orphaned is left behind in the bucket. */
export async function deleteStaffDocument(staffId: string, documentId: string): Promise<DeleteStaffDocumentResult> {
  const supabase = createClient();

  const { data: doc } = await supabase
    .from("staff_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("staff_id", staffId)
    .maybeSingle();

  if (!doc) {
    return { success: false, error: "That document couldn't be found — it may have already been removed." };
  }

  const { error: deleteError } = await supabase.from("staff_documents").delete().eq("id", documentId);
  if (deleteError) {
    return { success: false, error: `Could not remove the document: ${deleteError.message}` };
  }

  await supabase.storage.from(BUCKET).remove([doc.storage_path]);

  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
  return { success: true };
}

export async function updateStaffQualification(
  staffId: string,
  fields: {
    qualification_status?: StaffQualificationStatus;
    qualification_level?: string | null;
    registration_status?: string | null;
    pay_parity_step?: string | null;
    next_review_date?: string | null;
    is_studying?: boolean;
    studying_qualification?: string | null;
    expected_completion_date?: string | null;
    notes?: string | null;
  }
) {
  const supabase = createClient();
  const userId = await currentUserId();

  await (supabase
    .from("staff_qualifications") as any)
    .upsert({ staff_id: staffId, ...fields, updated_by: userId } as any, { onConflict: "staff_id" });

  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
}

export type UploadChecklistEvidenceResult = { success: true } | { success: false; error: string };

/** Uploading evidence for a checklist item does two things at once: it
 * creates a normal staff_documents row (filed under that item's document
 * category, so it also shows up in the person's Documents list) and it
 * ticks the checklist item, linking it to that exact file. */
export async function uploadChecklistEvidence(
  staffId: string,
  itemId: string,
  formData: FormData
): Promise<UploadChecklistEvidenceResult> {
  const file = formData.get("file") as File | null;
  const documentDate = (formData.get("document_date") as string) || null;
  const expiryDate = (formData.get("expiry_date") as string) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!file || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: item } = await supabase
    .from("staff_checklist_items")
    .select("document_category")
    .eq("id", itemId)
    .maybeSingle();

  const category: StaffDocumentCategory = item?.document_category ?? "other";
  const storagePath = safeStoragePath(file);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { data: documentRow, error: insertError } = await supabase
    .from("staff_documents")
    .insert({
      staff_id: staffId,
      category,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      document_date: documentDate,
      expiry_date: expiryDate,
      notes,
      uploaded_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (insertError || !documentRow) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the document: ${insertError?.message}` };
  }

  await (supabase.from("staff_checklist_status") as any).upsert(
    {
      staff_id: staffId,
      item_id: itemId,
      is_checked: true,
      checked_at: new Date().toISOString(),
      checked_by: userId,
      document_id: documentRow.id,
    } as any,
    { onConflict: "staff_id,item_id" }
  );

  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
  return { success: true };
}

export async function updateStaffChecklistItem(
  staffId: string,
  itemId: string,
  fields: { is_checked?: boolean; notes?: string | null }
) {
  const supabase = createClient();
  const userId = await currentUserId();

  await (supabase.from("staff_checklist_status") as any).upsert(
    {
      staff_id: staffId,
      item_id: itemId,
      ...fields,
      ...(fields.is_checked !== undefined
        ? {
            checked_at: fields.is_checked ? new Date().toISOString() : null,
            checked_by: fields.is_checked ? userId : null,
          }
        : {}),
    } as any,
    { onConflict: "staff_id,item_id" }
  );

  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
}

export type UploadStaffPhotoResult = { success: true } | { success: false; error: string };

/** Replaces this staff member's profile photo. The old file (if any) is
 * removed from storage after the new one uploads successfully, so a
 * failed upload never leaves them without a photo. This is also what the
 * Centre Calendar shows on their birthday, so it's worth keeping current. */
export async function uploadStaffPhoto(staffId: string, formData: FormData): Promise<UploadStaffPhotoResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose a photo to upload." };
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { success: false, error: "Photos must be a JPG, PNG or WEBP file." };
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("staff")
    .select("photo_storage_path")
    .eq("id", staffId)
    .maybeSingle();

  const storagePath = safePhotoPath(staffId, file);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { error: updateError } = await (supabase.from("staff") as any)
    .update({ photo_storage_path: storagePath } as any)
    .eq("id", staffId);

  if (updateError) {
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the photo: ${updateError.message}` };
  }

  if (existing?.photo_storage_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_storage_path]);
  }

  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
  revalidatePath("/calendar");
  return { success: true };
}

export async function removeStaffPhoto(staffId: string): Promise<UploadStaffPhotoResult> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("staff")
    .select("photo_storage_path")
    .eq("id", staffId)
    .maybeSingle();

  await (supabase.from("staff") as any).update({ photo_storage_path: null } as any).eq("id", staffId);

  if (existing?.photo_storage_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_storage_path]);
  }

  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
  revalidatePath("/calendar");
  return { success: true };
}

export async function getSignedUrlForStaffDocument(storagePath: string, download?: boolean): Promise<string | null> {
  return getSignedStaffDocumentUrl(storagePath, download ? { download: true } : undefined);
}

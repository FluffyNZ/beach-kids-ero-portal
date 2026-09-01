"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getSignedEvidenceUrl } from "@/lib/data/evidence";

const BUCKET = process.env.NEXT_PUBLIC_EVIDENCE_BUCKET || "evidence";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export type UploadEvidenceResult = { success: true; evidenceId: string } | { success: false; error: string };

export async function uploadEvidence(formData: FormData): Promise<UploadEvidenceResult> {
  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const documentDate = (formData.get("document_date") as string) || null;
  const reviewDate = (formData.get("review_date") as string) || null;
  const expiryDate = (formData.get("expiry_date") as string) || null;
  const notes = String(formData.get("notes") ?? "").trim() || null;
  const linkCriterionId = (formData.get("criterion_id") as string) || null;
  const linkCriterionCode = (formData.get("criterion_code") as string) || null;

  if (!file || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }
  if (!title) {
    return { success: false, error: "Give the document a title." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${new Date().getFullYear()}/${randomUUID()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { data: evidenceRow, error: insertError } = await supabase
    .from("evidence")
    .insert({
      title,
      original_filename: file.name,
      storage_path: storagePath,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      description,
      category,
      document_date: documentDate,
      review_date: reviewDate,
      expiry_date: expiryDate,
      uploaded_by: userId,
      notes,
    })
    .select("id")
    .single();

  if (insertError || !evidenceRow) {
    // Best-effort cleanup of the orphaned storage object.
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save evidence record: ${insertError?.message}` };
  }

  if (linkCriterionId) {
    await supabase.from("evidence_criteria_links").insert({
      evidence_id: evidenceRow.id,
      criterion_id: linkCriterionId,
      linked_by: userId,
    });
    await supabase.from("activity_log").insert({
      criterion_id: linkCriterionId,
      entity_type: "evidence",
      entity_id: evidenceRow.id,
      event_type: "evidence_uploaded",
      description: `Uploaded and linked evidence "${title}"`,
      performed_by: userId,
    });
  }

  revalidatePath("/evidence");
  if (linkCriterionCode) revalidatePath(`/checklist/${linkCriterionCode}`);
  revalidatePath("/dashboard");

  return { success: true, evidenceId: evidenceRow.id };
}

export async function linkEvidenceToCriterion(evidenceId: string, criterionId: string, criterionCode: string) {
  const supabase = createClient();
  const userId = await currentUserId();

  await supabase
    .from("evidence_criteria_links")
    .upsert(
      { evidence_id: evidenceId, criterion_id: criterionId, linked_by: userId },
      { onConflict: "evidence_id,criterion_id" }
    );

  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/evidence");
  revalidatePath("/dashboard");
}

export async function unlinkEvidenceFromCriterion(linkId: string, criterionCode: string) {
  const supabase = createClient();
  await supabase.from("evidence_criteria_links").delete().eq("id", linkId);
  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/evidence");
  revalidatePath("/dashboard");
}

export async function updateEvidenceDetails(
  evidenceId: string,
  fields: {
    title?: string;
    category?: string | null;
    description?: string | null;
    document_date?: string | null;
    review_date?: string | null;
    expiry_date?: string | null;
    notes?: string | null;
  }
) {
  const supabase = createClient();
  await supabase.from("evidence").update(fields).eq("id", evidenceId);
  revalidatePath("/evidence");
}

export async function getSignedUrlForEvidence(
  storagePath: string,
  download?: boolean
): Promise<string | null> {
  return getSignedEvidenceUrl(storagePath, download ? { download: true } : undefined);
}

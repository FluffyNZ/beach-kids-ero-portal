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

const BUCKET = process.env.NEXT_PUBLIC_STAFF_DOCUMENTS_BUCKET || "staff-documents";

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
    .single();

  if (error || !staffRow) {
    return { success: false, error: `Could not add staff member: ${error?.message}` };
  }

  revalidatePath("/staff");
  return { success: true, staffId: staffRow.id };
}

export async function updateStaffDetails(
  staffId: string,
  fields: {
    full_name?: string;
    role?: string | null;
    start_date?: string | null;
    end_date?: string | null;
    contract_type?: StaffContractType | null;
    pay_rate?: number | null;
    min_hours?: number | null;
    notes?: string | null;
  }
) {
  const supabase = createClient();
  const { error } = await supabase.from("staff").update(fields as any).eq("id", staffId);
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

export async function setStaffStatus(staffId: string, status: StaffStatus) {
  const supabase = createClient();
  await supabase.from("staff").update({ status } as any).eq("id", staffId);
  revalidatePath(`/staff/${staffId}`);
  revalidatePath("/staff");
}

export type UploadStaffDocumentResult = { success: true } | { success: false; error: string };

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

  await supabase
    .from("staff_qualifications")
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
    .single();

  if (insertError || !documentRow) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the document: ${insertError?.message}` };
  }

  await supabase.from("staff_checklist_status").upsert(
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

  await supabase.from("staff_checklist_status").upsert(
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

export async function getSignedUrlForStaffDocument(storagePath: string, download?: boolean): Promise<string | null> {
  return getSignedStaffDocumentUrl(storagePath, download ? { download: true } : undefined);
}

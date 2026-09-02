"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getSignedPolicyUrl } from "@/lib/data/policies";

const BUCKET = process.env.NEXT_PUBLIC_POLICIES_BUCKET || "policies";

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

export type CreatePolicyResult = { success: true; policyId: string } | { success: false; error: string };

export async function createPolicy(formData: FormData): Promise<CreatePolicyResult> {
  const file = formData.get("file") as File | null;
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim() || null;
  const reviewCycle = (String(formData.get("review_cycle") ?? "").trim() || null) as
    | "annual"
    | "biannual"
    | "three_yearly"
    | null;
  const nextReviewDate = (formData.get("next_review_date") as string) || null;

  if (!file || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }
  if (!title) {
    return { success: false, error: "Give the policy a title." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: policyRow, error: policyError } = await supabase
    .from("policies")
    .insert({
      title,
      category,
      description,
      review_cycle: reviewCycle,
      next_review_date: nextReviewDate,
      created_by: userId,
    } as any)
    .select("id")
    .single();

  if (policyError || !policyRow) {
    return { success: false, error: `Could not create policy: ${policyError?.message}` };
  }

  const storagePath = safeStoragePath(file);
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    await supabase.from("policies").delete().eq("id", policyRow.id);
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { error: versionError } = await supabase.from("policy_versions").insert({
    policy_id: policyRow.id,
    version_number: 1,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type || null,
    file_size_bytes: file.size,
    status: "draft",
    created_by: userId,
  } as any);

  if (versionError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    await supabase.from("policies").delete().eq("id", policyRow.id);
    return { success: false, error: `Could not save the document: ${versionError.message}` };
  }

  revalidatePath("/policies");
  return { success: true, policyId: policyRow.id };
}

export type AddVersionResult = { success: true } | { success: false; error: string };

export async function addPolicyVersion(policyId: string, formData: FormData): Promise<AddVersionResult> {
  const file = formData.get("file") as File | null;
  const changeSummary = String(formData.get("change_summary") ?? "").trim() || null;

  if (!file || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: existing } = await supabase
    .from("policy_versions")
    .select("version_number")
    .eq("policy_id", policyId)
    .order("version_number", { ascending: false })
    .limit(1)
    .maybeSingle();

  const nextVersionNumber = (existing?.version_number ?? 0) + 1;
  const storagePath = safeStoragePath(file);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });

  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { error: versionError } = await supabase.from("policy_versions").insert({
    policy_id: policyId,
    version_number: nextVersionNumber,
    storage_path: storagePath,
    original_filename: file.name,
    mime_type: file.type || null,
    file_size_bytes: file.size,
    change_summary: changeSummary,
    status: "draft",
    created_by: userId,
  } as any);

  if (versionError) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the new version: ${versionError.message}` };
  }

  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  return { success: true };
}

export async function approvePolicyVersion(policyId: string, versionId: string) {
  const supabase = createClient();
  const userId = await currentUserId();

  await supabase
    .from("policy_versions")
    .update({ status: "approved", approved_by: userId, approved_at: new Date().toISOString() } as any)
    .eq("id", versionId);

  await supabase.from("policies").update({ current_version_id: versionId } as any).eq("id", policyId);

  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
  revalidatePath("/dashboard");
}

export async function updatePolicyDetails(
  policyId: string,
  fields: {
    title?: string;
    category?: string | null;
    description?: string | null;
    review_cycle?: "annual" | "biannual" | "three_yearly" | null;
    next_review_date?: string | null;
  }
) {
  const supabase = createClient();
  await supabase.from("policies").update(fields as any).eq("id", policyId);
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
}

export async function setPolicyStatus(policyId: string, status: "active" | "archived") {
  const supabase = createClient();
  await supabase.from("policies").update({ status } as any).eq("id", policyId);
  revalidatePath(`/policies/${policyId}`);
  revalidatePath("/policies");
}

export async function getSignedUrlForPolicy(storagePath: string, download?: boolean): Promise<string | null> {
  return getSignedPolicyUrl(storagePath, download ? { download: true } : undefined);
}

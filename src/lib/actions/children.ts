"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { ChildStatus } from "@/lib/supabase/database.types";
import { isEceEligible } from "@/lib/constants";

const PHOTO_BUCKET = process.env.NEXT_PUBLIC_CHILD_PHOTOS_BUCKET || "child-photos";
const ALLOWED_PHOTO_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp"]);

function safePhotoPath(childId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${childId}/${randomUUID()}-${safeName}`;
}

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Finds a bill payer by exact name, or creates one — so typing an
 * existing name (e.g. because two children share a parent) links to the
 * same real person instead of creating a duplicate. Returns null for a
 * blank name so "no bill payer yet" stays possible. */
async function findOrCreateBillPayer(name: string | null | undefined): Promise<string | null> {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return null;

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: existing } = await supabase
    .from("bill_payers")
    .select("id")
    .eq("full_name", trimmed)
    .maybeSingle();
  if (existing) return existing.id;

  const { data: created, error } = await supabase
    .from("bill_payers")
    .insert({ full_name: trimmed, created_by: userId } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    throw new Error(`Could not save the bill payer: ${error?.message ?? "unknown error"}`);
  }
  return created.id;
}

export type CreateChildResult = { success: true; childId: string } | { success: false; error: string };

export async function createChild(formData: FormData): Promise<CreateChildResult> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) {
    return { success: false, error: "Enter the child's name." };
  }

  const ageYearsRaw = String(formData.get("age_years") ?? "").trim();
  const ageMonthsRaw = String(formData.get("age_months") ?? "").trim();
  const roomId = (String(formData.get("room_id") ?? "").trim() || null) as string | null;
  const billPayerName = String(formData.get("bill_payer_name") ?? "").trim();
  const specialOverrideRaw = String(formData.get("special_weekly_override") ?? "").trim();
  const notes = String(formData.get("notes") ?? "").trim() || null;

  const ageYears = ageYearsRaw !== "" ? Number(ageYearsRaw) : null;

  try {
    const billPayerId = await findOrCreateBillPayer(billPayerName);
    const supabase = createClient();
    const userId = await currentUserId();

    const { data: childRow, error } = await supabase
      .from("children")
      .insert({
        full_name: fullName,
        age_years: ageYears,
        age_months: ageMonthsRaw !== "" ? Number(ageMonthsRaw) : null,
        age_as_of: ageYearsRaw !== "" || ageMonthsRaw !== "" ? new Date().toISOString().slice(0, 10) : null,
        room_id: roomId,
        bill_payer_id: billPayerId,
        status: "active",
        // 20 Hours ECE is automatic from age 3, not a manual toggle.
        twenty_hours_ece: isEceEligible(ageYears),
        special_weekly_override: specialOverrideRaw !== "" ? Number(specialOverrideRaw) : null,
        notes,
        created_by: userId,
      } as any)
      .select("id")
      .single<{ id: string }>();

    if (error || !childRow) {
      return { success: false, error: `Could not add child: ${error?.message ?? "unknown error"}` };
    }

    revalidatePath("/children");
    return { success: true, childId: childRow.id };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : "Something went wrong adding this child.",
    };
  }
}

export type CreateMinimalChildResult = { success: true; childId: string } | { success: false; error: string };

/** A lightweight profile for a child named on an old paper form (e.g. via
 * Accident & Illness photo import) who turns out not to be in the system at
 * all. Status defaults to "left" — a form only just being digitised
 * usually means the child has already moved on — and `notes` records how
 * the profile came to exist, so it never looks like a normal enrolment
 * record. Finds an existing exact-name match first, the same way
 * findOrCreateBillPayer does, so calling this twice for the same name never
 * creates two profiles. */
export async function createMinimalChildProfile(fullName: string): Promise<CreateMinimalChildResult> {
  const trimmed = fullName.trim();
  if (!trimmed) {
    return { success: false, error: "Enter the child's name." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: existing } = await supabase
    .from("children")
    .select("id")
    .ilike("full_name", trimmed)
    .maybeSingle();
  if (existing) {
    return { success: true, childId: existing.id };
  }

  const { data: childRow, error } = await supabase
    .from("children")
    .insert({
      full_name: trimmed,
      status: "left",
      notes: "Profile created automatically from an Accident & Illness photo import — no other details were supplied.",
      created_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !childRow) {
    return { success: false, error: `Could not create a profile: ${error?.message ?? "unknown error"}` };
  }

  revalidatePath("/children");
  revalidatePath("/records/accidents-illness");
  return { success: true, childId: childRow.id };
}

export async function updateChildDetails(
  childId: string,
  fields: {
    full_name?: string;
    gender?: string | null;
    age_years?: number | null;
    age_months?: number | null;
    residential_address?: string | null;
    primary_contact_email?: string | null;
    room_id?: string | null;
    room_notes?: string | null;
    bill_payer_name?: string | null;
    bill_payer_unlisted_note?: string | null;
    notes?: string | null;
  }
) {
  const { bill_payer_name, ...rest } = fields;
  const supabase = createClient();

  const updates: Record<string, unknown> = { ...rest };

  if (bill_payer_name !== undefined) {
    updates.bill_payer_id = await findOrCreateBillPayer(bill_payer_name);
    // Linking a real bill payer resolves the "not listed" flag.
    if (updates.bill_payer_id) updates.bill_payer_unlisted_note = null;
  }

  if (fields.age_years !== undefined || fields.age_months !== undefined) {
    updates.age_as_of = new Date().toISOString().slice(0, 10);
  }

  // 20 Hours ECE eligibility is derived from age, not set manually — keep
  // the stored column in sync whenever age changes so it never drifts.
  if (fields.age_years !== undefined) {
    updates.twenty_hours_ece = isEceEligible(fields.age_years);
  }

  const { error } = await (supabase.from("children") as any).update(updates as any).eq("id", childId);
  if (error) {
    throw new Error(`Could not save: ${error.message}`);
  }
  revalidatePath(`/children/${childId}`);
  revalidatePath("/children");
}

export async function updateChildFeeSettings(
  childId: string,
  fields: {
    hourly_rate?: number | null;
    special_weekly_override?: number | null;
  }
) {
  const supabase = createClient();
  const { error } = await (supabase.from("children") as any).update(fields as any).eq("id", childId);
  if (error) {
    throw new Error(`Could not save fee settings: ${error.message}`);
  }
  revalidatePath(`/children/${childId}`);
  revalidatePath("/children");
}

export async function updateChildWinzSubsidy(
  childId: string,
  fields: {
    caregiver_name?: string | null;
    weekly_cca_hours?: number | null;
    weekly_payment?: number | null;
    renewal_date?: string | null;
    notes?: string | null;
  }
) {
  const supabase = createClient();
  const userId = await currentUserId();

  const isEmpty =
    !fields.caregiver_name &&
    !fields.weekly_cca_hours &&
    !fields.weekly_payment &&
    !fields.renewal_date &&
    !fields.notes;

  if (isEmpty) {
    // Nothing left to record — remove the row rather than keep an
    // all-blank subsidy record around.
    await supabase.from("child_winz_subsidies").delete().eq("child_id", childId);
  } else {
    await (supabase
      .from("child_winz_subsidies") as any)
      .upsert({ child_id: childId, ...fields, updated_by: userId } as any, { onConflict: "child_id" });
  }

  revalidatePath(`/children/${childId}`);
  revalidatePath("/children");
}

export async function updateChildEnrolledSchedule(
  childId: string,
  fields: {
    mon_start?: string | null;
    mon_end?: string | null;
    tue_start?: string | null;
    tue_end?: string | null;
    wed_start?: string | null;
    wed_end?: string | null;
    thu_start?: string | null;
    thu_end?: string | null;
    fri_start?: string | null;
    fri_end?: string | null;
  }
) {
  const supabase = createClient();
  const userId = await currentUserId();

  const { error } = await (supabase
    .from("child_enrolled_schedule") as any)
    .upsert({ child_id: childId, ...fields, updated_by: userId } as any, { onConflict: "child_id" });

  if (error) {
    throw new Error(`Could not save this child's enrolled schedule: ${error.message}`);
  }

  revalidatePath(`/children/${childId}`);
  revalidatePath("/children");
  revalidatePath("/children/hours");
}

export async function setChildStatus(childId: string, status: ChildStatus) {
  const supabase = createClient();
  await (supabase.from("children") as any).update({ status } as any).eq("id", childId);
  revalidatePath(`/children/${childId}`);
  revalidatePath("/children");
}

export type UploadChildPhotoResult = { success: true } | { success: false; error: string };

/** Replaces this child's profile photo. The old file (if any) is removed
 * from storage after the new one uploads successfully, so a failed
 * upload never leaves the child without a photo. */
export async function uploadChildPhoto(childId: string, formData: FormData): Promise<UploadChildPhotoResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose a photo to upload." };
  }
  if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
    return { success: false, error: "Photos must be a JPG, PNG or WEBP file." };
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("children")
    .select("photo_storage_path")
    .eq("id", childId)
    .maybeSingle();

  const storagePath = safePhotoPath(childId, file);
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const { error: updateError } = await (supabase
    .from("children") as any)
    .update({ photo_storage_path: storagePath } as any)
    .eq("id", childId);

  if (updateError) {
    await supabase.storage.from(PHOTO_BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the photo: ${updateError.message}` };
  }

  if (existing?.photo_storage_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_storage_path]);
  }

  revalidatePath(`/children/${childId}`);
  revalidatePath("/children");
  return { success: true };
}

export async function removeChildPhoto(childId: string): Promise<UploadChildPhotoResult> {
  const supabase = createClient();

  const { data: existing } = await supabase
    .from("children")
    .select("photo_storage_path")
    .eq("id", childId)
    .maybeSingle();

  await (supabase.from("children") as any).update({ photo_storage_path: null } as any).eq("id", childId);

  if (existing?.photo_storage_path) {
    await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_storage_path]);
  }

  revalidatePath(`/children/${childId}`);
  revalidatePath("/children");
  return { success: true };
}

export type DeleteChildResult = { success: true } | { success: false; error: string };

/** Permanently removes a child's profile, their photo, and their WINZ
 * subsidy record (the last one cascades with the DB delete). There is no
 * undo — the bill payer record itself is left alone since it may still
 * be billed for a sibling. */
export async function deleteChild(childId: string): Promise<DeleteChildResult> {
  try {
    const supabase = createClient();

    const { data: existing } = await supabase
      .from("children")
      .select("photo_storage_path")
      .eq("id", childId)
      .maybeSingle();

    const { error, count } = await supabase.from("children").delete({ count: "exact" }).eq("id", childId);

    if (error) {
      return { success: false, error: `Could not delete this profile: ${error.message}` };
    }
    if (!count) {
      return {
        success: false,
        error: "Nothing was deleted — this profile may already be gone, or you may not have permission.",
      };
    }

    if (existing?.photo_storage_path) {
      await supabase.storage.from(PHOTO_BUCKET).remove([existing.photo_storage_path]);
    }

    revalidatePath("/children");
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `Could not delete this profile: ${err.message}` : "Could not delete this profile.",
    };
  }
}

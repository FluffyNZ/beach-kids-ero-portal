"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { getStaffInductionItemKeys, getStaffInductionTotalItemCount } from "@/lib/staff-induction-checklist";

const SIGNATURE_BUCKET = process.env.NEXT_PUBLIC_STAFF_INDUCTION_SIGNATURES_BUCKET || "staff-induction-signatures";
const VALID_ITEM_KEYS = new Set(getStaffInductionItemKeys());

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

/** Creates this staff member's induction row if it doesn't exist yet — the
 * checklist page works fine before that (getStaffInduction returns an empty
 * shape), so a row only needs to exist once there's actually something to
 * save against it. Returns an error string on failure so callers don't go
 * on to run an update against a row that was never created — an update
 * matching zero rows succeeds silently in Postgres, which would otherwise
 * make a failed save look like it worked. */
async function ensureInductionRow(staffId: string): Promise<string | null> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { error } = await (supabase.from("staff_inductions") as any).upsert(
    { staff_id: staffId, created_by: userId } as any,
    { onConflict: "staff_id", ignoreDuplicates: true }
  );
  return error ? error.message : null;
}

/** completed_at only ever reflects the current state of item_states and
 * staff_signed_at — recomputed on every save rather than trusted as a
 * manual flag, so it can never drift (e.g. if a checklist item is added
 * later, a previously "complete" induction correctly stops being complete
 * until the new item is ticked too). A manager/overseer sign-off is
 * recorded when given but isn't required for completion — some staff will
 * complete this on their own with a manager countersigning afterwards. */
function isComplete(itemStates: Record<string, boolean>, staffSignedAt: string | null): boolean {
  if (!staffSignedAt) return false;
  const total = getStaffInductionTotalItemCount();
  const checkedCount = Object.values(itemStates).filter(Boolean).length;
  return checkedCount >= total && getStaffInductionItemKeys().every((key) => itemStates[key]);
}

export type ToggleInductionItemResult = { success: true } | { success: false; error: string };

export async function toggleInductionItem(
  staffId: string,
  itemKey: string,
  checked: boolean
): Promise<ToggleInductionItemResult> {
  if (!VALID_ITEM_KEYS.has(itemKey)) {
    return { success: false, error: "Unknown checklist item." };
  }

  const ensureError = await ensureInductionRow(staffId);
  if (ensureError) {
    return { success: false, error: `Could not save that: ${ensureError}` };
  }

  const supabase = createClient();
  const { data: row } = await supabase
    .from("staff_inductions")
    .select("item_states, staff_signed_at")
    .eq("staff_id", staffId)
    .maybeSingle();

  const itemStates = { ...((row?.item_states ?? {}) as Record<string, boolean>) };
  if (checked) itemStates[itemKey] = true;
  else delete itemStates[itemKey];

  const completed = isComplete(itemStates, row?.staff_signed_at ?? null);

  const { error } = await (supabase.from("staff_inductions") as any)
    .update({ item_states: itemStates, completed_at: completed ? new Date().toISOString() : null } as any)
    .eq("staff_id", staffId);

  if (error) {
    return { success: false, error: `Could not save that: ${error.message}` };
  }

  revalidatePath(`/staff/${staffId}/induction`);
  revalidatePath(`/staff/${staffId}`);
  return { success: true };
}

export type SignInductionResult = { success: true } | { success: false; error: string };

/** Saves a drawn signature (PNG from the on-screen signature pad) for
 * either the staff member or the manager/overseer, replacing any previous
 * signature of that kind. `who` decides which pair of columns is written —
 * the two are independent, matching the pack's own "Kaiako Signature" /
 * "Manager Signature" pairing, except consolidated to a single sign-off at
 * the end of the digital checklist rather than one after Policies and
 * another after Final Words. */
export async function signInduction(
  staffId: string,
  who: "staff" | "manager",
  formData: FormData
): Promise<SignInductionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const file = formData.get("signature") as File | null;

  if (!name) {
    return { success: false, error: "Enter the name of the person signing." };
  }
  if (!file || file.size === 0) {
    return { success: false, error: "Please draw a signature before saving." };
  }

  const ensureError = await ensureInductionRow(staffId);
  if (ensureError) {
    return { success: false, error: `Could not save the signature: ${ensureError}` };
  }

  const supabase = createClient();
  const pathColumn = who === "staff" ? "staff_signature_storage_path" : "manager_signature_storage_path";
  const nameColumn = who === "staff" ? "staff_signature_name" : "manager_signature_name";
  const signedAtColumn = who === "staff" ? "staff_signed_at" : "manager_signed_at";

  const { data: existing } = await supabase
    .from("staff_inductions")
    .select(`${pathColumn}, item_states`)
    .eq("staff_id", staffId)
    .maybeSingle<Record<string, any>>();

  const storagePath = `${staffId}/${who}-${randomUUID()}.png`;
  const arrayBuffer = await file.arrayBuffer();

  const { error: uploadError } = await supabase.storage.from(SIGNATURE_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: "image/png",
    upsert: false,
  });
  if (uploadError) {
    return { success: false, error: `Could not save the signature: ${uploadError.message}` };
  }

  const signedAt = new Date().toISOString();
  const itemStates = (existing?.item_states ?? {}) as Record<string, boolean>;
  const completed = isComplete(itemStates, who === "staff" ? signedAt : null);

  const { error: updateError } = await (supabase.from("staff_inductions") as any)
    .update({
      [pathColumn]: storagePath,
      [nameColumn]: name,
      [signedAtColumn]: signedAt,
      ...(who === "staff" ? { completed_at: completed ? signedAt : null } : {}),
    } as any)
    .eq("staff_id", staffId);

  if (updateError) {
    await supabase.storage.from(SIGNATURE_BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the signature: ${updateError.message}` };
  }

  const previousPath = existing?.[pathColumn] as string | null | undefined;
  if (previousPath) {
    await supabase.storage.from(SIGNATURE_BUCKET).remove([previousPath]);
  }

  revalidatePath(`/staff/${staffId}/induction`);
  revalidatePath(`/staff/${staffId}`);
  return { success: true };
}

/** Clears a signature so it can be redone — for a mis-drawn signature or the
 * wrong name being entered, not something staff need day-to-day. */
export async function clearInductionSignature(staffId: string, who: "staff" | "manager"): Promise<SignInductionResult> {
  const supabase = createClient();
  const pathColumn = who === "staff" ? "staff_signature_storage_path" : "manager_signature_storage_path";
  const nameColumn = who === "staff" ? "staff_signature_name" : "manager_signature_name";
  const signedAtColumn = who === "staff" ? "staff_signed_at" : "manager_signed_at";

  const { data: existing } = await supabase
    .from("staff_inductions")
    .select(pathColumn)
    .eq("staff_id", staffId)
    .maybeSingle<Record<string, any>>();

  const { error } = await (supabase.from("staff_inductions") as any)
    .update({
      [pathColumn]: null,
      [nameColumn]: null,
      [signedAtColumn]: null,
      ...(who === "staff" ? { completed_at: null } : {}),
    } as any)
    .eq("staff_id", staffId);

  if (error) {
    return { success: false, error: `Could not clear the signature: ${error.message}` };
  }

  const previousPath = existing?.[pathColumn] as string | null | undefined;
  if (previousPath) {
    await supabase.storage.from(SIGNATURE_BUCKET).remove([previousPath]);
  }

  revalidatePath(`/staff/${staffId}/induction`);
  revalidatePath(`/staff/${staffId}`);
  return { success: true };
}

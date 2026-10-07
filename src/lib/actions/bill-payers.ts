"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function readContactFields(formData: FormData) {
  return {
    fullName: String(formData.get("full_name") ?? "").trim(),
    email: String(formData.get("email") ?? "").trim() || null,
    phone: String(formData.get("phone") ?? "").trim() || null,
    address: String(formData.get("address") ?? "").trim() || null,
    notes: String(formData.get("notes") ?? "").trim() || null,
  };
}

export type CreateBillPayerResult = { success: true; id: string } | { success: false; error: string };

/** Adds a new client directly, without needing to create or edit a child
 * first — the only way to do this before was via findOrCreateBillPayer
 * inside the child form, which only ever captured a name (never email,
 * phone or address). Refuses an exact-name duplicate (case-insensitive)
 * rather than silently creating a second record for the same family. */
export async function createBillPayer(formData: FormData): Promise<CreateBillPayerResult> {
  const { fullName, email, phone, address, notes } = readContactFields(formData);
  if (!fullName) return { success: false, error: "Enter the client's name." };

  const supabase = createClient();

  const { data: existing } = await supabase.from("bill_payers").select("id").ilike("full_name", fullName).maybeSingle();
  if (existing) {
    return {
      success: false,
      error: "A client with this exact name already exists — edit them instead of creating a duplicate.",
    };
  }

  const userId = await currentUserId();
  const { data: created, error } = await supabase
    .from("bill_payers")
    .insert({ full_name: fullName, email, phone, address, notes, created_by: userId } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !created) {
    return { success: false, error: `Could not save this client: ${error?.message ?? "unknown error"}` };
  }

  revalidatePath("/finances/clients");
  return { success: true, id: created.id };
}

export type UpdateBillPayerResult = { success: true } | { success: false; error: string };

/** Fills in (or corrects) a client's contact details — this is also the
 * fix for a real dead end that existed before: invoices and statements
 * both refuse to send with "no email address on file", but there was
 * nowhere in the app to actually add one. Now there is. */
export async function updateBillPayer(id: string, formData: FormData): Promise<UpdateBillPayerResult> {
  const { fullName, email, phone, address, notes } = readContactFields(formData);
  if (!fullName) return { success: false, error: "Name can't be blank." };

  const supabase = createClient();
  const { error } = await (supabase.from("bill_payers") as any)
    .update({ full_name: fullName, email, phone, address, notes })
    .eq("id", id);

  if (error) return { success: false, error: `Could not save changes: ${error.message}` };

  revalidatePath("/finances/clients");
  revalidatePath("/finances/invoices");
  revalidatePath("/finances/statements");
  revalidatePath("/children");
  return { success: true };
}

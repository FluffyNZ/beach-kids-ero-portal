"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

export type UpdateBillPayerPhoneResult = { success: true } | { success: false; error: string };

/** Sets just a family's (bill payer's) phone number, leaving their email,
 * address and notes exactly as they are. updateBillPayer in
 * actions/bill-payers.ts rewrites every field from a full form, which would
 * be the wrong tool for a one-field edit on the Contact numbers page.
 * Blank clears the number. */
export async function updateBillPayerPhone(id: string, phone: string): Promise<UpdateBillPayerPhoneResult> {
  const cleaned = String(phone ?? "").trim();
  if (cleaned.length > 40) return { success: false, error: "That phone number looks too long." };

  const supabase = createClient();
  const { error } = await (supabase.from("bill_payers") as any).update({ phone: cleaned || null }).eq("id", id);
  if (error) return { success: false, error: `Could not save this number: ${error.message}` };

  revalidatePath("/children/contacts");
  revalidatePath("/finances/clients");
  revalidatePath("/children");
  return { success: true };
}

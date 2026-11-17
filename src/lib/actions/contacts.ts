"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";

// Server actions for the per-child contact lists (child_contacts, migration
// 0065) — the data behind the portal's "Contact numbers" page and the
// staff-room tablet. These run as the logged-in manager through the normal
// RLS-governed client.

export type ChildContactFields = {
  full_name: string;
  relationship?: string | null;
  phone?: string | null;
  alt_phone?: string | null;
  is_primary_caregiver?: boolean;
  is_emergency_contact?: boolean;
  can_pick_up?: boolean;
  conditional_access?: boolean;
  forbidden_access?: boolean;
  notes?: string | null;
};

export type ChildContactResult = { success: true } | { success: false; error: string };

function text(value: string | null | undefined): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed ? trimmed : null;
}

/** Trims everything and applies the one hard rule: a Forbidden Access
 * person is never also a pick-up or emergency contact, whatever the form
 * sent. (The database has a matching check constraint for pick-up.) */
function normalise(fields: ChildContactFields) {
  const forbidden = Boolean(fields.forbidden_access);
  return {
    full_name: String(fields.full_name ?? "").trim(),
    relationship: text(fields.relationship),
    phone: text(fields.phone),
    alt_phone: text(fields.alt_phone),
    is_primary_caregiver: Boolean(fields.is_primary_caregiver),
    is_emergency_contact: forbidden ? false : Boolean(fields.is_emergency_contact),
    can_pick_up: forbidden ? false : Boolean(fields.can_pick_up),
    conditional_access: Boolean(fields.conditional_access),
    forbidden_access: forbidden,
    notes: text(fields.notes),
  };
}

function validate(row: ReturnType<typeof normalise>): string | null {
  if (!row.full_name) return "Enter this contact's name.";
  if (row.full_name.length > 120) return "That name looks too long.";
  if ((row.phone?.length ?? 0) > 40 || (row.alt_phone?.length ?? 0) > 40) return "That phone number looks too long.";
  return null;
}

function revalidate() {
  revalidatePath("/children/contacts");
  revalidatePath("/staffroom");
}

export async function addChildContact(childId: string, fields: ChildContactFields): Promise<ChildContactResult> {
  const row = normalise(fields);
  const problem = validate(row);
  if (problem) return { success: false, error: problem };

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { error } = await supabase
    .from("child_contacts")
    .insert({ ...row, child_id: childId, created_by: user?.id ?? null } as any);
  if (error) return { success: false, error: `Could not save this contact: ${error.message}` };

  revalidate();
  return { success: true };
}

export async function updateChildContact(id: string, fields: ChildContactFields): Promise<ChildContactResult> {
  const row = normalise(fields);
  const problem = validate(row);
  if (problem) return { success: false, error: problem };

  const supabase = createClient();
  const { error } = await (supabase.from("child_contacts") as any).update(row).eq("id", id);
  if (error) return { success: false, error: `Could not save changes: ${error.message}` };

  revalidate();
  return { success: true };
}

export async function deleteChildContact(id: string): Promise<ChildContactResult> {
  const supabase = createClient();
  const { error } = await supabase.from("child_contacts").delete().eq("id", id);
  if (error) return { success: false, error: `Could not remove this contact: ${error.message}` };

  revalidate();
  return { success: true };
}

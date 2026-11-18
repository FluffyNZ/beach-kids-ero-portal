import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { ManagedChild, ManagedChildContact } from "@/lib/data/contact-directory";

// Read-only extras for a single child's profile page. Contacts come from the
// same child_contacts records the Contact numbers page and the staff-room
// tablet use — there's only ever one copy.

function contactRank(contact: ManagedChildContact): number {
  if (contact.forbidden_access) return 0;
  if (contact.is_primary_caregiver) return 1;
  if (contact.is_emergency_contact) return 2;
  if (contact.can_pick_up) return 3;
  return 4;
}

export type ChildContactsResult =
  | { ok: true; child: ManagedChild }
  | { ok: false; error: string };

/** This child's contacts, most important first (forbidden access, primary
 * caregivers, emergency contacts, then others). Returns an error result
 * rather than throwing, so a contacts problem never takes down the whole
 * profile. */
export async function getContactsForChild(childId: string, childName: string): Promise<ChildContactsResult> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("child_contacts")
    .select(
      "id, child_id, full_name, relationship, phone, alt_phone, is_primary_caregiver, is_emergency_contact, can_pick_up, conditional_access, forbidden_access, notes"
    )
    .eq("child_id", childId);
  if (error) return { ok: false, error: `Contacts couldn't be loaded: ${error.message}` };

  const contacts = ((data ?? []) as ManagedChildContact[])
    .slice()
    .sort(
      (a, b) =>
        contactRank(a) - contactRank(b) || a.full_name.localeCompare(b.full_name, "en-NZ", { sensitivity: "base" })
    );
  return { ok: true, child: { id: childId, name: childName.trim(), contacts } };
}

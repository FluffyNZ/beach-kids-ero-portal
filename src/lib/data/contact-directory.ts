import "server-only";
import { createClient } from "@/lib/supabase/server";

// Data for the portal's "Contact numbers" management page (the screen where
// a manager maintains what the staff-room tablet shows). Unlike the tablet's
// own data (lib/staffroom/data.ts), this runs as the logged-in manager
// through the normal RLS-governed client.

export type ManagedChildContact = {
  id: string;
  child_id: string;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  alt_phone: string | null;
  is_primary_caregiver: boolean;
  is_emergency_contact: boolean;
  can_pick_up: boolean;
  conditional_access: boolean;
  forbidden_access: boolean;
  notes: string | null;
};

export type ManagedChild = {
  id: string;
  name: string;
  contacts: ManagedChildContact[];
};

export type StaffContactGap = {
  id: string;
  name: string;
  missingMobile: boolean;
  missingEmergencyNumber: boolean;
};

export type ContactDirectoryForManagement = {
  children: ManagedChild[];
  staffGaps: StaffContactGap[];
  staffTotal: number;
};

function byName(a: string, b: string): number {
  return a.localeCompare(b, "en-NZ", { sensitivity: "base" });
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

function contactRank(contact: ManagedChildContact): number {
  if (contact.forbidden_access) return 0;
  if (contact.is_primary_caregiver) return 1;
  if (contact.is_emergency_contact) return 2;
  return 3;
}

export async function getContactDirectoryForManagement(): Promise<ContactDirectoryForManagement> {
  const supabase = createClient();

  const [childResult, staffResult] = await Promise.all([
    supabase.from("children").select("id, full_name").eq("status", "active"),
    supabase
      .from("staff")
      .select("id, full_name, mobile_phone, emergency_contact_phone")
      .eq("status", "active"),
  ]);
  if (childResult.error) throw new Error(`Could not load children: ${childResult.error.message}`);
  if (staffResult.error) throw new Error(`Could not load staff: ${staffResult.error.message}`);

  const childRows = (childResult.data ?? []) as { id: string; full_name: string }[];
  const staffRows = (staffResult.data ?? []) as {
    id: string;
    full_name: string;
    mobile_phone: string | null;
    emergency_contact_phone: string | null;
  }[];

  let contactRows: ManagedChildContact[] = [];
  if (childRows.length > 0) {
    const contactResult = await supabase
      .from("child_contacts")
      .select(
        "id, child_id, full_name, relationship, phone, alt_phone, is_primary_caregiver, is_emergency_contact, can_pick_up, conditional_access, forbidden_access, notes"
      )
      .in(
        "child_id",
        childRows.map((c) => c.id)
      );
    if (contactResult.error) {
      throw new Error(
        `Could not load children's contacts: ${contactResult.error.message}. If this mentions a missing table, migration 0065_child_contacts.sql hasn't been run in Supabase yet.`
      );
    }
    contactRows = (contactResult.data ?? []) as ManagedChildContact[];
  }

  const contactsByChild = new Map<string, ManagedChildContact[]>();
  contactRows.forEach((contact) => {
    const list = contactsByChild.get(contact.child_id) ?? [];
    list.push(contact);
    contactsByChild.set(contact.child_id, list);
  });

  const children: ManagedChild[] = childRows
    .map((child) => ({
      id: child.id,
      name: child.full_name.trim(),
      contacts: (contactsByChild.get(child.id) ?? [])
        .slice()
        .sort((a, b) => contactRank(a) - contactRank(b) || byName(a.full_name, b.full_name)),
    }))
    .sort((a, b) => byName(a.name, b.name));

  const staffGaps: StaffContactGap[] = staffRows
    .map((s) => ({
      id: s.id,
      name: s.full_name,
      missingMobile: !hasText(s.mobile_phone),
      missingEmergencyNumber: !hasText(s.emergency_contact_phone),
    }))
    .filter((s) => s.missingMobile || s.missingEmergencyNumber)
    .sort((a, b) => byName(a.name, b.name));

  return { children, staffGaps, staffTotal: staffRows.length };
}

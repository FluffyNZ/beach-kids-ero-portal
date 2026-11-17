import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasValidStaffroomSession } from "./session";
import type { ChildContactEntry, ChildEntry, StaffEntry, StaffroomDirectory } from "./types";

// Reads the contact directory for the staff-room tablet.
//
// This uses the service-role (admin) client on purpose: the tablet has no
// Supabase login of its own (see session.ts), so the normal RLS-governed
// client would see nothing. That makes this file the one place that bypasses
// RLS for this feature, so two guard rails apply:
//   1. It refuses to run at all unless the request carries a valid, unexpired
//      staff-room PIN session — the page checks too, this is the backstop.
//   2. Every query names its columns explicitly. The staff table also holds
//      pay rates, tax codes and dates of birth — none of which belong on a
//      staff-room screen — so this never uses `select *`.
//
// Children's contacts come from child_contacts (migration 0065): one list
// per child, each person carrying their own pick-up / emergency / Forbidden
// Access markers, because staff check this screen child by child before
// releasing a child to someone.

type ChildRow = { id: string; full_name: string };
type ChildContactRow = {
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
type StaffRow = {
  id: string;
  full_name: string;
  role: string | null;
  mobile_phone: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
};

function clean(value: string | null | undefined): string | null {
  const trimmed = value?.trim();
  return trimmed ? trimmed : null;
}

function byName(a: string, b: string): number {
  return a.localeCompare(b, "en-NZ", { sensitivity: "base" });
}

/** Forbidden Access people first (so the warning is the first thing read),
 * then primary caregivers, then emergency contacts, then everyone else. */
function contactRank(contact: ChildContactEntry): number {
  if (contact.forbidden) return 0;
  if (contact.isPrimaryCaregiver) return 1;
  if (contact.isEmergency) return 2;
  return 3;
}

export async function getStaffroomDirectory(): Promise<StaffroomDirectory> {
  if (!hasValidStaffroomSession()) {
    throw new Error("The staff room page is locked.");
  }

  const admin = createAdminClient();

  const [childResult, staffResult] = await Promise.all([
    admin.from("children").select("id, full_name").eq("status", "active"),
    admin
      .from("staff")
      .select(
        "id, full_name, role, mobile_phone, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship"
      )
      .eq("status", "active"),
  ]);
  if (childResult.error) throw new Error(`Could not load children: ${childResult.error.message}`);
  if (staffResult.error) throw new Error(`Could not load staff: ${staffResult.error.message}`);

  const childRows = (childResult.data ?? []) as ChildRow[];
  const staffRows = (staffResult.data ?? []) as StaffRow[];

  let contactRows: ChildContactRow[] = [];
  if (childRows.length > 0) {
    const contactResult = await admin
      .from("child_contacts")
      .select(
        "id, child_id, full_name, relationship, phone, alt_phone, is_primary_caregiver, is_emergency_contact, can_pick_up, conditional_access, forbidden_access, notes"
      )
      .in(
        "child_id",
        childRows.map((c) => c.id)
      );
    if (contactResult.error) throw new Error(`Could not load children's contacts: ${contactResult.error.message}`);
    contactRows = (contactResult.data ?? []) as ChildContactRow[];
  }

  const contactsByChild = new Map<string, ChildContactEntry[]>();
  contactRows.forEach((row) => {
    const forbidden = Boolean(row.forbidden_access);
    const entry: ChildContactEntry = {
      id: row.id,
      name: row.full_name.trim(),
      relationship: clean(row.relationship),
      // A Forbidden Access person's number never leaves the server — the
      // tablet only needs their name, to warn staff.
      phone: forbidden ? null : clean(row.phone),
      altPhone: forbidden ? null : clean(row.alt_phone),
      isPrimaryCaregiver: Boolean(row.is_primary_caregiver),
      // Belt and braces: forbidden always wins over the other markers, even
      // if a row were somehow saved with both.
      isEmergency: !forbidden && Boolean(row.is_emergency_contact),
      canPickUp: !forbidden && Boolean(row.can_pick_up),
      conditionalAccess: Boolean(row.conditional_access),
      forbidden,
      notes: clean(row.notes),
    };
    const list = contactsByChild.get(row.child_id) ?? [];
    list.push(entry);
    contactsByChild.set(row.child_id, list);
  });

  const children: ChildEntry[] = childRows
    .map((child) => ({
      id: child.id,
      name: child.full_name.trim(),
      contacts: (contactsByChild.get(child.id) ?? [])
        .slice()
        .sort((a, b) => contactRank(a) - contactRank(b) || byName(a.name, b.name)),
    }))
    .sort((a, b) => byName(a.name, b.name));

  const staff: StaffEntry[] = staffRows
    .map((row) => {
      const emergencyName = clean(row.emergency_contact_name);
      const emergencyPhone = clean(row.emergency_contact_phone);
      return {
        id: row.id,
        name: row.full_name,
        role: clean(row.role),
        mobile: clean(row.mobile_phone),
        emergency:
          emergencyName || emergencyPhone
            ? {
                name: emergencyName ?? "Emergency contact",
                relationship: clean(row.emergency_contact_relationship),
                phone: emergencyPhone,
              }
            : null,
      };
    })
    .sort((a, b) => byName(a.name, b.name));

  return { children, staff };
}

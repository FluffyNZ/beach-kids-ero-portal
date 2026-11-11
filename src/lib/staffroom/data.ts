import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasValidStaffroomSession } from "./session";
import type { DirectoryContact, FamilyEntry, StaffEntry, StaffroomDirectory } from "./types";

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

type ChildRow = { id: string; full_name: string; bill_payer_id: string | null };
type BillPayerRow = { id: string; full_name: string; phone: string | null };
type FamilyContactRow = {
  bill_payer_id: string;
  full_name: string;
  relationship: string | null;
  phone: string | null;
  is_primary: boolean;
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

/** Digits-only comparison key, with NZ "+64 21…" and "021…" treated as the
 * same number — used so the same phone number is never listed twice for one
 * family (e.g. the bill payer also entered as an extra contact). */
function phoneKey(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("64") && digits.length > 9 ? `0${digits.slice(2)}` : digits;
}

function byName(a: string, b: string): number {
  return a.localeCompare(b, "en-NZ", { sensitivity: "base" });
}

export async function getStaffroomDirectory(): Promise<StaffroomDirectory> {
  if (!hasValidStaffroomSession()) {
    throw new Error("The staff room page is locked.");
  }

  const admin = createAdminClient();

  const [childResult, staffResult] = await Promise.all([
    admin.from("children").select("id, full_name, bill_payer_id").eq("status", "active"),
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

  const billPayerIds = Array.from(
    new Set(childRows.map((c) => c.bill_payer_id).filter((id): id is string => Boolean(id)))
  );

  let billPayerRows: BillPayerRow[] = [];
  let contactRows: FamilyContactRow[] = [];
  if (billPayerIds.length > 0) {
    const [billPayerResult, contactResult] = await Promise.all([
      admin.from("bill_payers").select("id, full_name, phone").in("id", billPayerIds),
      admin
        .from("family_contacts")
        .select("bill_payer_id, full_name, relationship, phone, is_primary")
        .in("bill_payer_id", billPayerIds),
    ]);
    if (billPayerResult.error) throw new Error(`Could not load families: ${billPayerResult.error.message}`);
    if (contactResult.error) throw new Error(`Could not load family contacts: ${contactResult.error.message}`);
    billPayerRows = (billPayerResult.data ?? []) as BillPayerRow[];
    contactRows = (contactResult.data ?? []) as FamilyContactRow[];
  }

  const billPayerById = new Map(billPayerRows.map((b) => [b.id, b]));
  const contactsByBillPayer = new Map<string, FamilyContactRow[]>();
  contactRows.forEach((row) => {
    const list = contactsByBillPayer.get(row.bill_payer_id) ?? [];
    list.push(row);
    contactsByBillPayer.set(row.bill_payer_id, list);
  });

  // One card per family: siblings share a card instead of repeating the same
  // numbers. A child with no family linked yet gets a card of their own, so
  // they're still findable (and visibly have no number on file).
  const childrenByFamily = new Map<string, string[]>();
  childRows.forEach((child) => {
    const key = child.bill_payer_id ?? `child:${child.id}`;
    const list = childrenByFamily.get(key) ?? [];
    list.push(child.full_name);
    childrenByFamily.set(key, list);
  });

  const families: FamilyEntry[] = [];
  childrenByFamily.forEach((childNames, key) => {
    const contacts: DirectoryContact[] = [];
    const seen = new Set<string>();

    function add(name: string, relationship: string | null, phone: string | null) {
      const cleanedPhone = clean(phone);
      if (!cleanedPhone) return; // email-only contacts are no use on a phone-number screen
      const dedupeKey = phoneKey(cleanedPhone);
      if (seen.has(dedupeKey)) return;
      seen.add(dedupeKey);
      contacts.push({
        name,
        relationship,
        phone: cleanedPhone,
        isEmergency: /emergency/i.test(relationship ?? ""),
      });
    }

    if (!key.startsWith("child:")) {
      const billPayer = billPayerById.get(key);
      if (billPayer) add(billPayer.full_name, "Bill payer", billPayer.phone);

      (contactsByBillPayer.get(key) ?? [])
        .slice()
        .sort((a, b) => Number(b.is_primary) - Number(a.is_primary) || byName(a.full_name, b.full_name))
        .forEach((contact) => add(contact.full_name, clean(contact.relationship), contact.phone));
    }

    families.push({ key, children: childNames.slice().sort(byName), contacts });
  });
  families.sort((a, b) => byName(a.children[0] ?? "", b.children[0] ?? ""));

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

  return { families, staff };
}

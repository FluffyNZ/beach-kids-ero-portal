import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { FamilyContact } from "@/lib/types";

// Data for the portal's "Contact numbers" management page (the screen where
// a manager fills in the numbers the staff-room tablet shows). Unlike the
// tablet's own data (lib/staffroom/data.ts), this runs as the logged-in
// manager through the normal RLS-governed client.

export type ManagedFamily = {
  /** The bill payer's id — a "family" here is a bill payer plus the active
   * children billed to them. */
  key: string;
  billPayerId: string;
  billPayerName: string;
  billPayerPhone: string | null;
  children: { id: string; name: string }[];
  contacts: FamilyContact[];
};

export type UnlinkedChild = { id: string; name: string };

export type StaffContactGap = {
  id: string;
  name: string;
  missingMobile: boolean;
  missingEmergencyNumber: boolean;
};

export type ContactDirectoryForManagement = {
  families: ManagedFamily[];
  unlinkedChildren: UnlinkedChild[];
  staffGaps: StaffContactGap[];
  staffTotal: number;
};

function byName(a: string, b: string): number {
  return a.localeCompare(b, "en-NZ", { sensitivity: "base" });
}

function hasText(value: string | null | undefined): boolean {
  return Boolean(value && value.trim());
}

export async function getContactDirectoryForManagement(): Promise<ContactDirectoryForManagement> {
  const supabase = createClient();

  const [childResult, staffResult] = await Promise.all([
    supabase.from("children").select("id, full_name, bill_payer_id").eq("status", "active"),
    supabase
      .from("staff")
      .select("id, full_name, mobile_phone, emergency_contact_phone")
      .eq("status", "active"),
  ]);
  if (childResult.error) throw new Error(`Could not load children: ${childResult.error.message}`);
  if (staffResult.error) throw new Error(`Could not load staff: ${staffResult.error.message}`);

  const childRows = (childResult.data ?? []) as { id: string; full_name: string; bill_payer_id: string | null }[];
  const staffRows = (staffResult.data ?? []) as {
    id: string;
    full_name: string;
    mobile_phone: string | null;
    emergency_contact_phone: string | null;
  }[];

  const billPayerIds = Array.from(
    new Set(childRows.map((c) => c.bill_payer_id).filter((id): id is string => Boolean(id)))
  );

  let billPayerRows: { id: string; full_name: string; phone: string | null }[] = [];
  let contactRows: FamilyContact[] = [];
  if (billPayerIds.length > 0) {
    const [billPayerResult, contactResult] = await Promise.all([
      supabase.from("bill_payers").select("id, full_name, phone").in("id", billPayerIds),
      supabase
        .from("family_contacts")
        .select("id, bill_payer_id, full_name, relationship, email, phone, is_primary")
        .in("bill_payer_id", billPayerIds)
        .order("is_primary", { ascending: false })
        .order("full_name", { ascending: true }),
    ]);
    if (billPayerResult.error) throw new Error(`Could not load families: ${billPayerResult.error.message}`);
    if (contactResult.error) throw new Error(`Could not load family contacts: ${contactResult.error.message}`);
    billPayerRows = (billPayerResult.data ?? []) as typeof billPayerRows;
    contactRows = (contactResult.data ?? []) as FamilyContact[];
  }

  const childrenByBillPayer = new Map<string, { id: string; name: string }[]>();
  const unlinkedChildren: UnlinkedChild[] = [];
  childRows.forEach((child) => {
    if (!child.bill_payer_id) {
      unlinkedChildren.push({ id: child.id, name: child.full_name });
      return;
    }
    const list = childrenByBillPayer.get(child.bill_payer_id) ?? [];
    list.push({ id: child.id, name: child.full_name });
    childrenByBillPayer.set(child.bill_payer_id, list);
  });

  const contactsByBillPayer = new Map<string, FamilyContact[]>();
  contactRows.forEach((contact) => {
    const list = contactsByBillPayer.get(contact.bill_payer_id) ?? [];
    list.push(contact);
    contactsByBillPayer.set(contact.bill_payer_id, list);
  });

  const families: ManagedFamily[] = billPayerRows
    .map((billPayer) => ({
      key: billPayer.id,
      billPayerId: billPayer.id,
      billPayerName: billPayer.full_name,
      billPayerPhone: billPayer.phone,
      children: (childrenByBillPayer.get(billPayer.id) ?? []).slice().sort((a, b) => byName(a.name, b.name)),
      contacts: contactsByBillPayer.get(billPayer.id) ?? [],
    }))
    .sort((a, b) => byName(a.children[0]?.name ?? a.billPayerName, b.children[0]?.name ?? b.billPayerName));

  const staffGaps: StaffContactGap[] = staffRows
    .map((s) => ({
      id: s.id,
      name: s.full_name,
      missingMobile: !hasText(s.mobile_phone),
      missingEmergencyNumber: !hasText(s.emergency_contact_phone),
    }))
    .filter((s) => s.missingMobile || s.missingEmergencyNumber)
    .sort((a, b) => byName(a.name, b.name));

  return {
    families,
    unlinkedChildren: unlinkedChildren.sort((a, b) => byName(a.name, b.name)),
    staffGaps,
    staffTotal: staffRows.length,
  };
}

import "server-only";
import { createClient } from "@/lib/supabase/server";

// Extra, read-only facts the Staff directory needs per person that the
// staff list itself doesn't carry: which document categories are on file
// (to name what's missing), each document's expiry (to count renewals
// due), and whether weekly availability has ever been saved. Same tables
// and the same logged-in client as getStaffList.

export type StaffDirectoryExtras = {
  categories: Map<string, Set<string>>;
  expiries: Map<string, string[]>;
  hasAvailability: Set<string>;
};

export async function getStaffDirectoryExtras(staffIds: string[]): Promise<StaffDirectoryExtras> {
  const result: StaffDirectoryExtras = { categories: new Map(), expiries: new Map(), hasAvailability: new Set() };
  if (staffIds.length === 0) return result;
  const supabase = createClient();
  const [{ data: docs }, { data: availability }] = await Promise.all([
    supabase.from("staff_documents").select("staff_id, category, expiry_date").in("staff_id", staffIds),
    supabase.from("staff_availability").select("staff_id").in("staff_id", staffIds),
  ]);
  (docs ?? []).forEach((d) => {
    const id = d.staff_id as string;
    if (!result.categories.has(id)) result.categories.set(id, new Set());
    result.categories.get(id)!.add(d.category as string);
    if (d.expiry_date) {
      const list = result.expiries.get(id) ?? [];
      list.push(d.expiry_date as string);
      result.expiries.set(id, list);
    }
  });
  (availability ?? []).forEach((a) => result.hasAvailability.add(a.staff_id as string));
  return result;
}

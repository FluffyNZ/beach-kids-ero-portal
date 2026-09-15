import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { BillPayer, ChildMember, ChildSibling, ChildWinzSubsidy, ChildWithDetails } from "@/lib/types";

const PHOTO_BUCKET = process.env.NEXT_PUBLIC_CHILD_PHOTOS_BUCKET || "child-photos";
// Longer-lived than the staff-document download links (which are opened
// on demand) — child photos are rendered inline on pages that tend to
// stay open for a while, so a very short TTL would go stale mid-session.
const PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

type ChildRow = {
  id: string;
  full_name: string;
  gender: string | null;
  age_years: number | null;
  age_months: number | null;
  age_as_of: string | null;
  residential_address: string | null;
  primary_contact_email: string | null;
  room_id: string | null;
  room_notes: string | null;
  bill_payer_id: string | null;
  bill_payer_unlisted_note: string | null;
  status: "active" | "left";
  photo_storage_path: string | null;
  hourly_rate: number | null;
  twenty_hours_ece: boolean;
  special_weekly_override: number | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

function mapBillPayer(row: {
  id: string;
  full_name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}): BillPayer {
  return {
    id: row.id,
    full_name: row.full_name,
    phone: row.phone,
    email: row.email,
    address: row.address,
    notes: row.notes,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

function mapWinz(row: {
  caregiver_name: string | null;
  weekly_cca_hours: number | null;
  weekly_payment: number | null;
  renewal_date: string | null;
  notes: string | null;
  updated_at: string;
} | null | undefined): ChildWinzSubsidy | null {
  if (!row) return null;
  return {
    caregiver_name: row.caregiver_name,
    weekly_cca_hours: row.weekly_cca_hours,
    weekly_payment: row.weekly_payment,
    renewal_date: row.renewal_date,
    notes: row.notes,
    updated_at: row.updated_at,
  };
}

/** Everything needed to list children, including the derived sibling
 * discount flag: a bill payer with more than one *active* child qualifies
 * — same rule the source fees report uses, computed here rather than
 * stored so it can never drift out of date. */
export async function getChildrenList(options?: {
  search?: string;
  status?: string;
  roomId?: string;
}): Promise<ChildMember[]> {
  const supabase = createClient();

  let query = supabase.from("children").select("*").order("full_name", { ascending: true });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.roomId) {
    query = query.eq("room_id", options.roomId);
  }
  if (options?.search && options.search.trim().length > 0) {
    const term = options.search.trim();
    query = query.ilike("full_name", `%${term}%`);
  }

  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];

  const [{ data: rooms }, { data: billPayers }, { data: winzRows }] = await Promise.all([
    supabase.from("roster_rooms").select("id, name, color"),
    supabase.from("bill_payers").select("id, full_name"),
    supabase.from("child_winz_subsidies").select("child_id"),
  ]);

  const roomNameById = new Map((rooms ?? []).map((r) => [r.id, r.name]));
  const roomColorById = new Map((rooms ?? []).map((r) => [r.id, r.color]));
  const billPayerNameById = new Map((billPayers ?? []).map((b) => [b.id, b.full_name]));
  const winzChildIds = new Set((winzRows ?? []).map((w) => w.child_id));

  // One batched signing call for every child with a photo, rather than one
  // request per child — matters once there are dozens of children on a
  // single list page.
  const photoPaths = (rows as ChildRow[])
    .map((r) => r.photo_storage_path)
    .filter((p): p is string => Boolean(p));
  const photoUrlByPath = new Map<string, string>();
  if (photoPaths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrls(photoPaths, PHOTO_SIGNED_URL_TTL_SECONDS);
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && !s.error) photoUrlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  // Only active children count toward another active child's sibling
  // discount — a former sibling shouldn't keep a discount alive.
  const activeRows = (rows as ChildRow[]).filter((r) => r.status === "active");
  const activeCountByBillPayer = new Map<string, number>();
  const siblingsByBillPayer = new Map<string, ChildSibling[]>();
  for (const r of activeRows) {
    if (!r.bill_payer_id) continue;
    activeCountByBillPayer.set(r.bill_payer_id, (activeCountByBillPayer.get(r.bill_payer_id) ?? 0) + 1);
    const list = siblingsByBillPayer.get(r.bill_payer_id) ?? [];
    list.push({ id: r.id, full_name: r.full_name });
    siblingsByBillPayer.set(r.bill_payer_id, list);
  }

  return (rows as ChildRow[]).map((r) => {
    const siblingsIncludingSelf = r.bill_payer_id ? siblingsByBillPayer.get(r.bill_payer_id) ?? [] : [];
    const siblings = siblingsIncludingSelf.filter((s) => s.id !== r.id);
    const siblingCount = r.bill_payer_id ? activeCountByBillPayer.get(r.bill_payer_id) ?? 0 : 0;

    return {
      id: r.id,
      full_name: r.full_name,
      gender: r.gender,
      age_years: r.age_years,
      age_months: r.age_months,
      age_as_of: r.age_as_of,
      residential_address: r.residential_address,
      primary_contact_email: r.primary_contact_email,
      room_id: r.room_id,
      room_name: r.room_id ? roomNameById.get(r.room_id) ?? null : null,
      room_color: r.room_id ? roomColorById.get(r.room_id) ?? null : null,
      room_notes: r.room_notes,
      bill_payer_id: r.bill_payer_id,
      bill_payer_name: r.bill_payer_id ? billPayerNameById.get(r.bill_payer_id) ?? null : null,
      bill_payer_unlisted_note: r.bill_payer_unlisted_note,
      status: r.status,
      photo_url: r.photo_storage_path ? photoUrlByPath.get(r.photo_storage_path) ?? null : null,
      hourly_rate: r.hourly_rate,
      twenty_hours_ece: r.twenty_hours_ece,
      special_weekly_override: r.special_weekly_override,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      sibling_discount_eligible: r.status === "active" && siblingCount > 1,
      siblings,
      has_winz_subsidy: winzChildIds.has(r.id),
    };
  });
}

export async function getChildById(id: string): Promise<ChildWithDetails | null> {
  const supabase = createClient();

  const { data: row } = await supabase.from("children").select("*").eq("id", id).maybeSingle();
  if (!row) return null;

  const childRow = row as ChildRow;

  const [{ data: room }, { data: billPayerRow }, { data: winzRow }, { data: scheduleRow }] = await Promise.all([
    childRow.room_id
      ? supabase.from("roster_rooms").select("id, name, color").eq("id", childRow.room_id).maybeSingle()
      : Promise.resolve({ data: null as { id: string; name: string; color: string } | null }),
    childRow.bill_payer_id
      ? supabase.from("bill_payers").select("*").eq("id", childRow.bill_payer_id).maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from("child_winz_subsidies").select("*").eq("child_id", id).maybeSingle(),
    supabase.from("child_enrolled_schedule").select("*").eq("child_id", id).maybeSingle(),
  ]);

  let siblings: ChildSibling[] = [];
  if (childRow.bill_payer_id) {
    const { data: siblingRows } = await supabase
      .from("children")
      .select("id, full_name")
      .eq("bill_payer_id", childRow.bill_payer_id)
      .eq("status", "active")
      .neq("id", id);
    siblings = siblingRows ?? [];
  }

  // Sibling discount looks at *all* active children billed to this payer,
  // including this one — so "eligible" means 2 or more in total.
  const activeSiblingCount = siblings.length + (childRow.status === "active" ? 1 : 0);

  const billPayer = billPayerRow ? mapBillPayer(billPayerRow) : null;

  let photoUrl: string | null = null;
  if (childRow.photo_storage_path) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(childRow.photo_storage_path, PHOTO_SIGNED_URL_TTL_SECONDS);
    photoUrl = signed?.signedUrl ?? null;
  }

  return {
    id: childRow.id,
    full_name: childRow.full_name,
    gender: childRow.gender,
    age_years: childRow.age_years,
    age_months: childRow.age_months,
    age_as_of: childRow.age_as_of,
    residential_address: childRow.residential_address,
    primary_contact_email: childRow.primary_contact_email,
    room_id: childRow.room_id,
    room_name: room?.name ?? null,
    room_color: room?.color ?? null,
    room_notes: childRow.room_notes,
    bill_payer_id: childRow.bill_payer_id,
    bill_payer_name: billPayer?.full_name ?? null,
    bill_payer_unlisted_note: childRow.bill_payer_unlisted_note,
    status: childRow.status,
    photo_url: photoUrl,
    hourly_rate: childRow.hourly_rate,
    twenty_hours_ece: childRow.twenty_hours_ece,
    special_weekly_override: childRow.special_weekly_override,
    notes: childRow.notes,
    created_at: childRow.created_at,
    updated_at: childRow.updated_at,
    sibling_discount_eligible: childRow.status === "active" && activeSiblingCount > 1,
    siblings,
    has_winz_subsidy: Boolean(winzRow),
    bill_payer: billPayer,
    winz_subsidy: mapWinz(winzRow),
    enrolled_schedule: scheduleRow
      ? {
          mon_start: scheduleRow.mon_start,
          mon_end: scheduleRow.mon_end,
          tue_start: scheduleRow.tue_start,
          tue_end: scheduleRow.tue_end,
          wed_start: scheduleRow.wed_start,
          wed_end: scheduleRow.wed_end,
          thu_start: scheduleRow.thu_start,
          thu_end: scheduleRow.thu_end,
          fri_start: scheduleRow.fri_start,
          fri_end: scheduleRow.fri_end,
          updated_at: scheduleRow.updated_at,
        }
      : null,
  };
}

/** For the "link to an existing bill payer" picker on the add/edit forms —
 * just id + name, cheapest possible query. */
export async function getBillPayerOptions(): Promise<Array<{ id: string; full_name: string }>> {
  const supabase = createClient();
  const { data } = await supabase.from("bill_payers").select("id, full_name").order("full_name", { ascending: true });
  return data ?? [];
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { StaffInduction } from "@/lib/types";

const SIGNATURE_BUCKET = process.env.NEXT_PUBLIC_STAFF_INDUCTION_SIGNATURES_BUCKET || "staff-induction-signatures";
// Signatures render inline on a page the person may sit on for a while
// (working through a long checklist) — same reasoning as the longer TTL
// used for staff profile photos.
const SIGNATURE_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

const EMPTY_INDUCTION: Omit<StaffInduction, "staff_id"> = {
  checkedItemKeys: new Set(),
  staff_signature_name: null,
  staff_signature_url: null,
  staff_signed_at: null,
  manager_signature_name: null,
  manager_signature_url: null,
  manager_signed_at: null,
  completed_at: null,
  updated_at: null,
};

/** Returns this staff member's induction progress — an empty, not-yet-started
 * shape if they don't have a staff_inductions row yet, so the checklist page
 * always has something to render without needing a separate "create" step
 * first. The row itself is only created once the first item is ticked or a
 * signature is saved (see src/lib/actions/induction.ts). */
export async function getStaffInduction(staffId: string): Promise<StaffInduction> {
  const supabase = createClient();

  const { data: row } = await supabase.from("staff_inductions").select("*").eq("staff_id", staffId).maybeSingle();

  if (!row) {
    return { staff_id: staffId, ...EMPTY_INDUCTION };
  }

  const itemStates = (row.item_states ?? {}) as Record<string, boolean>;
  const checkedItemKeys = new Set(Object.entries(itemStates).filter(([, checked]) => checked).map(([key]) => key));

  const paths = [row.staff_signature_storage_path, row.manager_signature_storage_path].filter(
    (p): p is string => Boolean(p)
  );
  const urlByPath = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await supabase.storage
      .from(SIGNATURE_BUCKET)
      .createSignedUrls(paths, SIGNATURE_SIGNED_URL_TTL_SECONDS);
    (signed ?? []).forEach((s) => {
      if (s.signedUrl && !s.error) urlByPath.set(s.path ?? "", s.signedUrl);
    });
  }

  return {
    staff_id: staffId,
    checkedItemKeys,
    staff_signature_name: row.staff_signature_name,
    staff_signature_url: row.staff_signature_storage_path
      ? urlByPath.get(row.staff_signature_storage_path) ?? null
      : null,
    staff_signed_at: row.staff_signed_at,
    manager_signature_name: row.manager_signature_name,
    manager_signature_url: row.manager_signature_storage_path
      ? urlByPath.get(row.manager_signature_storage_path) ?? null
      : null,
    manager_signed_at: row.manager_signed_at,
    completed_at: row.completed_at,
    updated_at: row.updated_at,
  };
}

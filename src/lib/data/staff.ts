import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfilesMap, isAuthorisedManagement } from "./profiles";
import { DEFAULT_STAFF_QUALIFICATION } from "@/lib/types";
import { getRequiredStaffDocumentCategories } from "@/lib/constants";
import type {
  StaffDocument,
  StaffMember,
  StaffQualification,
  StaffWithDetails,
  StaffAccessLevel,
  StaffAvailability,
  StaffNote,
  StaffGrowthCycle,
} from "@/lib/types";
import type { StaffQualificationStatus, StaffContractType } from "@/lib/supabase/database.types";

const BUCKET = process.env.NEXT_PUBLIC_STAFF_DOCUMENTS_BUCKET || "staff-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minutes — short-lived, minted on demand

const PHOTO_BUCKET = process.env.NEXT_PUBLIC_STAFF_PHOTOS_BUCKET || "staff-photos";
// Longer-lived than the document download links — profile photos render
// inline on pages (and the calendar) that tend to stay open a while, same
// reasoning as child photos.
const PHOTO_SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour

function mapQualification(
  row:
    | {
        qualification_status: StaffQualificationStatus;
        qualification_level: string | null;
        registration_status: string | null;
        pay_parity_step: string | null;
        recognised_service: string | null;
        next_review_date: string | null;
        is_studying: boolean;
        studying_qualification: string | null;
        expected_completion_date: string | null;
        notes: string | null;
        updated_at: string;
      }
    | null
    | undefined,
  accessLevel: StaffAccessLevel
): StaffQualification {
  if (!row) return DEFAULT_STAFF_QUALIFICATION;
  return {
    qualification_status: row.qualification_status,
    qualification_level: row.qualification_level,
    registration_status: row.registration_status,
    // Pay parity step and recognised service are restricted-to-management
    // fields per the brief — masked to null here (not just hidden in the
    // UI) for anyone who isn't "authorised management" right now. See
    // isAuthorisedManagement() for what that does and doesn't protect
    // against while Beach Kids still has one shared login.
    pay_parity_step: accessLevel === "full" ? row.pay_parity_step : null,
    recognised_service: accessLevel === "full" ? row.recognised_service : null,
    next_review_date: row.next_review_date,
    is_studying: row.is_studying,
    studying_qualification: row.studying_qualification,
    expected_completion_date: row.expected_completion_date,
    notes: row.notes,
    updated_at: row.updated_at,
  };
}

function mapDocument(
  d: {
    id: string;
    staff_id: string;
    category: StaffDocument["category"];
    storage_path: string;
    original_filename: string;
    mime_type: string | null;
    file_size_bytes: number | null;
    document_date: string | null;
    expiry_date: string | null;
    notes: string | null;
    uploaded_by: string | null;
    uploaded_at: string;
  },
  profiles: Map<string, { id: string; full_name: string }>
): StaffDocument {
  return {
    id: d.id,
    staff_id: d.staff_id,
    category: d.category,
    storage_path: d.storage_path,
    original_filename: d.original_filename,
    mime_type: d.mime_type,
    file_size_bytes: d.file_size_bytes,
    document_date: d.document_date,
    expiry_date: d.expiry_date,
    notes: d.notes,
    uploaded_by_name: d.uploaded_by ? profiles.get(d.uploaded_by)?.full_name ?? null : null,
    uploaded_at: d.uploaded_at,
  };
}

export async function getStaffList(options?: {
  search?: string;
  status?: string;
  roomId?: string;
  contractType?: StaffContractType;
}): Promise<StaffMember[]> {
  const supabase = createClient();

  let query = supabase.from("staff").select("*").order("full_name", { ascending: true });

  if (options?.status) {
    query = query.eq("status", options.status);
  }
  if (options?.roomId) {
    query = query.eq("room_id", options.roomId);
  }
  if (options?.contractType) {
    query = query.eq("contract_type", options.contractType);
  }

  if (options?.search && options.search.trim().length > 0) {
    const term = options.search.trim();
    query = query.or(`full_name.ilike.%${term}%,role.ilike.%${term}%`);
  }

  const [{ data: rows }, accessLevel, { data: roomRows }] = await Promise.all([
    query,
    isAuthorisedManagement().then((full): StaffAccessLevel => (full ? "full" : "restricted")),
    supabase.from("roster_rooms").select("id, name, color"),
  ]);
  if (!rows || rows.length === 0) return [];

  const roomById = new Map((roomRows ?? []).map((r) => [r.id as string, r as { id: string; name: string; color: string }]));

  const staffIds = rows.map((r) => r.id);

  const { data: docCounts } = await supabase
    .from("staff_documents")
    .select("staff_id, category, expiry_date")
    .in("staff_id", staffIds);

  const countByStaff = new Map<string, number>();
  const nearestExpiryByStaff = new Map<string, string>();
  const categoriesByStaff = new Map<string, Set<string>>();
  (docCounts ?? []).forEach((d) => {
    countByStaff.set(d.staff_id, (countByStaff.get(d.staff_id) ?? 0) + 1);
    if (d.expiry_date) {
      const existing = nearestExpiryByStaff.get(d.staff_id);
      if (!existing || d.expiry_date < existing) {
        nearestExpiryByStaff.set(d.staff_id, d.expiry_date);
      }
    }
    if (!categoriesByStaff.has(d.staff_id)) categoriesByStaff.set(d.staff_id, new Set());
    categoriesByStaff.get(d.staff_id)!.add(d.category);
  });

  const { data: quals } = await supabase
    .from("staff_qualifications")
    .select("*")
    .in("staff_id", staffIds);

  const qualByStaff = new Map((quals ?? []).map((q) => [q.staff_id, q]));

  // One batched signing call for every staff member with a photo, same
  // approach as the children list — matters once there are dozens of
  // staff on a single list page.
  const photoPaths = rows
    .map((r) => (r as { photo_storage_path: string | null }).photo_storage_path)
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

  return rows.map((r) => {
    const qualification = mapQualification(qualByStaff.get(r.id), accessLevel);
    const required = getRequiredStaffDocumentCategories(qualification.qualification_status, r.contract_type);
    const present = categoriesByStaff.get(r.id) ?? new Set<string>();
    const photoStoragePath = (r as { photo_storage_path: string | null }).photo_storage_path;
    const roomId = (r as { room_id: string | null }).room_id;
    const room = roomId ? roomById.get(roomId) : undefined;
    return {
      id: r.id,
      full_name: r.full_name,
      role: r.role,
      start_date: r.start_date,
      end_date: r.end_date,
      date_of_birth: r.date_of_birth,
      photo_storage_path: photoStoragePath,
      photo_url: photoStoragePath ? photoUrlByPath.get(photoStoragePath) ?? null : null,
      status: r.status,
      contract_type: r.contract_type,
      // Current pay rate is restricted-to-management per the brief — same
      // null-masking approach as pay_parity_step/recognised_service above.
      pay_rate: accessLevel === "full" ? r.pay_rate : null,
      min_hours: r.min_hours,
      notes: r.notes,
      can_publish_learning_stories: Boolean((r as any).can_publish_learning_stories),
      room_id: roomId ?? null,
      room_name: room?.name ?? null,
      room_color: room?.color ?? null,
      is_relief: Boolean((r as { is_relief?: boolean }).is_relief),
      email: (r as { email: string | null }).email ?? null,
      mobile_phone: (r as { mobile_phone: string | null }).mobile_phone ?? null,
      emergency_contact_name: (r as { emergency_contact_name: string | null }).emergency_contact_name ?? null,
      emergency_contact_phone: (r as { emergency_contact_phone: string | null }).emergency_contact_phone ?? null,
      emergency_contact_relationship:
        (r as { emergency_contact_relationship: string | null }).emergency_contact_relationship ?? null,
      created_at: r.created_at,
      updated_at: r.updated_at,
      document_count: countByStaff.get(r.id) ?? 0,
      nearest_document_expiry: nearestExpiryByStaff.get(r.id) ?? null,
      qualification,
      required_docs_completed: required.filter((c) => present.has(c)).length,
      required_docs_total: required.length,
      accessLevel,
    };
  });
}

// Documents that count as a "contract" for the brief's "restrict pay,
// contracts and confidential notes" requirement — kept out of a restricted
// viewer's documents array entirely, not just visually hidden, while still
// counting toward the required-documents percentage (computed from the
// unfiltered list below, before this filter runs).
const RESTRICTED_DOCUMENT_CATEGORIES = new Set(["contract"]);

export async function getStaffById(id: string): Promise<StaffWithDetails | null> {
  const supabase = createClient();

  const [{ data: row }, accessLevelFull, profiles] = await Promise.all([
    supabase.from("staff").select("*").eq("id", id).maybeSingle(),
    isAuthorisedManagement(),
    getProfilesMap(),
  ]);
  if (!row) return null;
  const accessLevel: StaffAccessLevel = accessLevelFull ? "full" : "restricted";

  const [{ data: docRows }, { data: qualRow }, { data: availRow }, { data: noteRows }, { data: cycleRows }, roomRow] =
    await Promise.all([
      supabase.from("staff_documents").select("*").eq("staff_id", id).order("uploaded_at", { ascending: false }),
      supabase.from("staff_qualifications").select("*").eq("staff_id", id).maybeSingle(),
      supabase.from("staff_availability").select("*").eq("staff_id", id).maybeSingle(),
      // Confidential notes are restricted to authorised management — don't
      // even fetch them for a restricted viewer, so there's no path where a
      // bug downstream could accidentally render what was fetched.
      accessLevelFull
        ? supabase.from("staff_notes").select("*").eq("staff_id", id).order("created_at", { ascending: false })
        : Promise.resolve({
            data: [] as {
              id: string;
              staff_id: string;
              body: string;
              created_at: string;
              created_by: string | null;
              storage_path: string | null;
              original_filename: string | null;
              mime_type: string | null;
              file_size_bytes: number | null;
            }[],
          }),
      supabase.from("staff_growth_cycles").select("*").eq("staff_id", id).order("created_at", { ascending: false }),
      (row as { room_id: string | null }).room_id
        ? supabase.from("roster_rooms").select("id, name, color").eq("id", (row as { room_id: string }).room_id).maybeSingle()
        : Promise.resolve({ data: null as { id: string; name: string; color: string } | null }),
    ]);

  const allDocuments: StaffDocument[] = (docRows ?? []).map((d) => mapDocument(d, profiles));

  const qualification = mapQualification(qualRow, accessLevel);
  const required = getRequiredStaffDocumentCategories(qualification.qualification_status, row.contract_type);
  const present = new Set(allDocuments.map((d) => d.category));
  const required_docs_completed = required.filter((c) => present.has(c)).length;
  const required_docs_total = required.length;

  const documents =
    accessLevel === "full" ? allDocuments : allDocuments.filter((d) => !RESTRICTED_DOCUMENT_CATEGORIES.has(d.category));

  const cycleIds = (cycleRows ?? []).map((c) => c.id);
  const { data: goalRows } =
    cycleIds.length > 0
      ? await supabase.from("staff_growth_goals").select("*").in("cycle_id", cycleIds).order("sort_order", { ascending: true })
      : { data: [] as { id: string; cycle_id: string; description: string; is_complete: boolean; sort_order: number }[] };
  const goalsByCycle = new Map<string, StaffWithDetails["growthCycles"][number]["goals"]>();
  (goalRows ?? []).forEach((g) => {
    const list = goalsByCycle.get(g.cycle_id) ?? [];
    list.push({ id: g.id, description: g.description, is_complete: g.is_complete, sort_order: g.sort_order });
    goalsByCycle.set(g.cycle_id, list);
  });
  const growthCycles: StaffGrowthCycle[] = (cycleRows ?? []).map((c) => ({
    id: c.id,
    staff_id: c.staff_id,
    title: c.title,
    start_date: c.start_date,
    review_date: c.review_date,
    status: c.status,
    reflections: c.reflections,
    goals: goalsByCycle.get(c.id) ?? [],
    created_at: c.created_at,
    updated_at: c.updated_at,
  }));

  const notes_log: StaffNote[] = (noteRows ?? []).map((n) => ({
    id: n.id,
    staff_id: n.staff_id,
    body: n.body,
    created_at: n.created_at,
    created_by_name: n.created_by ? profiles.get(n.created_by)?.full_name ?? null : null,
    storage_path: n.storage_path,
    original_filename: n.original_filename,
    mime_type: n.mime_type,
    file_size_bytes: n.file_size_bytes,
  }));

  const availability: StaffAvailability | null = availRow
    ? {
        mon_start: availRow.mon_start,
        mon_end: availRow.mon_end,
        tue_start: availRow.tue_start,
        tue_end: availRow.tue_end,
        wed_start: availRow.wed_start,
        wed_end: availRow.wed_end,
        thu_start: availRow.thu_start,
        thu_end: availRow.thu_end,
        fri_start: availRow.fri_start,
        fri_end: availRow.fri_end,
        notes: availRow.notes,
        updated_at: availRow.updated_at,
      }
    : null;

  const photoStoragePath = (row as { photo_storage_path: string | null }).photo_storage_path;
  let photoUrl: string | null = null;
  if (photoStoragePath) {
    const { data: signed } = await supabase.storage
      .from(PHOTO_BUCKET)
      .createSignedUrl(photoStoragePath, PHOTO_SIGNED_URL_TTL_SECONDS);
    photoUrl = signed?.signedUrl ?? null;
  }

  const room = roomRow.data;

  return {
    id: row.id,
    full_name: row.full_name,
    role: row.role,
    start_date: row.start_date,
    end_date: row.end_date,
    date_of_birth: row.date_of_birth,
    photo_storage_path: photoStoragePath,
    photo_url: photoUrl,
    status: row.status,
    contract_type: row.contract_type,
    pay_rate: accessLevel === "full" ? row.pay_rate : null,
    min_hours: row.min_hours,
    notes: row.notes,
    can_publish_learning_stories: Boolean((row as any).can_publish_learning_stories),
    room_id: (row as { room_id: string | null }).room_id ?? null,
    room_name: room?.name ?? null,
    room_color: room?.color ?? null,
    is_relief: Boolean((row as { is_relief?: boolean }).is_relief),
    email: (row as { email: string | null }).email ?? null,
    mobile_phone: (row as { mobile_phone: string | null }).mobile_phone ?? null,
    emergency_contact_name: (row as { emergency_contact_name: string | null }).emergency_contact_name ?? null,
    emergency_contact_phone: (row as { emergency_contact_phone: string | null }).emergency_contact_phone ?? null,
    emergency_contact_relationship:
      (row as { emergency_contact_relationship: string | null }).emergency_contact_relationship ?? null,
    created_at: row.created_at,
    updated_at: row.updated_at,
    document_count: documents.length,
    nearest_document_expiry:
      documents
        .map((d) => d.expiry_date)
        .filter((d): d is string => Boolean(d))
        .sort()[0] ?? null,
    qualification,
    documents,
    required_docs_completed,
    required_docs_total,
    accessLevel,
    availability,
    notes_log,
    growthCycles,
  };
}

// Note: the old "Safety Check" checklist (staff_checklist_areas/items/status)
// has been replaced on the profile page by the Required Documents ring
// below. The tables and the staff-checklist.tsx / staff-checklist-item-row.tsx
// components are left in place untouched in case you want them back, but
// nothing in the app queries or renders them any more.

export async function getSignedStaffDocumentUrl(
  storagePath: string,
  options?: { download?: boolean | string }
): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, options);
  if (error) return null;
  return data.signedUrl;
}

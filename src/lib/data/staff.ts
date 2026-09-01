import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfilesMap } from "./profiles";
import { DEFAULT_STAFF_QUALIFICATION } from "@/lib/types";
import { getRequiredStaffDocumentCategories } from "@/lib/constants";
import type { StaffDocument, StaffMember, StaffQualification, StaffWithDetails } from "@/lib/types";
import type { StaffQualificationStatus } from "@/lib/supabase/database.types";

const BUCKET = process.env.NEXT_PUBLIC_STAFF_DOCUMENTS_BUCKET || "staff-documents";
const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minutes — short-lived, minted on demand

function mapQualification(row: {
  qualification_status: StaffQualificationStatus;
  qualification_level: string | null;
  registration_status: string | null;
  pay_parity_step: string | null;
  next_review_date: string | null;
  is_studying: boolean;
  studying_qualification: string | null;
  expected_completion_date: string | null;
  notes: string | null;
  updated_at: string;
} | null | undefined): StaffQualification {
  if (!row) return DEFAULT_STAFF_QUALIFICATION;
  return {
    qualification_status: row.qualification_status,
    qualification_level: row.qualification_level,
    registration_status: row.registration_status,
    pay_parity_step: row.pay_parity_step,
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
}): Promise<StaffMember[]> {
  const supabase = createClient();

  let query = supabase.from("staff").select("*").order("full_name", { ascending: true });

  if (options?.status) {
    query = query.eq("status", options.status);
  }

  if (options?.search && options.search.trim().length > 0) {
    const term = options.search.trim();
    query = query.or(`full_name.ilike.%${term}%,role.ilike.%${term}%`);
  }

  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];

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

  return rows.map((r) => {
    const qualification = mapQualification(qualByStaff.get(r.id));
    const required = getRequiredStaffDocumentCategories(qualification.qualification_status);
    const present = categoriesByStaff.get(r.id) ?? new Set<string>();
    return {
      id: r.id,
      full_name: r.full_name,
      role: r.role,
      start_date: r.start_date,
      end_date: r.end_date,
      status: r.status,
      contract_type: r.contract_type,
      pay_rate: r.pay_rate,
      min_hours: r.min_hours,
      notes: r.notes,
      created_at: r.created_at,
      updated_at: r.updated_at,
      document_count: countByStaff.get(r.id) ?? 0,
      nearest_document_expiry: nearestExpiryByStaff.get(r.id) ?? null,
      qualification,
      required_docs_completed: required.filter((c) => present.has(c)).length,
      required_docs_total: required.length,
    };
  });
}

export async function getStaffById(id: string): Promise<StaffWithDetails | null> {
  const supabase = createClient();

  const { data: row } = await supabase.from("staff").select("*").eq("id", id).maybeSingle();
  if (!row) return null;

  const profiles = await getProfilesMap();

  const { data: docRows } = await supabase
    .from("staff_documents")
    .select("*")
    .eq("staff_id", id)
    .order("uploaded_at", { ascending: false });

  const documents: StaffDocument[] = (docRows ?? []).map((d) => mapDocument(d, profiles));

  const { data: qualRow } = await supabase
    .from("staff_qualifications")
    .select("*")
    .eq("staff_id", id)
    .maybeSingle();

  const qualification = mapQualification(qualRow);
  const required = getRequiredStaffDocumentCategories(qualification.qualification_status);
  const present = new Set(documents.map((d) => d.category));

  return {
    id: row.id,
    full_name: row.full_name,
    role: row.role,
    start_date: row.start_date,
    end_date: row.end_date,
    status: row.status,
    contract_type: row.contract_type,
    pay_rate: row.pay_rate,
    min_hours: row.min_hours,
    notes: row.notes,
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
    required_docs_completed: required.filter((c) => present.has(c)).length,
    required_docs_total: required.length,
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

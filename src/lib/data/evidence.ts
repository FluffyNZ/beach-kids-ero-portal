import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfilesMap } from "./profiles";
import type { EvidenceItem } from "@/lib/types";

const BUCKET = process.env.NEXT_PUBLIC_EVIDENCE_BUCKET || "evidence";
const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minutes — short-lived, minted on demand

export async function getEvidenceList(options?: {
  search?: string;
  category?: string;
}): Promise<EvidenceItem[]> {
  const supabase = createClient();

  let query = supabase.from("evidence").select("*").order("uploaded_at", { ascending: false });

  if (options?.category) {
    query = query.eq("category", options.category);
  }

  if (options?.search && options.search.trim().length > 0) {
    const term = options.search.trim();
    // textSearch covers title/category/description/filename/notes via the
    // generated search_vector column; also OR in a plain ilike fallback so
    // partial/short tokens (e.g. "HS7") still match.
    query = query.or(
      `title.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%,original_filename.ilike.%${term}%,notes.ilike.%${term}%`
    );
  }

  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];

  const profiles = await getProfilesMap();

  const evidenceIds = rows.map((r) => r.id);
  const { data: links } = await supabase
    .from("evidence_criteria_links")
    .select("id, evidence_id, criterion_id")
    .in("evidence_id", evidenceIds);

  const criterionIds = Array.from(new Set((links ?? []).map((l) => l.criterion_id)));
  const { data: criteria } =
    criterionIds.length > 0
      ? await supabase.from("ero_criteria").select("id, code, title").in("id", criterionIds)
      : { data: [] as Array<{ id: string; code: string; title: string }> };

  const criterionById = new Map((criteria ?? []).map((c) => [c.id, c]));
  const linksByEvidence = new Map<string, EvidenceItem["linked_criteria"]>();
  (links ?? []).forEach((l) => {
    const criterion = criterionById.get(l.criterion_id);
    if (!criterion) return;
    const bucket = linksByEvidence.get(l.evidence_id) ?? [];
    bucket.push({ link_id: l.id, criterion_id: l.criterion_id, code: criterion.code, title: criterion.title });
    linksByEvidence.set(l.evidence_id, bucket);
  });

  return rows.map((r) => ({
    id: r.id,
    title: r.title,
    original_filename: r.original_filename,
    storage_path: r.storage_path,
    mime_type: r.mime_type,
    file_size_bytes: r.file_size_bytes,
    description: r.description,
    category: r.category,
    document_date: r.document_date,
    review_date: r.review_date,
    expiry_date: r.expiry_date,
    uploaded_by_name: r.uploaded_by ? profiles.get(r.uploaded_by)?.full_name ?? null : null,
    uploaded_at: r.uploaded_at,
    notes: r.notes,
    linked_criteria: linksByEvidence.get(r.id) ?? [],
  }));
}

export async function getEvidenceForCriterion(criterionId: string): Promise<EvidenceItem[]> {
  const supabase = createClient();
  const { data: links } = await supabase
    .from("evidence_criteria_links")
    .select("id, evidence_id")
    .eq("criterion_id", criterionId);

  if (!links || links.length === 0) return [];

  const all = await getEvidenceList();
  const evidenceIds = new Set(links.map((l) => l.evidence_id));
  return all.filter((e) => evidenceIds.has(e.id));
}

export async function getSignedEvidenceUrl(
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

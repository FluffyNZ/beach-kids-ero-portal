import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfilesMap } from "./profiles";
import type { PolicyItem, PolicyVersion, PolicyWithVersions } from "@/lib/types";

const BUCKET = process.env.NEXT_PUBLIC_POLICIES_BUCKET || "policies";
const SIGNED_URL_TTL_SECONDS = 60 * 5; // 5 minutes — short-lived, minted on demand

type VersionRow = {
  id: string;
  policy_id: string;
  version_number: number;
  storage_path: string;
  original_filename: string;
  mime_type: string | null;
  file_size_bytes: number | null;
  change_summary: string | null;
  status: "draft" | "approved";
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  created_by: string | null;
};

function mapVersion(v: VersionRow, profiles: Map<string, { id: string; full_name: string }>): PolicyVersion {
  return {
    id: v.id,
    policy_id: v.policy_id,
    version_number: v.version_number,
    storage_path: v.storage_path,
    original_filename: v.original_filename,
    mime_type: v.mime_type,
    file_size_bytes: v.file_size_bytes,
    change_summary: v.change_summary,
    status: v.status,
    approved_by_name: v.approved_by ? profiles.get(v.approved_by)?.full_name ?? null : null,
    approved_at: v.approved_at,
    created_at: v.created_at,
    created_by_name: v.created_by ? profiles.get(v.created_by)?.full_name ?? null : null,
  };
}

export async function getPolicyList(options?: {
  search?: string;
  category?: string;
}): Promise<PolicyItem[]> {
  const supabase = createClient();

  let query = supabase
    .from("policies")
    .select("*")
    .eq("status", "active")
    .order("title", { ascending: true });

  if (options?.category) {
    query = query.eq("category", options.category);
  }
  if (options?.search && options.search.trim().length > 0) {
    const term = options.search.trim();
    query = query.or(`title.ilike.%${term}%,category.ilike.%${term}%,description.ilike.%${term}%`);
  }

  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];

  const profiles = await getProfilesMap();
  const policyIds = rows.map((r) => r.id);

  const { data: versions } = await supabase
    .from("policy_versions")
    .select("*")
    .in("policy_id", policyIds);

  const versionsByPolicy = new Map<string, VersionRow[]>();
  (versions ?? []).forEach((v) => {
    const bucket = versionsByPolicy.get(v.policy_id) ?? [];
    bucket.push(v as VersionRow);
    versionsByPolicy.set(v.policy_id, bucket);
  });

  return rows.map((r) => {
    const versionRows = (versionsByPolicy.get(r.id) ?? []).sort((a, b) => b.version_number - a.version_number);
    const current = versionRows.find((v) => v.id === r.current_version_id) ?? null;
    return {
      id: r.id,
      title: r.title,
      category: r.category,
      description: r.description,
      status: r.status,
      review_cycle: r.review_cycle,
      next_review_date: r.next_review_date,
      created_at: r.created_at,
      updated_at: r.updated_at,
      current_version: current ? mapVersion(current, profiles) : null,
      version_count: versionRows.length,
    };
  });
}

export async function getPolicyById(id: string): Promise<PolicyWithVersions | null> {
  const supabase = createClient();
  const { data: row } = await supabase.from("policies").select("*").eq("id", id).maybeSingle();
  if (!row) return null;

  const profiles = await getProfilesMap();
  const { data: versions } = await supabase
    .from("policy_versions")
    .select("*")
    .eq("policy_id", id)
    .order("version_number", { ascending: false });

  const mappedVersions = (versions ?? []).map((v) => mapVersion(v as VersionRow, profiles));
  const current = mappedVersions.find((v) => v.id === row.current_version_id) ?? null;

  return {
    id: row.id,
    title: row.title,
    category: row.category,
    description: row.description,
    status: row.status,
    review_cycle: row.review_cycle,
    next_review_date: row.next_review_date,
    created_at: row.created_at,
    updated_at: row.updated_at,
    current_version: current,
    version_count: mappedVersions.length,
    versions: mappedVersions,
  };
}

export async function getSignedPolicyUrl(
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

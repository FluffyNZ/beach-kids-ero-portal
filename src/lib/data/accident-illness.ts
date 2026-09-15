import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfilesMap } from "./profiles";
import { getSignedEvidenceUrl } from "./evidence";
import type { AccidentIllnessRecord } from "@/lib/types";

type RawRow = {
  id: string;
  child_id: string;
  incident_date: string;
  incident_time: string | null;
  time_parent_contacted: string | null;
  description: string | null;
  equipment_involved: boolean | null;
  another_child_involved: boolean | null;
  first_aid_provided: string | null;
  further_first_aid_required: boolean | null;
  first_aid_supplies_used: string | null;
  staff_id: string | null;
  parent_signed: boolean;
  evidence_id: string | null;
  recorded_by: string | null;
  created_at: string;
  updated_at: string;
};

async function mapRows(rows: RawRow[]): Promise<AccidentIllnessRecord[]> {
  if (rows.length === 0) return [];
  const supabase = createClient();

  const childIds = Array.from(new Set(rows.map((r) => r.child_id)));
  const staffIds = Array.from(new Set(rows.map((r) => r.staff_id).filter((id): id is string => Boolean(id))));
  const evidenceIds = Array.from(new Set(rows.map((r) => r.evidence_id).filter((id): id is string => Boolean(id))));

  const [{ data: children }, { data: staffRows }, { data: evidenceRows }, profiles] = await Promise.all([
    childIds.length > 0
      ? supabase.from("children").select("id, full_name").in("id", childIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
    staffIds.length > 0
      ? supabase.from("staff").select("id, full_name").in("id", staffIds)
      : Promise.resolve({ data: [] as Array<{ id: string; full_name: string }> }),
    evidenceIds.length > 0
      ? supabase.from("evidence").select("id, storage_path").in("id", evidenceIds)
      : Promise.resolve({ data: [] as Array<{ id: string; storage_path: string }> }),
    getProfilesMap(),
  ]);

  const childNameById = new Map((children ?? []).map((c) => [c.id, c.full_name]));
  const staffNameById = new Map((staffRows ?? []).map((s) => [s.id, s.full_name]));
  const evidenceById = new Map((evidenceRows ?? []).map((e) => [e.id, e.storage_path]));

  const signedUrlByEvidenceId = new Map<string, string | null>();
  await Promise.all(
    Array.from(evidenceById.entries()).map(async ([id, storagePath]) => {
      signedUrlByEvidenceId.set(id, await getSignedEvidenceUrl(storagePath));
    })
  );

  return rows.map((r) => ({
    id: r.id,
    child_id: r.child_id,
    child_name: childNameById.get(r.child_id) ?? "Unknown child",
    incident_date: r.incident_date,
    incident_time: r.incident_time,
    time_parent_contacted: r.time_parent_contacted,
    description: r.description,
    equipment_involved: r.equipment_involved,
    another_child_involved: r.another_child_involved,
    first_aid_provided: r.first_aid_provided,
    further_first_aid_required: r.further_first_aid_required,
    first_aid_supplies_used: r.first_aid_supplies_used,
    staff_id: r.staff_id,
    staff_name: r.staff_id ? (staffNameById.get(r.staff_id) ?? null) : null,
    parent_signed: r.parent_signed,
    evidence_id: r.evidence_id,
    evidencePhotoUrl: r.evidence_id ? (signedUrlByEvidenceId.get(r.evidence_id) ?? null) : null,
    recorded_by_name: r.recorded_by ? (profiles.get(r.recorded_by)?.full_name ?? null) : null,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }));
}

export async function getAccidentIllnessRecords(filters?: {
  childId?: string;
  monthKey?: string; // "YYYY-MM"
}): Promise<AccidentIllnessRecord[]> {
  const supabase = createClient();
  let query = supabase.from("accident_illness_records").select("*").order("incident_date", { ascending: false });

  if (filters?.childId) {
    query = query.eq("child_id", filters.childId);
  }
  if (filters?.monthKey) {
    const [y, m] = filters.monthKey.split("-").map(Number);
    const start = `${filters.monthKey}-01`;
    const endDate = new Date(Date.UTC(y, m, 1));
    const end = endDate.toISOString().slice(0, 10);
    query = query.gte("incident_date", start).lt("incident_date", end);
  }

  const { data: rows } = await query;
  return mapRows((rows ?? []) as RawRow[]);
}

export async function getAccidentIllnessRecordById(id: string): Promise<AccidentIllnessRecord | null> {
  const supabase = createClient();
  const { data: row } = await supabase.from("accident_illness_records").select("*").eq("id", id).maybeSingle();
  if (!row) return null;
  const mapped = await mapRows([row as RawRow]);
  return mapped[0] ?? null;
}

export async function getAccidentIllnessRecordsForChild(childId: string): Promise<AccidentIllnessRecord[]> {
  return getAccidentIllnessRecords({ childId });
}

/** Real count for the Records & Compliance overview — records logged this
 * calendar month. Used instead of a fabricated placeholder now that this
 * module exists. */
export async function getAccidentIllnessCountThisMonth(): Promise<number> {
  const supabase = createClient();
  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const start = `${monthKey}-01`;
  const end = new Date(Date.UTC(now.getFullYear(), now.getMonth() + 1, 1)).toISOString().slice(0, 10);

  const { count } = await supabase
    .from("accident_illness_records")
    .select("id", { count: "exact", head: true })
    .gte("incident_date", start)
    .lt("incident_date", end);

  return count ?? 0;
}

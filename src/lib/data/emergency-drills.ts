import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getProfilesMap } from "./profiles";
import type { EmergencyDrill } from "@/lib/types";

async function mapDrill(
  row: {
    id: string;
    drill_type: EmergencyDrill["drill_type"];
    drill_date: string;
    duration_minutes: number | null;
    children_involved: boolean;
    children_present: number | null;
    staff_present: number | null;
    assembly_point: string | null;
    conducted_by: string | null;
    what_happened: string | null;
    what_went_well: string | null;
    improvements_needed: string | null;
    evaluation_notes: string | null;
    next_due_date: string | null;
    evidence_id: string | null;
    recorded_by: string | null;
    created_at: string;
    updated_at: string;
  },
  profiles: Awaited<ReturnType<typeof getProfilesMap>>
): Promise<EmergencyDrill> {
  return {
    id: row.id,
    drill_type: row.drill_type,
    drill_date: row.drill_date,
    duration_minutes: row.duration_minutes,
    children_involved: row.children_involved,
    children_present: row.children_present,
    staff_present: row.staff_present,
    assembly_point: row.assembly_point,
    conducted_by: row.conducted_by,
    what_happened: row.what_happened,
    what_went_well: row.what_went_well,
    improvements_needed: row.improvements_needed,
    evaluation_notes: row.evaluation_notes,
    next_due_date: row.next_due_date,
    evidence_id: row.evidence_id,
    recorded_by_name: row.recorded_by ? profiles.get(row.recorded_by)?.full_name ?? null : null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export async function getEmergencyDrills(): Promise<EmergencyDrill[]> {
  const supabase = createClient();
  const { data: rows } = await supabase
    .from("emergency_drills")
    .select("*")
    .order("drill_date", { ascending: false });

  if (!rows || rows.length === 0) return [];

  const profiles = await getProfilesMap();
  return Promise.all(rows.map((r) => mapDrill(r, profiles)));
}

export async function getEmergencyDrillById(id: string): Promise<EmergencyDrill | null> {
  const supabase = createClient();
  const { data: row } = await supabase.from("emergency_drills").select("*").eq("id", id).maybeSingle();
  if (!row) return null;

  const profiles = await getProfilesMap();
  return mapDrill(row, profiles);
}

/** The most recent drill (of any type) sets when the next one is due. No
 * drill logged yet at all means one is due now. */
export async function getNextDrillDue(): Promise<{ lastDrillDate: string | null; nextDueDate: string | null }> {
  const supabase = createClient();
  const { data: row } = await supabase
    .from("emergency_drills")
    .select("drill_date, next_due_date")
    .order("drill_date", { ascending: false })
    .limit(1)
    .maybeSingle();

  return {
    lastDrillDate: row?.drill_date ?? null,
    nextDueDate: row?.next_due_date ?? null,
  };
}

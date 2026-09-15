"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { addMonths } from "@/lib/utils";
import { EMERGENCY_DRILL_TYPE_LABEL, EMERGENCY_DRILL_TYPES } from "@/lib/constants";
import type { EmergencyDrillType } from "@/lib/supabase/database.types";

// The Emergency Drills criterion in the official ERO checklist.
const DRILL_CRITERION_CODE = "HS8";

// Ethan's own policy is stricter than the current Ministry minimum (4-monthly
// as of the licensing criteria that took effect 20 April 2026) — Beach Kids
// runs drills at least every 3 months, so "next due" is calculated on that
// cadence.
const DRILL_INTERVAL_MONTHS = 3;

const EVIDENCE_BUCKET = process.env.NEXT_PUBLIC_EVIDENCE_BUCKET || "evidence";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export type CreateDrillResult = { success: true; id: string } | { success: false; error: string };

export async function createEmergencyDrill(formData: FormData): Promise<CreateDrillResult> {
  const drillType = String(formData.get("drill_type") ?? "") as EmergencyDrillType;
  const drillDate = String(formData.get("drill_date") ?? "");

  if (!EMERGENCY_DRILL_TYPES.includes(drillType)) {
    return { success: false, error: "Choose a drill type." };
  }
  if (!drillDate) {
    return { success: false, error: "Enter the date the drill was carried out." };
  }

  const durationRaw = formData.get("duration_minutes");
  const childrenPresentRaw = formData.get("children_present");
  const staffPresentRaw = formData.get("staff_present");

  const userId = await currentUserId();
  const supabase = createClient();

  const { data: row, error } = await supabase
    .from("emergency_drills")
    .insert({
      drill_type: drillType,
      drill_date: drillDate,
      duration_minutes: durationRaw ? Number(durationRaw) : null,
      children_involved: formData.get("children_involved") === "on",
      children_present: childrenPresentRaw ? Number(childrenPresentRaw) : null,
      staff_present: staffPresentRaw ? Number(staffPresentRaw) : null,
      assembly_point: String(formData.get("assembly_point") ?? "").trim() || null,
      conducted_by: String(formData.get("conducted_by") ?? "").trim() || null,
      what_happened: String(formData.get("what_happened") ?? "").trim() || null,
      what_went_well: String(formData.get("what_went_well") ?? "").trim() || null,
      improvements_needed: String(formData.get("improvements_needed") ?? "").trim() || null,
      evaluation_notes: String(formData.get("evaluation_notes") ?? "").trim() || null,
      next_due_date: addMonths(drillDate, DRILL_INTERVAL_MONTHS),
      recorded_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !row) {
    return { success: false, error: `Could not save the drill record: ${error?.message ?? "unknown error"}` };
  }

  revalidatePath("/emergency-drills");
  revalidatePath("/dashboard");
  revalidatePath(`/checklist/${DRILL_CRITERION_CODE}`);

  return { success: true, id: row.id };
}

export type AttachEvidenceResult = { success: true } | { success: false; error: string };

/** Files the PDF the manager just saved from the printable drill record as
 * real evidence — uploaded to the same private evidence bucket as anything
 * else, linked to Criterion HS8, and linked back to this drill record. */
export async function attachDrillEvidence(drillId: string, formData: FormData): Promise<AttachEvidenceResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose the PDF you just saved." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: drill } = await supabase
    .from("emergency_drills")
    .select("drill_type, drill_date")
    .eq("id", drillId)
    .maybeSingle();
  if (!drill) {
    return { success: false, error: "That drill record no longer exists." };
  }

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${new Date().getFullYear()}/${randomUUID()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(EVIDENCE_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/pdf",
    upsert: false,
  });
  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const title = `Emergency Drill — ${EMERGENCY_DRILL_TYPE_LABEL[drill.drill_type as EmergencyDrillType]} — ${drill.drill_date}`;

  const { data: evidenceRow, error: insertError } = await supabase
    .from("evidence")
    .insert({
      title,
      original_filename: file.name,
      storage_path: storagePath,
      mime_type: file.type || "application/pdf",
      file_size_bytes: file.size,
      category: "Emergency Drills",
      document_date: drill.drill_date,
      uploaded_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (insertError || !evidenceRow) {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save evidence record: ${insertError?.message}` };
  }

  const { data: criterion } = await supabase
    .from("ero_criteria")
    .select("id")
    .eq("code", DRILL_CRITERION_CODE)
    .maybeSingle();

  if (criterion) {
    await supabase.from("evidence_criteria_links").insert({
      evidence_id: evidenceRow.id,
      criterion_id: criterion.id,
      linked_by: userId,
    } as any);

    // Real evidence now exists for HS8 — only the factual evidence status
    // is set automatically. Whether HS8 is actually compliant stays a
    // judgement call Ethan makes himself via the Compliance Status dropdown.
    const { data: existingAssessment } = await supabase
      .from("criterion_assessments")
      .select("id")
      .eq("criterion_id", criterion.id)
      .maybeSingle();

    if (existingAssessment) {
      await supabase
        .from("criterion_assessments")
        .update({ evidence_status: "ready", updated_by: userId } as any)
        .eq("criterion_id", criterion.id);
    } else {
      await supabase
        .from("criterion_assessments")
        .insert({ criterion_id: criterion.id, evidence_status: "ready", updated_by: userId } as any);
    }

    await supabase.from("activity_log").insert({
      criterion_id: criterion.id,
      entity_type: "evidence",
      entity_id: evidenceRow.id,
      event_type: "evidence_uploaded",
      description: `Filed emergency drill record "${title}" as evidence`,
      performed_by: userId,
    } as any);
  }

  await supabase.from("emergency_drills").update({ evidence_id: evidenceRow.id } as any).eq("id", drillId);

  revalidatePath(`/emergency-drills/${drillId}`);
  revalidatePath("/emergency-drills");
  revalidatePath("/evidence");
  revalidatePath(`/checklist/${DRILL_CRITERION_CODE}`);
  revalidatePath("/checklist");
  revalidatePath("/dashboard");

  return { success: true };
}

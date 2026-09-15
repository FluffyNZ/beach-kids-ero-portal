"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { ComplianceStatus, EvidenceStatusValue } from "@/lib/supabase/database.types";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

async function ensureAssessmentRow(criterionId: string) {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data: existing } = await supabase
    .from("criterion_assessments")
    .select("id")
    .eq("criterion_id", criterionId)
    .maybeSingle();

  if (!existing) {
    await supabase.from("criterion_assessments").insert({
      criterion_id: criterionId,
      updated_by: userId,
    } as any);
  }
  return userId;
}

async function logActivity(criterionId: string, eventType: string, description: string) {
  const supabase = createClient();
  const userId = await currentUserId();
  await supabase.from("activity_log").insert({
    criterion_id: criterionId,
    entity_type: "criterion",
    entity_id: criterionId,
    event_type: eventType,
    description,
    performed_by: userId,
  } as any);
}

export async function updateComplianceStatus(
  criterionId: string,
  criterionCode: string,
  status: ComplianceStatus
) {
  const userId = await ensureAssessmentRow(criterionId);
  const supabase = createClient();
  await (supabase
    .from("criterion_assessments") as any)
    // Marking something N/A means it doesn't apply to this service at all —
    // so evidence isn't required for it either, without an extra click.
    .update({
      compliance_status: status,
      ...(status === "na" ? { evidence_status: "not_required" as const } : {}),
      updated_by: userId,
    } as any)
    .eq("criterion_id", criterionId);

  await logActivity(criterionId, "compliance_status_changed", `Compliance status set to "${status}"`);
  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/checklist");
  revalidatePath("/dashboard");
  revalidatePath("/audit-pack");
}

export async function updateEvidenceStatus(
  criterionId: string,
  criterionCode: string,
  status: EvidenceStatusValue
) {
  const userId = await ensureAssessmentRow(criterionId);
  const supabase = createClient();
  await (supabase
    .from("criterion_assessments") as any)
    .update({ evidence_status: status, updated_by: userId } as any)
    .eq("criterion_id", criterionId);

  await logActivity(criterionId, "evidence_status_changed", `Evidence status set to "${status}"`);
  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/checklist");
  revalidatePath("/dashboard");
  revalidatePath("/audit-pack");
}

export async function updateManagementNotes(criterionId: string, criterionCode: string, notes: string) {
  const userId = await ensureAssessmentRow(criterionId);
  const supabase = createClient();
  await (supabase
    .from("criterion_assessments") as any)
    .update({ management_notes: notes, updated_by: userId } as any)
    .eq("criterion_id", criterionId);

  revalidatePath(`/checklist/${criterionCode}`);
}

export async function updateFlag(
  criterionId: string,
  criterionCode: string,
  fields: { is_flagged: boolean; flag_notes: string | null }
) {
  const userId = await ensureAssessmentRow(criterionId);
  const supabase = createClient();
  const { error } = await (supabase
    .from("criterion_assessments") as any)
    .update({ is_flagged: fields.is_flagged, flag_notes: fields.flag_notes, updated_by: userId } as any)
    .eq("criterion_id", criterionId);

  if (error) {
    throw new Error(
      `Could not save the flag: ${error.message}. If this mentions a missing column, migration 0010_criterion_flag.sql hasn't been run in Supabase yet.`
    );
  }

  await logActivity(
    criterionId,
    fields.is_flagged ? "flagged" : "unflagged",
    fields.is_flagged ? `Flagged: ${fields.flag_notes ?? "no details given"}` : "Flag cleared"
  );
  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/checklist");
  revalidatePath("/dashboard");
}

export async function updateReviewInfo(
  criterionId: string,
  criterionCode: string,
  fields: { last_reviewed_at: string | null; next_review_date: string | null }
) {
  const userId = await ensureAssessmentRow(criterionId);
  const supabase = createClient();
  await (supabase
    .from("criterion_assessments") as any)
    .update({
      last_reviewed_at: fields.last_reviewed_at,
      next_review_date: fields.next_review_date,
      reviewed_by: userId,
      updated_by: userId,
    } as any)
    .eq("criterion_id", criterionId);

  await logActivity(criterionId, "reviewed", "Review information updated");
  revalidatePath(`/checklist/${criterionCode}`);
  revalidatePath("/dashboard");
}

"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { AccidentIllnessDraft } from "@/lib/types";

const EVIDENCE_BUCKET = process.env.NEXT_PUBLIC_EVIDENCE_BUCKET || "evidence";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function boolFromForm(formData: FormData, key: string): boolean | null {
  const raw = formData.get(key);
  if (raw === "yes") return true;
  if (raw === "no") return false;
  return null; // "not recorded" — deliberately not defaulted to false
}

export type SaveAccidentIllnessRecordResult = { success: true; id: string } | { success: false; error: string };

export async function createAccidentIllnessRecord(formData: FormData): Promise<SaveAccidentIllnessRecordResult> {
  const childId = String(formData.get("child_id") ?? "");
  const incidentDate = String(formData.get("incident_date") ?? "");

  if (!childId) {
    return { success: false, error: "Choose which child this record is for." };
  }
  if (!incidentDate) {
    return { success: false, error: "Enter the date of the incident." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: row, error } = await supabase
    .from("accident_illness_records")
    .insert({
      child_id: childId,
      incident_date: incidentDate,
      incident_time: (formData.get("incident_time") as string) || null,
      time_parent_contacted: (formData.get("time_parent_contacted") as string) || null,
      description: String(formData.get("description") ?? "").trim() || null,
      equipment_involved: boolFromForm(formData, "equipment_involved"),
      another_child_involved: boolFromForm(formData, "another_child_involved"),
      first_aid_provided: String(formData.get("first_aid_provided") ?? "").trim() || null,
      further_first_aid_required: boolFromForm(formData, "further_first_aid_required"),
      first_aid_supplies_used: String(formData.get("first_aid_supplies_used") ?? "").trim() || null,
      staff_id: (formData.get("staff_id") as string) || null,
      parent_signed: formData.get("parent_signed") === "on",
      recorded_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !row) {
    return { success: false, error: `Could not save this record: ${error?.message ?? "unknown error"}` };
  }

  revalidatePath("/records/accidents-illness");
  revalidatePath("/records");
  revalidatePath(`/children/${childId}`);

  return { success: true, id: row.id };
}

export async function updateAccidentIllnessRecord(
  recordId: string,
  formData: FormData
): Promise<SaveAccidentIllnessRecordResult> {
  const incidentDate = String(formData.get("incident_date") ?? "");
  if (!incidentDate) {
    return { success: false, error: "Enter the date of the incident." };
  }

  const supabase = createClient();

  const { data: existing } = await supabase
    .from("accident_illness_records")
    .select("child_id")
    .eq("id", recordId)
    .maybeSingle();
  if (!existing) {
    return { success: false, error: "That record no longer exists." };
  }

  const { error } = await (supabase
    .from("accident_illness_records") as any)
    .update({
      incident_date: incidentDate,
      incident_time: (formData.get("incident_time") as string) || null,
      time_parent_contacted: (formData.get("time_parent_contacted") as string) || null,
      description: String(formData.get("description") ?? "").trim() || null,
      equipment_involved: boolFromForm(formData, "equipment_involved"),
      another_child_involved: boolFromForm(formData, "another_child_involved"),
      first_aid_provided: String(formData.get("first_aid_provided") ?? "").trim() || null,
      further_first_aid_required: boolFromForm(formData, "further_first_aid_required"),
      first_aid_supplies_used: String(formData.get("first_aid_supplies_used") ?? "").trim() || null,
      staff_id: (formData.get("staff_id") as string) || null,
      parent_signed: formData.get("parent_signed") === "on",
    } as any)
    .eq("id", recordId);

  if (error) {
    return { success: false, error: `Could not save changes: ${error.message}` };
  }

  revalidatePath(`/records/accidents-illness/${recordId}`);
  revalidatePath("/records/accidents-illness");
  revalidatePath("/records");
  revalidatePath(`/children/${existing.child_id}`);

  return { success: true, id: recordId };
}

export type AttachEvidenceResult = { success: true } | { success: false; error: string };

/** Files the photo of the completed, signed paper form as real evidence —
 * uploaded to the same private evidence bucket the rest of the app already
 * uses, then linked back to this record. Replaces any previously attached
 * photo for this record rather than leaving orphaned duplicates. */
export async function attachAccidentIllnessEvidence(
  recordId: string,
  formData: FormData
): Promise<AttachEvidenceResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose the photo of the completed, signed form." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: record } = await supabase
    .from("accident_illness_records")
    .select("id, incident_date, evidence_id, child_id")
    .eq("id", recordId)
    .maybeSingle();
  if (!record) {
    return { success: false, error: "That record no longer exists." };
  }

  const { data: child } = await supabase
    .from("children")
    .select("full_name")
    .eq("id", record.child_id)
    .maybeSingle();

  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const storagePath = `${new Date().getFullYear()}/${randomUUID()}-${safeName}`;

  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(EVIDENCE_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) {
    return { success: false, error: `Upload failed: ${uploadError.message}` };
  }

  const title = `Accident & Illness Form — ${child?.full_name ?? "Unknown child"} — ${record.incident_date}`;

  const { data: evidenceRow, error: insertError } = await supabase
    .from("evidence")
    .insert({
      title,
      original_filename: file.name,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      file_size_bytes: file.size,
      category: "Accidents & Illness",
      document_date: record.incident_date,
      uploaded_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (insertError || !evidenceRow) {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the evidence record: ${insertError?.message}` };
  }

  const previousEvidenceId = record.evidence_id as string | null;

  await (supabase.from("accident_illness_records") as any).update({ evidence_id: evidenceRow.id } as any).eq("id", recordId);

  // Clean up the previous photo (if this is a replacement) so old and new
  // don't both linger in the evidence library.
  if (previousEvidenceId) {
    const { data: previousEvidence } = await supabase
      .from("evidence")
      .select("storage_path")
      .eq("id", previousEvidenceId)
      .maybeSingle();
    if (previousEvidence) {
      await supabase.storage.from(EVIDENCE_BUCKET).remove([previousEvidence.storage_path]);
    }
    await supabase.from("evidence").delete().eq("id", previousEvidenceId);
  }

  revalidatePath(`/records/accidents-illness/${recordId}`);
  revalidatePath("/records/accidents-illness");
  revalidatePath("/evidence");

  return { success: true };
}

// ---------------------------------------------------------------------------
// AI photo import — reads a photo of a completed, signed paper Accident &
// Illness Form and returns a draft to review, never a saved record.
//
// Requires the same ANTHROPIC_API_KEY as Learning Stories' "Help Me Write".
// Until that key is added this returns a clear "not connected" result
// rather than a fake response. Even once connected: the model only ever
// transcribes what's legibly on the page — it is explicitly told to say
// "unclear" rather than guess, and child/staff names come back as plain
// text hints for a human to match, never as an id wired straight into the
// record. Nothing here saves anything; the caller still has to review the
// pre-filled form and click Save.
// ---------------------------------------------------------------------------

export type ExtractAccidentIllnessResult =
  | { success: true; draft: AccidentIllnessDraft }
  | { success: false; error: string; notConfigured?: boolean };

const EXTRACT_SYSTEM_PROMPT = `You are transcribing a photo of a completed, handwritten New Zealand early childhood education "Accident & Illness Form" so a staff member can review it before it's saved as a digital record.

Strict rules:
- Only transcribe what is actually legible on the page. Never guess, infer, or fill in a plausible-sounding value for anything you can't clearly read.
- If a field is blank, illegible, or ambiguous, use null (or "unclear" for the three yes/no fields) — do not default to a "No" or a made-up value.
- For the three yes/no fields (equipment involved, another child involved, further first aid required), only answer "yes" or "no" if it is clearly circled, ticked or written — otherwise "unclear".
- Dates must be returned as YYYY-MM-DD and times as 24-hour HH:MM, only when confidently legible; otherwise null.
- child_name_guess and staff_name_guess are just your best reading of the handwritten names, exactly as written — they are not matched against any real records, so transcribe them as literally as you can read them.
- parent_signed_guess is true only if a signature clearly appears on the "Parent Signature" line, false if that line is clearly blank, and null if you can't tell from the photo.
- List the keys of any field you're genuinely unsure about in low_confidence_fields.
- Respond with ONLY a single JSON object matching the schema you're given — no other text, no markdown code fences.`;

function buildExtractSchemaInstruction(): string {
  return `Return exactly this JSON shape (all keys required):
{
  "child_name_guess": string | null,
  "staff_name_guess": string | null,
  "incident_date": string | null,
  "incident_time": string | null,
  "time_parent_contacted": string | null,
  "description": string | null,
  "equipment_involved": "yes" | "no" | "unclear",
  "another_child_involved": "yes" | "no" | "unclear",
  "first_aid_provided": string | null,
  "further_first_aid_required": "yes" | "no" | "unclear",
  "first_aid_supplies_used": string | null,
  "parent_signed_guess": boolean | null,
  "low_confidence_fields": string[]
}`;
}

function parseExtractedJson(raw: string): AccidentIllnessDraft | null {
  let text = raw.trim();
  // Strip a markdown code fence if the model added one despite instructions.
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) text = fenceMatch[1];

  try {
    const parsed = JSON.parse(text);
    const yesNo = (v: unknown): "yes" | "no" | "unclear" => (v === "yes" || v === "no" ? v : "unclear");
    const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
    return {
      child_name_guess: strOrNull(parsed.child_name_guess),
      staff_name_guess: strOrNull(parsed.staff_name_guess),
      incident_date: strOrNull(parsed.incident_date),
      incident_time: strOrNull(parsed.incident_time),
      time_parent_contacted: strOrNull(parsed.time_parent_contacted),
      description: strOrNull(parsed.description),
      equipment_involved: yesNo(parsed.equipment_involved),
      another_child_involved: yesNo(parsed.another_child_involved),
      first_aid_provided: strOrNull(parsed.first_aid_provided),
      further_first_aid_required: yesNo(parsed.further_first_aid_required),
      first_aid_supplies_used: strOrNull(parsed.first_aid_supplies_used),
      parent_signed_guess: typeof parsed.parent_signed_guess === "boolean" ? parsed.parent_signed_guess : null,
      low_confidence_fields: Array.isArray(parsed.low_confidence_fields)
        ? parsed.low_confidence_fields.filter((f: unknown): f is string => typeof f === "string")
        : [],
    };
  } catch {
    return null;
  }
}

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function extractAccidentIllnessFromPhoto(formData: FormData): Promise<ExtractAccidentIllnessResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      notConfigured: true,
      error:
        "AI photo import isn't connected yet. Add an ANTHROPIC_API_KEY to this app's environment to turn it on — you can still fill this form in by hand.",
    };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose a photo of the completed, signed form first." };
  }
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return {
      success: false,
      error:
        "That file type isn't supported for photo import — use a JPG, PNG or WEBP photo. (iPhones set to \"High Efficiency\" save HEIC photos; switch to \"Most Compatible\" in Settings → Camera → Formats, or export as JPG first.)",
    };
  }

  // claude-3-5-sonnet-latest was retired — claude-sonnet-5 is the current
  // Sonnet model as of September 2026 and supports image input.
  const model = process.env.ANTHROPIC_LEARNING_STORY_MODEL || "claude-sonnet-5";

  try {
    const arrayBuffer = await file.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 1024,
        system: EXTRACT_SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
              { type: "text", text: buildExtractSchemaInstruction() },
            ],
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { success: false, error: `AI photo import request failed (${response.status}). ${detail.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = Array.isArray(data?.content)
      ? data.content.map((block: any) => (block?.type === "text" ? block.text : "")).join("\n").trim()
      : "";

    const draft = text ? parseExtractedJson(text) : null;
    if (!draft) {
      return { success: false, error: "Couldn't read a usable result from the photo — try a clearer, well-lit photo, or fill the form in by hand." };
    }

    return { success: true, draft };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `AI photo import failed: ${err.message}` : "AI photo import failed.",
    };
  }
}

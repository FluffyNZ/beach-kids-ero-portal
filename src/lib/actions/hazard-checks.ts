"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import {
  getHazardChecklistTemplate,
  getHazardCheckForRoomAndWeek,
  getRoomsWithHazardTemplates,
} from "@/lib/data/hazard-checks";
import { addDays, mondayOfDateString } from "@/lib/utils";
import type { HazardRiskLevel } from "@/lib/supabase/database.types";
import type { HazardCheckDraft } from "@/lib/types";

const EVIDENCE_BUCKET = process.env.NEXT_PUBLIC_EVIDENCE_BUCKET || "evidence";

/** A week's chart runs Monday through Friday — five sign-off columns,
 * matching the real paper chart and Beach Kids' weekday-only opening days. */
const WEEKDAY_OFFSETS = [0, 1, 2, 3, 4];

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export type CreateHazardCheckResult = { success: true; id: string } | { success: false; error: string };

/** Starts (or finds) a room's Weekly Hazard Checklist for the week starting
 * on `weekStartDate` (the Monday) — snapshotting the room's current
 * template onto this week's items so a later template edit never rewrites
 * what this particular week's chart actually asked, and pre-creating one
 * blank, unsigned sign-off row for each weekday (Mon–Fri) so there's always
 * somewhere real for that day's staff member to sign. If a chart already
 * exists for this room and week, its id is returned instead of creating a
 * second one — belt-and-braces alongside the database's own unique
 * constraint, so a doubled-up click never produces a duplicate chart. */
export async function createHazardCheck(roomId: string, weekStartDate: string): Promise<CreateHazardCheckResult> {
  if (!roomId || !weekStartDate) {
    return { success: false, error: "Choose a room and week." };
  }

  const existing = await getHazardCheckForRoomAndWeek(roomId, weekStartDate);
  if (existing) {
    return { success: true, id: existing.id };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const template = await getHazardChecklistTemplate(roomId);
  if (template.length === 0) {
    return { success: false, error: "This room doesn't have a hazard checklist set up yet." };
  }

  const { data: checkRow, error } = await supabase
    .from("hazard_checks")
    .insert({ room_id: roomId, week_start_date: weekStartDate, created_by: userId } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !checkRow) {
    // A unique-constraint violation here means someone else's click won the
    // race to create this week's chart for this room — fetch it rather than
    // erroring out or creating a duplicate.
    const raceWinner = await getHazardCheckForRoomAndWeek(roomId, weekStartDate);
    if (raceWinner) return { success: true, id: raceWinner.id };
    return { success: false, error: `Could not start this check: ${error?.message ?? "unknown error"}` };
  }

  const { error: itemsError } = await supabase.from("hazard_check_items").insert(
    template.map((t) => ({
      check_id: checkRow.id,
      category: t.category,
      item_text: t.item_text,
      sort_order: t.sort_order,
    })) as any
  );

  if (itemsError) {
    return { success: false, error: `Could not set up this check's items: ${itemsError.message}` };
  }

  const { error: signoffError } = await supabase.from("hazard_check_daily_signoffs").insert(
    WEEKDAY_OFFSETS.map((d) => ({
      check_id: checkRow.id,
      check_date: addDays(weekStartDate, d),
    })) as any
  );

  if (signoffError) {
    return { success: false, error: `Could not set up this week's sign-off rows: ${signoffError.message}` };
  }

  revalidatePath("/records/hazards");
  return { success: true, id: checkRow.id };
}

export type SaveHazardCheckResult = { success: true } | { success: false; error: string };

/** Saves the tick-box states and notes from one week's checklist form
 * submission in a single action — the daily staff sign-off is saved
 * separately, per day, by updateHazardCheckDailySignoff, since a different
 * staff member may sign a different day's column. */
export async function updateHazardCheck(checkId: string, formData: FormData): Promise<SaveHazardCheckResult> {
  const supabase = createClient();

  const notes = String(formData.get("notes") ?? "").trim() || null;

  const itemIds = formData.getAll("item_id") as string[];
  const itemUpdates = itemIds.map((itemId) => ({
    id: itemId,
    is_checked: formData.get(`item_checked_${itemId}`) === "on",
  }));

  const { error } = await (supabase.from("hazard_checks") as any).update({ notes } as any).eq("id", checkId);

  if (error) {
    return { success: false, error: `Could not save this check: ${error.message}` };
  }

  await Promise.all(
    itemUpdates.map((u) => (supabase.from("hazard_check_items") as any).update({ is_checked: u.is_checked } as any).eq("id", u.id))
  );

  revalidatePath(`/records/hazards/${checkId}`);
  revalidatePath("/records/hazards");
  return { success: true };
}

/** Saves one weekday's sign-off (staff, time, signed-off) within a week's
 * chart — mirrors one "Mon/Tue/Wed/Thu/Fri" column on the real paper chart,
 * each independently signed by whoever actually did that day's walk-through. */
export async function updateHazardCheckDailySignoff(signoffId: string, formData: FormData): Promise<SaveHazardCheckResult> {
  const supabase = createClient();

  const staffId = (String(formData.get("staff_id") ?? "").trim() || null) as string | null;
  const completedTime = (String(formData.get("completed_time") ?? "").trim() || null) as string | null;
  const signedOff = formData.get("signed_off") === "on";

  const { data: existing } = await supabase
    .from("hazard_check_daily_signoffs")
    .select("check_id, signed_off")
    .eq("id", signoffId)
    .maybeSingle();

  if (!existing) {
    return { success: false, error: "That day's sign-off row no longer exists." };
  }

  const { error } = await (supabase
    .from("hazard_check_daily_signoffs") as any)
    .update({
      staff_id: staffId,
      completed_time: completedTime,
      signed_off: signedOff,
      signed_off_at: signedOff && !existing.signed_off ? new Date().toISOString() : signedOff ? undefined : null,
    } as any)
    .eq("id", signoffId);

  if (error) {
    return { success: false, error: `Could not save this day's sign-off: ${error.message}` };
  }

  revalidatePath(`/records/hazards/${existing.check_id}`);
  revalidatePath("/records/hazards");
  return { success: true };
}

export type AddHazardLogEntryResult = { success: true } | { success: false; error: string };

export async function addHazardLogEntry(checkId: string, formData: FormData): Promise<AddHazardLogEntryResult> {
  const hazardDescription = String(formData.get("hazard_description") ?? "").trim();
  const riskLevel = (String(formData.get("risk_level") ?? "low").trim() || "low") as HazardRiskLevel;

  if (!hazardDescription) {
    return { success: false, error: "Describe the hazard and where it is." };
  }

  const supabase = createClient();
  const { error } = await supabase.from("hazard_log_entries").insert({
    check_id: checkId,
    hazard_description: hazardDescription,
    risk_level: riskLevel,
  } as any);

  if (error) {
    return { success: false, error: `Could not log this hazard: ${error.message}` };
  }

  revalidatePath(`/records/hazards/${checkId}`);
  revalidatePath("/records/hazards");
  revalidatePath("/records/hazards/register");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function setHazardLogEntryResolved(id: string, resolved: boolean, checkId?: string) {
  const supabase = createClient();
  await (supabase
    .from("hazard_log_entries") as any)
    .update({ resolved, resolved_at: resolved ? new Date().toISOString() : null } as any)
    .eq("id", id);

  if (checkId) revalidatePath(`/records/hazards/${checkId}`);
  revalidatePath("/records/hazards");
  revalidatePath("/records/hazards/register");
  revalidatePath("/dashboard");
}

export async function deleteHazardLogEntry(id: string, checkId?: string) {
  const supabase = createClient();
  await supabase.from("hazard_log_entries").delete().eq("id", id);

  if (checkId) revalidatePath(`/records/hazards/${checkId}`);
  revalidatePath("/records/hazards");
  revalidatePath("/records/hazards/register");
  revalidatePath("/dashboard");
}

export type AttachHazardEvidenceResult = { success: true } | { success: false; error: string };

/** Files the photo of the completed, signed Weekly Hazard Checklist as real
 * evidence — same shared private evidence bucket the rest of the app uses,
 * then linked back to this week's check. Replaces any previously attached
 * photo for this check rather than leaving orphaned duplicates, mirroring
 * attachAccidentIllnessEvidence. */
export async function attachHazardCheckEvidence(
  checkId: string,
  formData: FormData
): Promise<AttachHazardEvidenceResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose the photo of the completed, signed checklist." };
  }

  const supabase = createClient();
  const userId = await currentUserId();

  const { data: check } = await supabase
    .from("hazard_checks")
    .select("id, room_id, week_start_date, evidence_id")
    .eq("id", checkId)
    .maybeSingle();
  if (!check) {
    return { success: false, error: "That check no longer exists." };
  }

  const { data: room } = await supabase.from("roster_rooms").select("name").eq("id", check.room_id).maybeSingle();

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

  const title = `Weekly Hazard Checklist — ${room?.name ?? "Unknown room"} — Week of ${check.week_start_date}`;

  const { data: evidenceRow, error: insertError } = await supabase
    .from("evidence")
    .insert({
      title,
      original_filename: file.name,
      storage_path: storagePath,
      mime_type: file.type || "application/octet-stream",
      file_size_bytes: file.size,
      category: "Hazard Checks",
      document_date: check.week_start_date,
      uploaded_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (insertError || !evidenceRow) {
    await supabase.storage.from(EVIDENCE_BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the evidence record: ${insertError?.message}` };
  }

  const previousEvidenceId = check.evidence_id as string | null;

  await (supabase.from("hazard_checks") as any).update({ evidence_id: evidenceRow.id } as any).eq("id", checkId);

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

  revalidatePath(`/records/hazards/${checkId}`);
  revalidatePath("/records/hazards");
  revalidatePath("/evidence");

  return { success: true };
}

// ---------------------------------------------------------------------------
// AI photo import — reads a photo of a completed, signed Daily Hazard
// Checklist and returns a draft to review, never a saved check. Mirrors the
// Accident & Illness photo import: the model only ever transcribes what's
// legibly on the page, is told to say "unclear"/null rather than guess, and
// nothing here saves anything until the human reviewer confirms and saves.
//
// The one extra wrinkle here versus Accident & Illness: the room itself
// must be guessed too (per Ethan's choice of "AI detects room + date" over
// picking the room first), and the checklist's items are fixed, known text
// per room rather than free-form fields. So the prompt embeds every room's
// exact item list and the model is told to only ever report a ticked state
// against one of those exact strings — never invent a new item — and the
// human reviewer still gets a plain room dropdown to confirm or correct the
// guess before anything is saved.
// ---------------------------------------------------------------------------

export type ExtractHazardCheckResult =
  | { success: true; draft: HazardCheckDraft }
  | { success: false; error: string; notConfigured?: boolean };

/** Builds the "here are the only rooms and the only checklist items that
 * exist" section of the prompt, straight from the real templates — so the
 * model is constrained to real, known text rather than inventing items. */
async function buildRoomsChecklistText(): Promise<string> {
  const rooms = await getRoomsWithHazardTemplates();
  const sections = await Promise.all(
    rooms.map(async (room) => {
      const template = await getHazardChecklistTemplate(room.id);
      const lines = template.map((t) => `  - [${t.category}] ${t.item_text}`).join("\n");
      return `Room: "${room.name}"\n${lines}`;
    })
  );
  return sections.join("\n\n");
}

function buildHazardExtractSystemPrompt(roomsChecklistText: string): string {
  return `You are transcribing a photo of a completed, handwritten New Zealand early childhood education "Daily Hazard Checklist" so a staff member can review it before it's saved as a digital record.

The checklist is always for exactly one of the following rooms, and each room's checklist only ever contains the exact items listed below for it — never any other item, and never a different room's items:

${roomsChecklistText}

Strict rules:
- room_name_guess must be exactly one of the room names listed above (matching the photo's heading/title), or null if you genuinely cannot tell which room this is for.
- Only report a checklist item's ticked state if that item's exact text appears in the list above for the room you identified. Never invent, rename, or reword an item — copy item_text exactly as given above for whichever room you picked.
- For each item in that room's list, report "yes" if clearly ticked/checked, "no" if clearly left unticked, or "unclear" if you can't tell — do not default to "no" for something you can't actually see.
- hazard_log_entries are the free-text "Hazard & location" rows the form has separately from the tick-boxes — only include rows that actually have handwriting in them, with your best reading of the risk level ("low", "medium", or "high") if one is circled or written, defaulting to "low" only if a hazard is described but no risk level is indicated at all.
- If a field is blank, illegible, or ambiguous, use null — do not guess or fill in a plausible-sounding value.
- Dates must be returned as YYYY-MM-DD and times as 24-hour HH:MM, only when confidently legible; otherwise null.
- staff_name_guess is just your best reading of the handwritten name on the sign-off line, exactly as written — it is not matched against any real records, so transcribe it as literally as you can read it.
- signed_off_guess is true only if a name/signature clearly appears on the sign-off line, false if that line is clearly blank, and null if you can't tell from the photo.
- List the keys of any field you're genuinely unsure about in low_confidence_fields.
- Respond with ONLY a single JSON object matching the schema you're given — no other text, no markdown code fences.`;
}

function buildHazardExtractSchemaInstruction(): string {
  return `Return exactly this JSON shape (all keys required):
{
  "room_name_guess": string | null,
  "check_date": string | null,
  "items": [{ "item_text": string, "checked": "yes" | "no" | "unclear" }],
  "hazard_log_entries": [{ "hazard_description": string, "risk_level": "low" | "medium" | "high" }],
  "notes": string | null,
  "staff_name_guess": string | null,
  "completed_time": string | null,
  "signed_off_guess": boolean | null,
  "low_confidence_fields": string[]
}`;
}

function parseHazardExtractedJson(raw: string): HazardCheckDraft | null {
  let text = raw.trim();
  const fenceMatch = text.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  if (fenceMatch) text = fenceMatch[1];

  try {
    const parsed = JSON.parse(text);
    const strOrNull = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);
    const checkedVal = (v: unknown): "yes" | "no" | "unclear" => (v === "yes" || v === "no" ? v : "unclear");
    const riskVal = (v: unknown): HazardRiskLevel => (v === "medium" || v === "high" ? v : "low");

    const items = Array.isArray(parsed.items)
      ? parsed.items
          .map((i: any) => ({ item_text: strOrNull(i?.item_text), checked: checkedVal(i?.checked) }))
          .filter((i: any): i is { item_text: string; checked: "yes" | "no" | "unclear" } => Boolean(i.item_text))
      : [];

    const hazardLogEntries = Array.isArray(parsed.hazard_log_entries)
      ? parsed.hazard_log_entries
          .map((h: any) => ({ hazard_description: strOrNull(h?.hazard_description), risk_level: riskVal(h?.risk_level) }))
          .filter((h: any): h is { hazard_description: string; risk_level: HazardRiskLevel } =>
            Boolean(h.hazard_description)
          )
      : [];

    return {
      room_name_guess: strOrNull(parsed.room_name_guess),
      check_date: strOrNull(parsed.check_date),
      items,
      hazard_log_entries: hazardLogEntries,
      notes: strOrNull(parsed.notes),
      staff_name_guess: strOrNull(parsed.staff_name_guess),
      completed_time: strOrNull(parsed.completed_time),
      signed_off_guess: typeof parsed.signed_off_guess === "boolean" ? parsed.signed_off_guess : null,
      low_confidence_fields: Array.isArray(parsed.low_confidence_fields)
        ? parsed.low_confidence_fields.filter((f: unknown): f is string => typeof f === "string")
        : [],
    };
  } catch {
    return null;
  }
}

const SUPPORTED_IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

export async function extractHazardCheckFromPhoto(formData: FormData): Promise<ExtractHazardCheckResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      notConfigured: true,
      error:
        "AI photo import isn't connected yet. Add an ANTHROPIC_API_KEY to this app's environment to turn it on — you can still fill this checklist in by hand.",
    };
  }

  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose a photo of the completed, signed checklist first." };
  }
  if (!SUPPORTED_IMAGE_TYPES.has(file.type)) {
    return {
      success: false,
      error:
        "That file type isn't supported for photo import — use a JPG, PNG or WEBP photo. (iPhones set to \"High Efficiency\" save HEIC photos; switch to \"Most Compatible\" in Settings → Camera → Formats, or export as JPG first.)",
    };
  }

  const model = process.env.ANTHROPIC_LEARNING_STORY_MODEL || "claude-sonnet-5";

  try {
    const [arrayBuffer, roomsChecklistText] = await Promise.all([file.arrayBuffer(), buildRoomsChecklistText()]);
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    if (!roomsChecklistText.trim()) {
      return { success: false, error: "No rooms have a hazard checklist template set up yet." };
    }

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model,
        max_tokens: 2048,
        system: buildHazardExtractSystemPrompt(roomsChecklistText),
        messages: [
          {
            role: "user",
            content: [
              { type: "image", source: { type: "base64", media_type: file.type, data: base64 } },
              { type: "text", text: buildHazardExtractSchemaInstruction() },
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

    const draft = text ? parseHazardExtractedJson(text) : null;
    if (!draft) {
      return {
        success: false,
        error: "Couldn't read a usable result from the photo — try a clearer, well-lit photo, or fill the checklist in by hand.",
      };
    }

    return { success: true, draft };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `AI photo import failed: ${err.message}` : "AI photo import failed.",
    };
  }
}

export type CreateHazardCheckFromImportResult =
  | { success: true; id: string }
  | { success: false; error: string };

/** Saves a photo-import draft against the room's week for whichever day the
 * photo was taken (the Monday of `checkDate`) — finding or creating that
 * week's chart first, then folding this one day's data into it:
 *
 * - A brand-new week gets the room's full template snapshotted, ticked
 *   according to this photo's read.
 * - An existing week (started by hand, or by an earlier photo from the same
 *   week) only ever gets items ADDED to — this photo can tick something
 *   that wasn't ticked before, but it never unticks something another day's
 *   check already found checked, since the tick-boxes cover the whole week,
 *   not just one day.
 * - This specific day's sign-off (staff/time/signed-off) is saved onto the
 *   matching hazard_check_daily_signoffs row for that exact date — reusing
 *   the blank row the weekly scaffolding already created if one exists,
 *   or creating it if this week falls outside that scaffolded range.
 *
 * Never creates a duplicate week for the same room, per the "never
 * duplicate" rule used everywhere else in the app. */
export async function createHazardCheckFromImport(input: {
  roomId: string;
  checkDate: string;
  notes: string | null;
  staffId: string | null;
  completedTime: string | null;
  signedOff: boolean;
  checkedItemTexts: string[];
  hazardLogEntries: { hazard_description: string; risk_level: HazardRiskLevel }[];
}): Promise<CreateHazardCheckFromImportResult> {
  if (!input.roomId || !input.checkDate) {
    return { success: false, error: "Choose a room and date." };
  }

  const weekStartDate = mondayOfDateString(input.checkDate);

  const supabase = createClient();
  const userId = await currentUserId();

  const template = await getHazardChecklistTemplate(input.roomId);
  if (template.length === 0) {
    return { success: false, error: "This room doesn't have a hazard checklist set up yet." };
  }

  const checkedSet = new Set(input.checkedItemTexts);

  let checkId: string;
  let isNewCheck = false;

  const existingCheck = await getHazardCheckForRoomAndWeek(input.roomId, weekStartDate);
  if (existingCheck) {
    checkId = existingCheck.id;
  } else {
    const { data: checkRow, error } = await supabase
      .from("hazard_checks")
      .insert({ room_id: input.roomId, week_start_date: weekStartDate, notes: input.notes, created_by: userId } as any)
      .select("id")
      .single<{ id: string }>();

    if (error || !checkRow) {
      // A unique-constraint violation here means someone else's click (or an
      // earlier photo in this same batch) won the race to create this
      // room's week — fold into it instead of erroring out.
      const raceWinner = await getHazardCheckForRoomAndWeek(input.roomId, weekStartDate);
      if (!raceWinner) {
        return { success: false, error: `Could not save this check: ${error?.message ?? "unknown error"}` };
      }
      checkId = raceWinner.id;
    } else {
      checkId = checkRow.id;
      isNewCheck = true;
    }
  }

  if (isNewCheck) {
    const { error: itemsError } = await supabase.from("hazard_check_items").insert(
      template.map((t) => ({
        check_id: checkId,
        category: t.category,
        item_text: t.item_text,
        is_checked: checkedSet.has(t.item_text),
        sort_order: t.sort_order,
      })) as any
    );
    if (itemsError) {
      return { success: false, error: `Could not set up this check's items: ${itemsError.message}` };
    }

    const { error: signoffSeedError } = await supabase.from("hazard_check_daily_signoffs").insert(
      WEEKDAY_OFFSETS.map((d) => ({
        check_id: checkId,
        check_date: addDays(weekStartDate, d),
      })) as any
    );
    if (signoffSeedError) {
      return { success: false, error: `Could not set up this week's sign-off rows: ${signoffSeedError.message}` };
    }
  } else if (checkedSet.size > 0) {
    // Only add newly-ticked items onto the existing week — never uncheck
    // something another day's check already found checked.
    const { data: existingItems } = await supabase
      .from("hazard_check_items")
      .select("id, item_text, is_checked")
      .eq("check_id", checkId);
    const toTick = (existingItems ?? []).filter((i) => !i.is_checked && checkedSet.has(i.item_text));
    if (toTick.length > 0) {
      await Promise.all(
        toTick.map((i) => (supabase.from("hazard_check_items") as any).update({ is_checked: true } as any).eq("id", i.id))
      );
    }

    if (input.notes) {
      const { data: existingCheckRow } = await supabase
        .from("hazard_checks")
        .select("notes")
        .eq("id", checkId)
        .maybeSingle();
      const combinedNotes = existingCheckRow?.notes ? `${existingCheckRow.notes}\n${input.notes}` : input.notes;
      await (supabase.from("hazard_checks") as any).update({ notes: combinedNotes } as any).eq("id", checkId);
    }
  }

  const { data: existingSignoff } = await supabase
    .from("hazard_check_daily_signoffs")
    .select("id, signed_off")
    .eq("check_id", checkId)
    .eq("check_date", input.checkDate)
    .maybeSingle();

  const signoffFields = {
    staff_id: input.staffId,
    completed_time: input.completedTime,
    signed_off: input.signedOff,
  };

  if (existingSignoff) {
    const { error: signoffError } = await (supabase
      .from("hazard_check_daily_signoffs") as any)
      .update({
        ...signoffFields,
        signed_off_at: input.signedOff && !existingSignoff.signed_off ? new Date().toISOString() : input.signedOff ? undefined : null,
      } as any)
      .eq("id", existingSignoff.id);
    if (signoffError) {
      return { success: false, error: `Check was saved, but this day's sign-off could not be saved: ${signoffError.message}` };
    }
  } else {
    const { error: signoffError } = await supabase.from("hazard_check_daily_signoffs").insert({
      check_id: checkId,
      check_date: input.checkDate,
      ...signoffFields,
      signed_off_at: input.signedOff ? new Date().toISOString() : null,
    } as any);
    if (signoffError) {
      return { success: false, error: `Check was saved, but this day's sign-off could not be saved: ${signoffError.message}` };
    }
  }

  const validLogEntries = input.hazardLogEntries.filter((h) => h.hazard_description.trim());
  if (validLogEntries.length > 0) {
    const { error: logError } = await supabase.from("hazard_log_entries").insert(
      validLogEntries.map((h) => ({
        check_id: checkId,
        hazard_description: h.hazard_description.trim(),
        risk_level: h.risk_level,
      })) as any
    );
    if (logError) {
      return { success: false, error: `Check was saved, but a hazard log entry could not be saved: ${logError.message}` };
    }
  }

  revalidatePath(`/records/hazards/${checkId}`);
  revalidatePath("/records/hazards");
  revalidatePath("/records/hazards/register");
  revalidatePath("/records");
  revalidatePath("/dashboard");

  return { success: true, id: checkId };
}

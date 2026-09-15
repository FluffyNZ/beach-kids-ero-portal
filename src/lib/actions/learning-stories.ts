"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import type { LearningStoryBlock } from "@/lib/types";
import type { LearningStoryMediaKind, LearningStoryStatus } from "@/lib/supabase/database.types";

const BUCKET = process.env.NEXT_PUBLIC_LEARNING_STORY_MEDIA_BUCKET || "learning-story-media";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function safeStoragePath(storyId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${storyId}/${randomUUID()}-${safeName}`;
}

async function nextStoryNumber(): Promise<string> {
  const supabase = createClient();
  const { count } = await supabase.from("learning_stories").select("id", { count: "exact", head: true });
  return `LS-${String((count ?? 0) + 1).padStart(4, "0")}`;
}

async function logStatusChange(
  storyId: string,
  fromStatus: LearningStoryStatus | null,
  toStatus: LearningStoryStatus,
  comment: string | null,
  userId: string | null
) {
  const supabase = createClient();
  await supabase.from("learning_story_status_history").insert({
    story_id: storyId,
    from_status: fromStatus,
    to_status: toStatus,
    comment,
    changed_by: userId,
  } as any);
}

function revalidateStory(storyId: string) {
  revalidatePath(`/learning/stories/${storyId}`);
  revalidatePath("/learning/stories");
  revalidatePath("/learning/stories/tracker");
}

// ---------------------------------------------------------------------------
// Create / delete
// ---------------------------------------------------------------------------

export type CreateDraftResult = { success: true; storyId: string } | { success: false; error: string };

/** Creates an empty draft and hands back its id — the editor page itself
 * is where title/date/author/children/content actually get filled in and
 * autosaved, same as clicking "new" anywhere else in this app. */
export async function createDraftStory(): Promise<CreateDraftResult> {
  const supabase = createClient();
  const userId = await currentUserId();
  const storyNumber = await nextStoryNumber();

  const { data, error } = await supabase
    .from("learning_stories")
    .insert({
      story_number: storyNumber,
      title: "",
      story_date: new Date().toISOString().slice(0, 10),
      status: "draft",
      content_blocks: [],
      created_by: userId,
      updated_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (error || !data) {
    return { success: false, error: `Could not create a new story: ${error?.message}` };
  }

  await logStatusChange(data.id, null, "draft", null, userId);
  revalidatePath("/learning/stories");
  return { success: true, storyId: data.id };
}

export async function createDraftStoryAndRedirect() {
  const result = await createDraftStory();
  if (result.success) redirect(`/learning/stories/${result.storyId}`);
}

export type DeleteDraftResult = { success: true } | { success: false; error: string };

/** Only ever deletes a story that's still a draft — once it's been
 * submitted, returned, published or archived it's real documentation and
 * stays on file (use Archive instead). */
export async function deleteDraftStory(storyId: string): Promise<DeleteDraftResult> {
  const supabase = createClient();
  const { data: story } = await supabase.from("learning_stories").select("status").eq("id", storyId).maybeSingle();
  if (!story) return { success: false, error: "Story not found." };
  if (story.status !== "draft") {
    return { success: false, error: "Only a draft that hasn't been submitted yet can be deleted — archive it instead." };
  }

  const { data: media } = await supabase.from("learning_story_media").select("storage_path").eq("story_id", storyId);
  const paths = (media ?? []).map((m) => m.storage_path).filter(Boolean);
  if (paths.length > 0) await supabase.storage.from(BUCKET).remove(paths);

  const { error } = await supabase.from("learning_stories").delete().eq("id", storyId);
  if (error) return { success: false, error: `Could not delete: ${error.message}` };

  revalidatePath("/learning/stories");
  return { success: true };
}

// ---------------------------------------------------------------------------
// Editing — meta, children, tags, content blocks (autosave)
// ---------------------------------------------------------------------------

export async function updateStoryMeta(
  storyId: string,
  fields: { title?: string; story_date?: string; author_staff_id?: string | null }
) {
  const supabase = createClient();
  const userId = await currentUserId();
  await (supabase
    .from("learning_stories") as any)
    .update({ ...fields, updated_by: userId, last_autosaved_at: new Date().toISOString() } as any)
    .eq("id", storyId);
  revalidateStory(storyId);
}

export async function setStoryChildren(storyId: string, childIds: string[]) {
  const supabase = createClient();
  await supabase.from("learning_story_children").delete().eq("story_id", storyId);
  if (childIds.length > 0) {
    await supabase
      .from("learning_story_children")
      .insert(childIds.map((child_id) => ({ story_id: storyId, child_id })) as any);
  }
  const userId = await currentUserId();
  await (supabase.from("learning_stories") as any).update({ updated_by: userId } as any).eq("id", storyId);
  revalidateStory(storyId);
}

export async function setStoryTags(storyId: string, tagIds: string[]) {
  const supabase = createClient();
  await supabase.from("learning_story_tags").delete().eq("story_id", storyId);
  if (tagIds.length > 0) {
    await supabase.from("learning_story_tags").insert(tagIds.map((tag_id) => ({ story_id: storyId, tag_id })) as any);
  }
  revalidateStory(storyId);
}

export type AutosaveResult = { success: true; savedAt: string } | { success: false; error: string };

/** Saves the block content silently and regularly while a teacher is
 * writing. Never changes status — a draft stays a draft until it's
 * explicitly submitted or published. */
export async function autosaveStoryContent(storyId: string, blocks: LearningStoryBlock[]): Promise<AutosaveResult> {
  const supabase = createClient();
  const userId = await currentUserId();
  const savedAt = new Date().toISOString();

  const { error } = await (supabase
    .from("learning_stories") as any)
    .update({ content_blocks: blocks as any, updated_by: userId, last_autosaved_at: savedAt } as any)
    .eq("id", storyId);

  if (error) return { success: false, error: error.message };
  return { success: true, savedAt };
}

export type AutosaveAllResult = { success: true; savedAt: string } | { success: false; error: string };

/** One combined autosave for everything the editor's main form holds
 * (title, date, author, content) — called on a short debounce while
 * writing, so "Last saved [time]" reflects the whole draft, not just the
 * text. Children and tags save immediately on their own when toggled,
 * since those are discrete choices rather than continuous typing. */
export async function autosaveStory(
  storyId: string,
  fields: { title: string; story_date: string; author_staff_id: string | null; content_blocks: LearningStoryBlock[] }
): Promise<AutosaveAllResult> {
  const supabase = createClient();
  const userId = await currentUserId();
  const savedAt = new Date().toISOString();

  const { error } = await (supabase
    .from("learning_stories") as any)
    .update({
      title: fields.title,
      story_date: fields.story_date,
      author_staff_id: fields.author_staff_id,
      content_blocks: fields.content_blocks as any,
      updated_by: userId,
      last_autosaved_at: savedAt,
    } as any)
    .eq("id", storyId);

  if (error) return { success: false, error: error.message };
  return { success: true, savedAt };
}

// ---------------------------------------------------------------------------
// Media
// ---------------------------------------------------------------------------

export type UploadMediaResult =
  | { success: true; mediaId: string; url: string | null }
  | { success: false; error: string };

function kindFromMime(mime: string): LearningStoryMediaKind {
  if (mime.startsWith("image/")) return "image";
  if (mime.startsWith("video/")) return "video";
  return "pdf";
}

export async function uploadStoryMedia(storyId: string, formData: FormData): Promise<UploadMediaResult> {
  const file = formData.get("file") as File | null;
  const caption = String(formData.get("caption") ?? "").trim() || null;
  if (!file || file.size === 0) {
    return { success: false, error: "Choose a file to upload." };
  }

  const supabase = createClient();
  const userId = await currentUserId();
  const storagePath = safeStoragePath(storyId, file);
  const arrayBuffer = await file.arrayBuffer();
  const kind = kindFromMime(file.type || "");

  const { error: uploadError } = await supabase.storage.from(BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type || "application/octet-stream",
    upsert: false,
  });
  if (uploadError) return { success: false, error: `Upload failed: ${uploadError.message}` };

  const { data: existing } = await supabase
    .from("learning_story_media")
    .select("sort_order")
    .eq("story_id", storyId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (existing?.sort_order ?? -1) + 1;

  const { data: mediaRow, error: insertError } = await supabase
    .from("learning_story_media")
    .insert({
      story_id: storyId,
      storage_path: storagePath,
      original_filename: file.name,
      mime_type: file.type || null,
      file_size_bytes: file.size,
      kind,
      caption,
      sort_order: nextSortOrder,
      uploaded_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (insertError || !mediaRow) {
    await supabase.storage.from(BUCKET).remove([storagePath]);
    return { success: false, error: `Could not save the upload: ${insertError?.message}` };
  }

  const { data: signed } = await supabase.storage.from(BUCKET).createSignedUrl(storagePath, 60 * 60);

  revalidateStory(storyId);
  return { success: true, mediaId: mediaRow.id, url: signed?.signedUrl ?? null };
}

export async function updateMediaCaption(mediaId: string, storyId: string, caption: string) {
  const supabase = createClient();
  await (supabase
    .from("learning_story_media") as any)
    .update({ caption: caption || null } as any)
    .eq("id", mediaId);
  revalidateStory(storyId);
}

export async function reorderStoryMedia(storyId: string, orderedMediaIds: string[]) {
  const supabase = createClient();
  await Promise.all(
    orderedMediaIds.map((id, index) =>
      (supabase
        .from("learning_story_media") as any)
        .update({ sort_order: index } as any)
        .eq("id", id)
    )
  );
  revalidateStory(storyId);
}

export type RemoveMediaResult = { success: true } | { success: false; error: string };

/** Removes an uploaded file and also scrubs any content block that
 * referenced it, so the layout never ends up pointing at a photo that no
 * longer exists. */
export async function removeStoryMedia(mediaId: string, storyId: string): Promise<RemoveMediaResult> {
  const supabase = createClient();
  const { data: media } = await supabase
    .from("learning_story_media")
    .select("storage_path")
    .eq("id", mediaId)
    .maybeSingle();

  const { error } = await supabase.from("learning_story_media").delete().eq("id", mediaId);
  if (error) return { success: false, error: error.message };

  if (media?.storage_path) {
    await supabase.storage.from(BUCKET).remove([media.storage_path]);
  }

  const { data: story } = await supabase.from("learning_stories").select("content_blocks").eq("id", storyId).maybeSingle();
  if (story) {
    const blocks = ((story.content_blocks as LearningStoryBlock[] | null) ?? []).map((b) => {
      if (b.type === "image" && b.mediaId === mediaId) return { ...b, mediaId: null };
      if (b.type === "video" && b.mediaId === mediaId) return { ...b, mediaId: null };
      if (b.type === "pdf" && b.mediaId === mediaId) return { ...b, mediaId: null };
      if (b.type === "image_pair") {
        return { ...b, mediaIds: b.mediaIds.map((id) => (id === mediaId ? null : id)) };
      }
      return b;
    });
    await (supabase.from("learning_stories") as any).update({ content_blocks: blocks as any } as any).eq("id", storyId);
  }

  revalidateStory(storyId);
  return { success: true };
}

// ---------------------------------------------------------------------------
// Status workflow
// ---------------------------------------------------------------------------

export type StatusActionResult = { success: true; published: boolean } | { success: false; error: string };

/** The single "next step" action from a draft or a returned-for-editing
 * story. Behaves as either "Publish" or "Submit for Approval" depending on
 * the author's own can_publish_learning_stories setting — the UI decides
 * which label to show, this decides what actually happens. */
export async function submitStory(storyId: string): Promise<StatusActionResult> {
  const supabase = createClient();
  const userId = await currentUserId();

  const { data: story } = await supabase
    .from("learning_stories")
    .select("status, author_staff_id, title")
    .eq("id", storyId)
    .maybeSingle();
  if (!story) return { success: false, error: "Story not found." };
  if (!story.author_staff_id) {
    return { success: false, error: "Choose an author before publishing or submitting this story." };
  }

  const { data: author } = await supabase
    .from("staff")
    .select("can_publish_learning_stories")
    .eq("id", story.author_staff_id)
    .maybeSingle();

  const canPublishDirectly = Boolean(author?.can_publish_learning_stories);
  const now = new Date().toISOString();
  const fromStatus = story.status as LearningStoryStatus;

  if (canPublishDirectly) {
    await (supabase
      .from("learning_stories") as any)
      .update({
        status: "published",
        requires_approval: false,
        published_at: now,
        updated_by: userId,
      } as any)
      .eq("id", storyId);
    await logStatusChange(storyId, fromStatus, "published", null, userId);
    revalidateStory(storyId);
    revalidatePath("/dashboard");
    return { success: true, published: true };
  }

  await (supabase
    .from("learning_stories") as any)
    .update({
      status: "awaiting_approval",
      requires_approval: true,
      submitted_by: userId,
      submitted_at: now,
      updated_by: userId,
    } as any)
    .eq("id", storyId);
  await logStatusChange(storyId, fromStatus, "awaiting_approval", null, userId);
  revalidateStory(storyId);
  return { success: true, published: false };
}

export async function approveAndPublishStory(storyId: string): Promise<StatusActionResult> {
  const supabase = createClient();
  const userId = await currentUserId();
  const now = new Date().toISOString();

  const { data: story } = await supabase.from("learning_stories").select("status").eq("id", storyId).maybeSingle();
  if (!story) return { success: false, error: "Story not found." };

  await (supabase
    .from("learning_stories") as any)
    .update({
      status: "published",
      reviewed_by: userId,
      approved_at: now,
      published_at: now,
      updated_by: userId,
    } as any)
    .eq("id", storyId);

  await logStatusChange(storyId, story.status as LearningStoryStatus, "published", null, userId);
  revalidateStory(storyId);
  revalidatePath("/dashboard");
  return { success: true, published: true };
}

export type ReturnForChangesResult = { success: true } | { success: false; error: string };

export async function returnStoryForChanges(storyId: string, comment: string): Promise<ReturnForChangesResult> {
  const supabase = createClient();
  const userId = await currentUserId();

  const { data: story } = await supabase.from("learning_stories").select("status").eq("id", storyId).maybeSingle();
  if (!story) return { success: false, error: "Story not found." };

  await (supabase
    .from("learning_stories") as any)
    .update({
      status: "returned_for_editing",
      reviewed_by: userId,
      review_comments: comment || null,
      updated_by: userId,
    } as any)
    .eq("id", storyId);

  await logStatusChange(storyId, story.status as LearningStoryStatus, "returned_for_editing", comment || null, userId);
  revalidateStory(storyId);
  return { success: true };
}

export async function archiveStory(storyId: string) {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data: story } = await supabase.from("learning_stories").select("status").eq("id", storyId).maybeSingle();
  if (!story) return;

  await (supabase.from("learning_stories") as any).update({ status: "archived", updated_by: userId } as any).eq("id", storyId);
  await logStatusChange(storyId, story.status as LearningStoryStatus, "archived", null, userId);
  revalidateStory(storyId);
}

// ---------------------------------------------------------------------------
// AI Story Assist — supports the educator, never replaces or auto-publishes.
//
// Requires an ANTHROPIC_API_KEY in the environment. Beach Kids doesn't have
// any AI integration set up yet, so until that key is added this returns a
// clear "not connected" result rather than a fake response — nothing here
// pretends to work when it can't actually call a model.
// ---------------------------------------------------------------------------

export type AssistKind =
  | "create_draft"
  | "improve_writing"
  | "check_spelling"
  | "make_natural"
  | "suggest_te_whariki"
  | "suggest_tags"
  | "suggest_next_steps";

export type AssistResult =
  | { success: true; text: string }
  | { success: false; error: string; notConfigured?: boolean };

const ASSIST_INSTRUCTIONS: Record<AssistKind, string> = {
  create_draft:
    "Turn the educator's rough notes into a warm, natural first draft of a New Zealand ECE learning story. Use only what's in the notes — do not add actions, quotes, emotions or observations that weren't supplied.",
  improve_writing:
    "Improve the flow and warmth of this learning story text without changing any facts, actions, quotes or details it describes.",
  check_spelling:
    "Check and correct spelling and grammar only. Do not change the meaning, facts, tone or wording choices beyond fixing errors.",
  make_natural:
    "Rewrite this so it reads naturally and personally, in the educator's own voice, avoiding generic or AI-sounding phrasing. Do not add or remove any facts.",
  suggest_te_whariki:
    "Suggest which Te Whāriki strands this story's content connects to, based only on what's described. List each suggested strand with a one-sentence reason. These are suggestions only — an educator must confirm them.",
  suggest_tags:
    "Suggest relevant learning tags for this story based only on what's described. List each suggestion with a one-sentence reason. These are suggestions only — an educator must confirm them.",
  suggest_next_steps:
    "Suggest 2-3 possible next steps to extend this child's learning, grounded only in what this story actually describes. Frame them as options for the educator to consider, not instructions.",
};

const SYSTEM_PROMPT = `You are helping a New Zealand early childhood education (ECE) kaiako write a Learning Story for a young child. You support their professional judgement — you never replace it.

Strict rules:
- Never invent anything the educator did not supply: no actions, quotes, emotions, observations, parent comments, developmental claims, or events beyond what's given.
- If the notes are too thin to write something specific, say so plainly rather than filling the gap with generic or invented detail.
- Write warmly, naturally, professionally — New Zealand ECE style, child-centred and strengths-based. Avoid academic or generic AI-sounding phrasing.
- Preserve the educator's own voice and word choices wherever the input gives you one to preserve.
- Everything you produce is a draft suggestion for the educator to review, edit and confirm — never a finished, approved document.`;

export async function assistWithStory(kind: AssistKind, input: string): Promise<AssistResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return {
      success: false,
      notConfigured: true,
      error:
        "AI Story Assist isn't connected yet. Add an ANTHROPIC_API_KEY to this app's environment to turn it on — nothing here runs without one.",
    };
  }

  if (!input.trim()) {
    return { success: false, error: "Add some rough notes or text first." };
  }

  // claude-3-5-sonnet-latest was retired — claude-sonnet-5 is the current
  // Sonnet model as of September 2026.
  const model = process.env.ANTHROPIC_LEARNING_STORY_MODEL || "claude-sonnet-5";

  try {
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
        system: SYSTEM_PROMPT,
        messages: [
          {
            role: "user",
            content: `${ASSIST_INSTRUCTIONS[kind]}\n\n---\n${input}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { success: false, error: `AI Story Assist request failed (${response.status}). ${detail.slice(0, 200)}` };
    }

    const data = await response.json();
    const text = Array.isArray(data?.content)
      ? data.content.map((block: any) => (block?.type === "text" ? block.text : "")).join("\n").trim()
      : "";

    if (!text) return { success: false, error: "AI Story Assist returned an empty response — try again." };
    return { success: true, text };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? `AI Story Assist failed: ${err.message}` : "AI Story Assist failed.",
    };
  }
}

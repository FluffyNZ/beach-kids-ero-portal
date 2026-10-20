"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { validateMediaForPlatforms } from "@/lib/marketing/media-validation";
import { encryptToken, decryptToken } from "@/lib/marketing/token-crypto";
import { publishMarketingPost } from "@/lib/cron/marketing-publisher";
import { searchChildrenForMarketingTagging } from "@/lib/data/marketing";
import type { MarketingPlatform, MarketingMediaConsentSource } from "@/lib/types";
import type { MarketingOauthPendingPage } from "@/lib/supabase/database.types";

const MEDIA_BUCKET = process.env.NEXT_PUBLIC_MARKETING_MEDIA_BUCKET || "marketing-media";
const ALLOWED_MEDIA_TYPES = new Set(["image/png", "image/jpeg", "image/jpg", "image/webp", "video/mp4", "video/quicktime"]);

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

function revalidateMarketingPaths(postId?: string) {
  revalidatePath("/marketing");
  revalidatePath("/marketing/calendar");
  revalidatePath("/marketing/drafts");
  revalidatePath("/marketing/published");
  revalidatePath("/marketing/connections");
  if (postId) revalidatePath(`/marketing/posts/${postId}`);
}

// ---------------------------------------------------------------------------
// Posts
// ---------------------------------------------------------------------------

export async function createDraftPost(input: { caption?: string; platforms?: MarketingPlatform[]; suggestionKey?: string }): Promise<{ id: string }> {
  const supabase = createClient();
  const userId = await currentUserId();
  const { data, error } = await supabase
    .from("marketing_posts")
    .insert({
      caption: input.caption ?? "",
      platforms: input.platforms ?? ["facebook", "instagram"],
      suggestion_key: input.suggestionKey ?? null,
      created_by: userId,
    } as any)
    .select("id")
    .single<{ id: string }>();
  if (error || !data) throw new Error(`Could not create draft: ${error?.message}`);
  revalidateMarketingPaths();
  return { id: data.id };
}

export async function updatePostContent(
  postId: string,
  fields: {
    caption?: string;
    caption_facebook?: string | null;
    caption_instagram?: string | null;
    platforms?: MarketingPlatform[];
  }
) {
  const supabase = createClient();
  const { error } = await (supabase.from("marketing_posts") as any).update(fields as any).eq("id", postId);
  if (error) throw new Error(`Could not save post: ${error.message}`);
  revalidateMarketingPaths(postId);
}

export async function deleteDraftPost(postId: string) {
  const supabase = createClient();
  const { data: post } = await supabase.from("marketing_posts").select("status").eq("id", postId).maybeSingle();
  if (post && post.status !== "draft" && post.status !== "failed") {
    throw new Error("Only drafts (or failed posts) can be deleted — cancel a scheduled post first.");
  }
  const { data: mediaRows } = await supabase.from("marketing_post_media").select("storage_path").eq("post_id", postId);
  if (mediaRows && mediaRows.length > 0) {
    await supabase.storage.from(MEDIA_BUCKET).remove(mediaRows.map((m) => m.storage_path));
  }
  const { error } = await supabase.from("marketing_posts").delete().eq("id", postId);
  if (error) throw new Error(`Could not delete post: ${error.message}`);
  revalidateMarketingPaths();
}

// ---------------------------------------------------------------------------
// Media upload / tagging / photo-permission review
// ---------------------------------------------------------------------------

/** Thin "use server" wrapper so the Create/Edit post screen's child-tagging
 * search box (a Client Component) can call the data layer without
 * importing a server-only module directly into the client bundle. */
export async function searchMarketingChildren(query: string) {
  return searchChildrenForMarketingTagging(query);
}

function safeMediaPath(postId: string, file: File) {
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  return `${postId}/${randomUUID()}-${safeName}`;
}

export type UploadPostMediaResult =
  | { success: true; mediaId: string; url: string; warnings: string[] }
  | { success: false; errors: string[] };

export async function uploadPostMedia(postId: string, formData: FormData, platforms: MarketingPlatform[]): Promise<UploadPostMediaResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { success: false, errors: ["Choose a photo or video to upload."] };
  if (!ALLOWED_MEDIA_TYPES.has(file.type)) {
    return { success: false, errors: [`Unsupported file type (${file.type || "unknown"}). Use JPEG, PNG, WEBP, MP4 or MOV.`] };
  }

  const mediaType: "image" | "video" = file.type.startsWith("video/") ? "video" : "image";
  const { errors, warnings } = validateMediaForPlatforms(
    { mediaType, mimeType: file.type, fileSize: file.size, durationSeconds: null },
    platforms
  );
  if (errors.length > 0) return { success: false, errors };

  const supabase = createClient();
  const storagePath = safeMediaPath(postId, file);
  const arrayBuffer = await file.arrayBuffer();
  const { error: uploadError } = await supabase.storage.from(MEDIA_BUCKET).upload(storagePath, arrayBuffer, {
    contentType: file.type,
    upsert: false,
  });
  if (uploadError) return { success: false, errors: [`Upload failed: ${uploadError.message}`] };

  const { data: existing } = await supabase
    .from("marketing_post_media")
    .select("sort_order")
    .eq("post_id", postId)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextSortOrder = (existing?.sort_order ?? -1) + 1;

  const { data: mediaRow, error: insertError } = await supabase
    .from("marketing_post_media")
    .insert({
      post_id: postId,
      storage_path: storagePath,
      media_type: mediaType,
      mime_type: file.type,
      file_size: file.size,
      sort_order: nextSortOrder,
    } as any)
    .select("id")
    .single<{ id: string }>();

  if (insertError || !mediaRow) {
    await supabase.storage.from(MEDIA_BUCKET).remove([storagePath]);
    return { success: false, errors: [`Could not save the upload: ${insertError?.message}`] };
  }

  // A new photo/video resets the review flag — it hasn't been checked yet.
  await (supabase.from("marketing_posts") as any).update({ photo_permission_reviewed: false } as any).eq("id", postId);

  revalidateMarketingPaths(postId);
  const { data: publicUrl } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath);
  return { success: true, mediaId: mediaRow.id, url: publicUrl.publicUrl, warnings };
}

export async function removePostMedia(mediaId: string, postId: string) {
  const supabase = createClient();
  const { data: media } = await supabase.from("marketing_post_media").select("storage_path").eq("id", mediaId).maybeSingle();
  if (media) await supabase.storage.from(MEDIA_BUCKET).remove([media.storage_path]);
  await supabase.from("marketing_post_media").delete().eq("id", mediaId);
  revalidateMarketingPaths(postId);
}

/** Tags a real child as appearing in this media, snapshotting their
 * current marketing_photo_consent as `consent_source` — never assumes
 * permission. consent_confirmed only becomes true via
 * setMediaChildConsentConfirmed, below, a separate explicit step. */
export async function tagChildOnMedia(mediaId: string, postId: string, childId: string) {
  const supabase = createClient();
  const { data: child } = await supabase.from("children").select("marketing_photo_consent").eq("id", childId).maybeSingle();
  const consentSource: MarketingMediaConsentSource =
    child?.marketing_photo_consent === true ? "on_file" : child?.marketing_photo_consent === false ? "declined" : "unknown";

  const { error } = await supabase
    .from("marketing_post_media_children")
    .upsert({ media_id: mediaId, child_id: childId, consent_source: consentSource, consent_confirmed: false } as any, {
      onConflict: "media_id,child_id",
    });
  if (error) throw new Error(`Could not tag child: ${error.message}`);
  await (supabase.from("marketing_posts") as any).update({ photo_permission_reviewed: false } as any).eq("id", postId);
  revalidateMarketingPaths(postId);
}

export async function untagChildFromMedia(mediaId: string, childId: string, postId: string) {
  const supabase = createClient();
  await supabase.from("marketing_post_media_children").delete().eq("media_id", mediaId).eq("child_id", childId);
  revalidateMarketingPaths(postId);
}

/** The actual, explicit "yes, we've checked, this child can be in this
 * post" tick — set this true only after really checking, per the brief.
 * Even when consent_source was already 'on_file' at tag time, this still
 * has to be ticked separately here; nothing becomes true on its own. */
export async function setMediaChildConsentConfirmed(mediaId: string, childId: string, postId: string, confirmed: boolean) {
  const supabase = createClient();
  const { error } = await supabase
    .from("marketing_post_media_children")
    .update({ consent_confirmed: confirmed } as any)
    .eq("media_id", mediaId)
    .eq("child_id", childId);
  if (error) throw new Error(`Could not save permission review: ${error.message}`);
  revalidateMarketingPaths(postId);
}

/** The Create/Edit post screen's "Photo permissions checked" tick (see the
 * reference mockup). Refuses to set true while any tagged child on this
 * post still has consent_confirmed = false, so this can never be ticked
 * past a real unresolved tag. */
export async function setPhotoPermissionReviewed(postId: string, reviewed: boolean) {
  const supabase = createClient();
  if (reviewed) {
    const { data: media } = await supabase.from("marketing_post_media").select("id").eq("post_id", postId);
    const mediaIds = (media ?? []).map((m) => m.id);
    if (mediaIds.length > 0) {
      const { data: tags } = await supabase.from("marketing_post_media_children").select("consent_confirmed").in("media_id", mediaIds);
      const unresolved = (tags ?? []).some((t) => !t.consent_confirmed);
      if (unresolved) throw new Error("Every child tagged in this post's photos/video needs permission confirmed first.");
    }
  }
  const { error } = await (supabase.from("marketing_posts") as any).update({ photo_permission_reviewed: reviewed } as any).eq("id", postId);
  if (error) throw new Error(error.message);
  revalidateMarketingPaths(postId);
}

// ---------------------------------------------------------------------------
// Scheduling / publishing
// ---------------------------------------------------------------------------

async function assertCanSchedule(postId: string) {
  const supabase = createClient();
  const { data: post } = await supabase.from("marketing_posts").select("*").eq("id", postId).maybeSingle();
  if (!post) throw new Error("Post not found.");
  if (!post.caption?.trim() && !post.caption_facebook?.trim() && !post.caption_instagram?.trim()) {
    throw new Error("Add a caption before scheduling.");
  }
  if (!post.photo_permission_reviewed) {
    const { data: media } = await supabase.from("marketing_post_media").select("id").eq("post_id", postId);
    const mediaIds = (media ?? []).map((m: any) => m.id);
    if (mediaIds.length > 0) {
      const { data: tags } = await supabase.from("marketing_post_media_children").select("id").in("media_id", mediaIds);
      if ((tags ?? []).length > 0) {
        throw new Error('Tick "Photo permissions checked" before scheduling — this post has a tagged child.');
      }
    }
  }
  return post;
}

async function ensurePlatformResultRows(postId: string, platforms: MarketingPlatform[]) {
  const supabase = createClient();
  for (const platform of platforms) {
    await supabase.from("marketing_post_platform_results").upsert({ post_id: postId, platform, status: "pending" } as any, { onConflict: "post_id,platform" });
  }
}

export async function schedulePost(postId: string, scheduledAtIso: string) {
  const post = await assertCanSchedule(postId);
  const supabase = createClient();
  const { error } = await (supabase.from("marketing_posts") as any)
    .update({ status: "scheduled", scheduled_at: scheduledAtIso } as any)
    .eq("id", postId);
  if (error) throw new Error(error.message);
  await ensurePlatformResultRows(postId, post.platforms);
  revalidateMarketingPaths(postId);
}

/** "Publish now" — schedules for the current instant and immediately
 * attempts the publish in the same request, rather than waiting for the
 * next Vercel Cron tick, so the person doing it gets to see the result. */
export async function publishPostNow(postId: string) {
  await schedulePost(postId, new Date().toISOString());
  await publishMarketingPost(postId);
  revalidateMarketingPaths(postId);
}

export async function cancelScheduledPost(postId: string) {
  const supabase = createClient();
  const { data: post } = await supabase.from("marketing_posts").select("status").eq("id", postId).maybeSingle();
  if (!post || post.status !== "scheduled") throw new Error("Only a still-scheduled post can be cancelled.");
  const { error } = await (supabase.from("marketing_posts") as any).update({ status: "draft", scheduled_at: null } as any).eq("id", postId);
  if (error) throw new Error(error.message);
  await supabase.from("marketing_post_platform_results").delete().eq("post_id", postId);
  revalidateMarketingPaths(postId);
}

/** Retries ONLY the given platform — per the brief, "if one platform
 * succeeds and the other fails, retry only the failed platform." */
export async function retryFailedPlatform(postId: string, platform: MarketingPlatform) {
  const supabase = createClient();
  await (supabase.from("marketing_post_platform_results") as any)
    .update({ status: "pending", error_message: null } as any)
    .eq("post_id", postId)
    .eq("platform", platform);
  await publishMarketingPost(postId, [platform]);
  revalidateMarketingPaths(postId);
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export async function dismissSuggestion(key: string) {
  const supabase = createClient();
  const userId = await currentUserId();
  await supabase.from("marketing_dismissed_suggestions").upsert({ suggestion_key: key, dismissed_by: userId } as any);
  revalidateMarketingPaths();
}

export async function createDraftFromSuggestion(key: string, suggestedCaption: string): Promise<{ id: string }> {
  return createDraftPost({ caption: suggestedCaption, suggestionKey: key });
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function saveMarketingSettings(fields: {
  monthly_goal?: number;
  weekly_goal_enabled?: boolean;
  weekly_goal?: number | null;
  christmas_closure_start?: string | null;
  christmas_reopening_date?: string | null;
}) {
  const supabase = createClient();
  const userId = await currentUserId();
  const { error } = await (supabase.from("marketing_settings") as any)
    .update({ ...fields, updated_by: userId } as any)
    .eq("id", "default");
  if (error) throw new Error(error.message);
  revalidateMarketingPaths();
}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

/** Called from the Connections page's "pick a Page" step after the Meta
 * OAuth redirect lands (see app/api/marketing/meta/callback). Stores an
 * ENCRYPTED Page access token; if that Page has a linked Instagram
 * Business account, connects that too using the same Page token (Meta
 * publishes to the linked Instagram account using the Page's own token
 * under this login flow). */
export async function selectMetaPage(state: string, pageId: string) {
  const supabase = createClient();
  const userId = await currentUserId();

  const { data: pending } = await supabase.from("marketing_oauth_pending").select("*").eq("state", state).maybeSingle();
  if (!pending) throw new Error("This connection attempt has expired — please reconnect.");
  const pages = (pending.pages ?? []) as MarketingOauthPendingPage[];
  const chosen = pages.find((p) => p.id === pageId);
  if (!chosen) throw new Error("That Page wasn't found in this connection attempt.");

  // The pending row stores each page's own access token, encrypted (see
  // the callback route), so this step never needs to re-call Meta.
  const pageAccessToken = decryptToken(chosen.access_token_encrypted);
  if (!pageAccessToken) throw new Error("Missing Page access token — please reconnect.");

  await supabase.from("marketing_connections").upsert(
    {
      platform: "facebook_page",
      external_account_id: chosen.id,
      external_account_name: chosen.name,
      access_token_encrypted: encryptToken(pageAccessToken),
      long_lived_token_obtained_at: new Date().toISOString(),
      status: "connected",
      last_verified_at: new Date().toISOString(),
      last_error: null,
      connected_by: userId,
    } as any,
    { onConflict: "platform" }
  );

  if (chosen.instagram_business_account_id) {
    await supabase.from("marketing_connections").upsert(
      {
        platform: "instagram_business",
        external_account_id: chosen.instagram_business_account_id,
        external_account_name: chosen.instagram_business_account_name,
        access_token_encrypted: encryptToken(pageAccessToken),
        long_lived_token_obtained_at: new Date().toISOString(),
        status: "connected",
        last_verified_at: new Date().toISOString(),
        last_error: null,
        connected_by: userId,
      } as any,
      { onConflict: "platform" }
    );
  }

  await supabase.from("marketing_oauth_pending").delete().eq("state", state);
  revalidateMarketingPaths();
}

export async function disconnectMetaConnection(platform: "facebook_page" | "instagram_business") {
  const supabase = createClient();
  const { error } = await (supabase.from("marketing_connections") as any)
    .update({ status: "disconnected", access_token_encrypted: null, last_error: null } as any)
    .eq("platform", platform);
  if (error) throw new Error(error.message);
  revalidateMarketingPaths();
}

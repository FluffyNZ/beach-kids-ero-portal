import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptToken } from "@/lib/marketing/token-crypto";
import {
  publishFacebookPhoto,
  publishFacebookVideo,
  publishFacebookFeedPost,
  createInstagramMediaContainer,
  waitForInstagramContainerReady,
  publishInstagramContainer,
  getInstagramMediaPermalink,
  facebookPostPermalink,
  debugToken,
  MetaGraphError,
} from "@/lib/marketing/meta-graph";
import type { MarketingPlatform } from "@/lib/types";
import type { MarketingConnectionRow, MarketingPostMediaRow, MarketingPostRow } from "@/lib/supabase/database.types";

const MEDIA_BUCKET = process.env.NEXT_PUBLIC_MARKETING_MEDIA_BUCKET || "marketing-media";

// Known, deliberate v1 limitation: only the FIRST photo/video on a post is
// actually published — Facebook multi-photo albums and Instagram carousels
// (up to 10 items, per Meta's docs) are real documented features but
// weren't built here given the size of everything else in this feature.
// The Create/Edit post UI only allows one attachment per post for exactly
// this reason, so nothing is silently dropped. See the explanation given
// to Ethan alongside this feature for the follow-up work this implies.
function primaryMedia(media: MarketingPostMediaRow[]): MarketingPostMediaRow | null {
  return media.length > 0 ? media[0] : null;
}

async function getConnection(supabase: ReturnType<typeof createAdminClient>, platform: "facebook_page" | "instagram_business"): Promise<MarketingConnectionRow | null> {
  const { data } = await supabase.from("marketing_connections").select("*").eq("platform", platform).maybeSingle();
  return (data as MarketingConnectionRow | null) ?? null;
}

async function resolveToken(
  supabase: ReturnType<typeof createAdminClient>,
  connection: MarketingConnectionRow
): Promise<string> {
  if (connection.status !== "connected" || !connection.access_token_encrypted) {
    throw new MetaGraphError(`${connection.platform === "facebook_page" ? "Facebook" : "Instagram"} isn't connected — connect it on the Marketing > Connections page.`);
  }
  const token = decryptToken(connection.access_token_encrypted);
  let debugResult: { is_valid: boolean } | null = null;
  try {
    debugResult = await debugToken(token);
  } catch {
    // The debug_token check itself failed (e.g. META_APP_ID/SECRET not set
    // yet) — don't block on this secondary check; the real publish call
    // below will surface a clear error if the token is genuinely bad.
  }
  if (debugResult && !debugResult.is_valid) {
    await supabase.from("marketing_connections").update({ status: "expired", last_error: "Token is no longer valid." } as any).eq("id", connection.id);
    throw new MetaGraphError(`The ${connection.platform === "facebook_page" ? "Facebook" : "Instagram"} connection has expired — reconnect it on the Connections page.`);
  }
  return token;
}

async function publishToFacebook(
  supabase: ReturnType<typeof createAdminClient>,
  post: MarketingPostRow,
  media: MarketingPostMediaRow | null,
  connection: MarketingConnectionRow
): Promise<{ externalPostId: string; externalPermalink: string | null }> {
  const token = await resolveToken(supabase, connection);
  const caption = post.caption_facebook ?? post.caption;
  const pageId = connection.external_account_id!;

  if (!media) {
    const result = await publishFacebookFeedPost(pageId, token, caption);
    return { externalPostId: result.id, externalPermalink: facebookPostPermalink(pageId, result.id) };
  }
  const { data: publicUrl } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(media.storage_path);
  if (media.media_type === "image") {
    const result = await publishFacebookPhoto(pageId, token, publicUrl.publicUrl, caption);
    const postId = result.post_id ?? result.id;
    return { externalPostId: postId, externalPermalink: facebookPostPermalink(pageId, postId) };
  }
  const result = await publishFacebookVideo(pageId, token, publicUrl.publicUrl, caption);
  return { externalPostId: result.id, externalPermalink: facebookPostPermalink(pageId, result.id) };
}

async function publishToInstagram(
  supabase: ReturnType<typeof createAdminClient>,
  post: MarketingPostRow,
  media: MarketingPostMediaRow | null,
  connection: MarketingConnectionRow
): Promise<{ externalPostId: string; externalPermalink: string | null }> {
  if (!media) throw new MetaGraphError("Instagram needs a photo or video — this post has none.");
  const token = await resolveToken(supabase, connection);
  const igUserId = connection.external_account_id!;
  const caption = post.caption_instagram ?? post.caption;
  const { data: publicUrl } = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(media.storage_path);

  const container =
    media.media_type === "image"
      ? await createInstagramMediaContainer(igUserId, token, { type: "image", imageUrl: publicUrl.publicUrl }, caption)
      : await createInstagramMediaContainer(igUserId, token, { type: "video", videoUrl: publicUrl.publicUrl }, caption);

  await waitForInstagramContainerReady(container.id, token);
  const published = await publishInstagramContainer(igUserId, token, container.id);
  const permalink = await getInstagramMediaPermalink(published.id, token);
  return { externalPostId: published.id, externalPermalink: permalink };
}

/** Publishes one post's remaining due platforms. Called both by the cron
 * route (no session — see app/api/cron/marketing-publish) and directly by
 * the "Publish now" / "Retry" actions for immediate feedback — always
 * through the service-role client, since a cron-triggered call has no
 * logged-in session to authenticate ordinary RLS-protected writes as. */
export async function publishMarketingPost(postId: string, onlyPlatforms?: MarketingPlatform[]): Promise<void> {
  const supabase = createAdminClient();

  const { data: postRow } = await supabase.from("marketing_posts").select("*").eq("id", postId).maybeSingle();
  if (!postRow) return;
  const post = postRow as MarketingPostRow;

  const { data: mediaRows } = await supabase.from("marketing_post_media").select("*").eq("post_id", postId).order("sort_order", { ascending: true });
  const media = primaryMedia((mediaRows ?? []) as MarketingPostMediaRow[]);

  const { data: resultRows } = await supabase.from("marketing_post_platform_results").select("*").eq("post_id", postId);
  const platformsToProcess = (onlyPlatforms ?? post.platforms).filter((platform) => {
    const existing = (resultRows ?? []).find((r: any) => r.platform === platform);
    return !existing || existing.status === "pending";
  });
  if (platformsToProcess.length === 0) return;

  await supabase.from("marketing_posts").update({ status: "publishing" } as any).eq("id", postId);

  for (const platform of platformsToProcess) {
    const existingResult = (resultRows ?? []).find((r: any) => r.platform === platform);
    await supabase
      .from("marketing_post_platform_results")
      .update({
        status: "publishing",
        last_attempted_at: new Date().toISOString(),
        attempt_count: (existingResult?.attempt_count ?? 0) + 1,
      } as any)
      .eq("post_id", postId)
      .eq("platform", platform);

    try {
      const connection = await getConnection(supabase, platform === "facebook" ? "facebook_page" : "instagram_business");
      if (!connection) throw new MetaGraphError(`${platform === "facebook" ? "Facebook" : "Instagram"} has never been connected — connect it on the Connections page.`);

      const { externalPostId, externalPermalink } =
        platform === "facebook" ? await publishToFacebook(supabase, post, media, connection) : await publishToInstagram(supabase, post, media, connection);

      await supabase
        .from("marketing_post_platform_results")
        .update({
          status: "published",
          external_post_id: externalPostId,
          external_permalink: externalPermalink,
          published_at: new Date().toISOString(),
          error_message: null,
        } as any)
        .eq("post_id", postId)
        .eq("platform", platform);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Unknown error while publishing.";
      await supabase
        .from("marketing_post_platform_results")
        .update({ status: "failed", error_message: message } as any)
        .eq("post_id", postId)
        .eq("platform", platform);
    }
  }

  const { data: finalResults } = await supabase.from("marketing_post_platform_results").select("status").eq("post_id", postId);
  const statuses = (finalResults ?? []).map((r: any) => r.status);
  const allPublished = statuses.length > 0 && statuses.every((s) => s === "published" || s === "skipped");
  const anyFailed = statuses.some((s) => s === "failed");
  const anyPending = statuses.some((s) => s === "pending" || s === "publishing");

  if (allPublished) {
    await supabase.from("marketing_posts").update({ status: "published", published_at: new Date().toISOString() } as any).eq("id", postId);
  } else if (!anyPending && anyFailed) {
    await supabase.from("marketing_posts").update({ status: "failed" } as any).eq("id", postId);
  }
  // else: a platform is still genuinely pending (shouldn't normally happen
  // within one call, since every requested platform is awaited above) —
  // left as "publishing" for the next cron tick to pick back up.
}

export type ProcessDueResult = {
  processed: number;
  succeeded: number;
  failed: number;
};

/** Finds every post whose scheduled time has arrived and publishes it —
 * what the Vercel Cron job calls. Facebook has native scheduling
 * (published=false + scheduled_publish_time on /feed) but this app
 * deliberately does NOT use it, for one reason: Instagram has no native
 * scheduling at all (confirmed — Meta's own guidance is to hold the
 * content and fire the publish call yourself), so a single, one-code-path
 * scheduler here is simpler and more honest about status than splitting
 * Facebook onto Meta's native scheduler and Instagram onto this one. */
export async function processDueMarketingPosts(): Promise<ProcessDueResult> {
  const supabase = createAdminClient();
  const { data: dueRows } = await supabase
    .from("marketing_posts")
    .select("id")
    .eq("status", "scheduled")
    .lte("scheduled_at", new Date().toISOString());

  const result: ProcessDueResult = { processed: 0, succeeded: 0, failed: 0 };
  for (const row of dueRows ?? []) {
    result.processed += 1;
    try {
      await publishMarketingPost(row.id);
      const { data: post } = await supabase.from("marketing_posts").select("status").eq("id", row.id).maybeSingle();
      if (post?.status === "published") result.succeeded += 1;
      else if (post?.status === "failed") result.failed += 1;
    } catch {
      result.failed += 1;
    }
  }
  return result;
}

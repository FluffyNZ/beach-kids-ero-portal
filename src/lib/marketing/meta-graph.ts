import "server-only";

// Real Meta Graph API client — Facebook Login for Business OAuth, Page +
// Instagram Business publishing, and token-health checks. Current as of
// the research done for this feature (October 2026, Graph API v26.0); Meta
// changes this API over time, so GRAPH_API_VERSION and the few explicitly
// flagged uncertainties below should be re-checked against the live Graph
// API Explorer / this app's own Permissions dashboard before relying on
// them in production — see the write-up given to Ethan alongside this
// feature for the full list.
//
// Requires three environment variables (Vercel project settings), none of
// which exist yet until Ethan creates a Meta app:
//   META_APP_ID             — the Meta app's App ID
//   META_APP_SECRET         — the Meta app's App Secret (never exposed client-side)
//   NEXT_PUBLIC_SITE_URL    — this site's own base URL, e.g.
//                             https://beach-kids-ero-portal.vercel.app
//                             (used to build the OAuth redirect URI)

export const GRAPH_API_VERSION = "v26.0";
const GRAPH_BASE = `https://graph.facebook.com/${GRAPH_API_VERSION}`;

// Per the live research done for this feature: Meta's own docs currently
// use TWO different spellings for the Instagram publish permission in two
// different places (`instagram_content_publish` vs
// `instagram_content_publishing`). Verify the exact string in this app's
// own Meta dashboard (App Review > Permissions and Features) before first
// connecting — if Meta rejects the scope string below, that's almost
// certainly why, and this constant is the only place it needs changing.
const META_SCOPES = [
  "pages_show_list",
  "pages_read_engagement",
  "pages_manage_posts",
  "instagram_basic",
  "instagram_content_publish",
  "business_management",
];

export class MetaGraphError extends Error {
  constructor(
    message: string,
    public readonly graphError?: unknown
  ) {
    super(message);
    this.name = "MetaGraphError";
  }
}

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) throw new MetaGraphError(`${name} is not set — Meta integration is not configured yet.`);
  return value;
}

function redirectUri(): string {
  const site = requireEnv("NEXT_PUBLIC_SITE_URL").replace(/\/$/, "");
  return `${site}/api/marketing/meta/callback`;
}

async function graphFetch<T>(path: string, params: Record<string, string | number | undefined>, init?: RequestInit): Promise<T> {
  const url = new URL(`${GRAPH_BASE}${path}`);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) url.searchParams.set(key, String(value));
  }
  const res = await fetch(url.toString(), init);
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    const message = body?.error?.message || `Meta Graph API request failed (HTTP ${res.status}).`;
    throw new MetaGraphError(message, body?.error);
  }
  return body as T;
}

// ---------------------------------------------------------------------------
// OAuth — Facebook Login for Business
// ---------------------------------------------------------------------------

export function buildMetaLoginUrl(state: string): string {
  const appId = requireEnv("META_APP_ID");
  const url = new URL("https://www.facebook.com/v26.0/dialog/oauth");
  url.searchParams.set("client_id", appId);
  url.searchParams.set("redirect_uri", redirectUri());
  url.searchParams.set("state", state);
  url.searchParams.set("scope", META_SCOPES.join(","));
  url.searchParams.set("response_type", "code");
  return url.toString();
}

export async function exchangeCodeForShortLivedToken(code: string): Promise<{ access_token: string; expires_in?: number }> {
  const appId = requireEnv("META_APP_ID");
  const appSecret = requireEnv("META_APP_SECRET");
  return graphFetch("/oauth/access_token", {
    client_id: appId,
    client_secret: appSecret,
    redirect_uri: redirectUri(),
    code,
  });
}

export async function exchangeForLongLivedToken(shortLivedToken: string): Promise<{ access_token: string; expires_in?: number }> {
  const appId = requireEnv("META_APP_ID");
  const appSecret = requireEnv("META_APP_SECRET");
  return graphFetch("/oauth/access_token", {
    grant_type: "fb_exchange_token",
    client_id: appId,
    client_secret: appSecret,
    fb_exchange_token: shortLivedToken,
  });
}

export type MetaPageOption = {
  id: string;
  name: string;
  access_token: string;
  instagram_business_account_id: string | null;
  instagram_business_account_name: string | null;
};

/** Every Facebook Page this user administers, each with its own Page
 * Access Token (from /me/accounts) and — if linked — its Instagram
 * Business Account id/name (Instagram access always goes through the
 * linked Page, never a separate IG login, per Meta's current docs). */
export async function fetchPagesForUser(userAccessToken: string): Promise<MetaPageOption[]> {
  const accounts = await graphFetch<{ data: { id: string; name: string; access_token: string }[] }>(
    "/me/accounts",
    { access_token: userAccessToken, fields: "id,name,access_token" }
  );

  const pages: MetaPageOption[] = [];
  for (const page of accounts.data ?? []) {
    let igId: string | null = null;
    let igName: string | null = null;
    try {
      const details = await graphFetch<{ instagram_business_account?: { id: string; username?: string; name?: string } }>(
        `/${page.id}`,
        { fields: "instagram_business_account{id,username,name}", access_token: page.access_token }
      );
      igId = details.instagram_business_account?.id ?? null;
      igName = details.instagram_business_account?.username ?? details.instagram_business_account?.name ?? null;
    } catch {
      // No linked Instagram account, or this Page token can't see it yet —
      // leave null; the Connections page shows Instagram as "Not linked"
      // for this Page rather than failing the whole connect flow.
    }
    pages.push({ id: page.id, name: page.name, access_token: page.access_token, instagram_business_account_id: igId, instagram_business_account_name: igName });
  }
  return pages;
}

/** GET /debug_token — used to detect an expired/revoked token proactively
 * (Connections page "Verify" action, and before every publish attempt)
 * rather than only finding out when a publish call itself fails. */
export async function debugToken(inputToken: string): Promise<{ is_valid: boolean; expires_at?: number; scopes?: string[]; error?: unknown }> {
  const appId = requireEnv("META_APP_ID");
  const appSecret = requireEnv("META_APP_SECRET");
  const appAccessToken = `${appId}|${appSecret}`;
  const result = await graphFetch<{ data: { is_valid: boolean; expires_at?: number; scopes?: string[]; error?: unknown } }>(
    "/debug_token",
    { input_token: inputToken, access_token: appAccessToken }
  );
  return result.data;
}

// ---------------------------------------------------------------------------
// Facebook Page publishing
// ---------------------------------------------------------------------------

/** A text-only Page post (no media attached) via the standard /feed
 * endpoint. Instagram has no equivalent — a post with no media targeting
 * Instagram is rejected before this is ever reached (see
 * publishToInstagram in lib/cron/marketing-publisher.ts). */
export async function publishFacebookFeedPost(pageId: string, pageAccessToken: string, message: string): Promise<{ id: string }> {
  return graphFetch(`/${pageId}/feed`, {}, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ message, access_token: pageAccessToken }),
  });
}

export async function publishFacebookPhoto(pageId: string, pageAccessToken: string, imageUrl: string, caption: string): Promise<{ id: string; post_id?: string }> {
  return graphFetch(`/${pageId}/photos`, {}, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ url: imageUrl, caption, access_token: pageAccessToken }),
  });
}

/** Publishes via the simpler documented `file_url` parameter (Meta fetches
 * the video itself from our public marketing-media bucket). Meta's current
 * Video API guide documents a full Resumable Upload flow as the primary
 * path for larger files — if this fails for a particular video (e.g. too
 * large), that resumable chunked-upload flow is the next thing to add; it
 * wasn't built here since it couldn't be live-tested without a connected
 * Meta app. Posted to graph-video.facebook.com per Meta's own convention
 * for video endpoints. */
export async function publishFacebookVideo(pageId: string, pageAccessToken: string, videoUrl: string, caption: string): Promise<{ id: string }> {
  const url = new URL(`https://graph-video.facebook.com/${GRAPH_API_VERSION}/${pageId}/videos`);
  const res = await fetch(url.toString(), {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ file_url: videoUrl, description: caption, access_token: pageAccessToken }),
  });
  const body = await res.json().catch(() => null);
  if (!res.ok || body?.error) {
    throw new MetaGraphError(body?.error?.message || `Facebook video publish failed (HTTP ${res.status}).`, body?.error);
  }
  return body;
}

export function facebookPostPermalink(pageId: string, postId: string): string {
  // post_id from /photos is "{page-id}_{story-id}"; a plain Page post id
  // resolves the same way via graph.facebook.com's permalink redirect.
  const storyId = postId.includes("_") ? postId.split("_")[1] : postId;
  return `https://www.facebook.com/${pageId}/posts/${storyId}`;
}

// ---------------------------------------------------------------------------
// Instagram publishing — two-step container -> publish, per Meta's current
// Content Publishing API. No native scheduling exists for Instagram at
// all (confirmed in research) — every IG publish from this app happens at
// the moment the Vercel Cron job decides to fire it, never scheduled
// Meta-side.
// ---------------------------------------------------------------------------

export async function createInstagramMediaContainer(
  igUserId: string,
  accessToken: string,
  media: { type: "image"; imageUrl: string } | { type: "video" | "reels"; videoUrl: string },
  caption: string
): Promise<{ id: string }> {
  const params: Record<string, string> =
    media.type === "image"
      ? { image_url: media.imageUrl, caption }
      : { video_url: media.videoUrl, caption, media_type: media.type === "reels" ? "REELS" : "VIDEO" };

  return graphFetch(`/${igUserId}/media`, {}, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ...params, access_token: accessToken }),
  });
}

export async function getInstagramContainerStatus(containerId: string, accessToken: string): Promise<{ status_code: string }> {
  return graphFetch(`/${containerId}`, { fields: "status_code", access_token: accessToken });
}

export async function publishInstagramContainer(igUserId: string, accessToken: string, creationId: string): Promise<{ id: string }> {
  return graphFetch(`/${igUserId}/media_publish`, {}, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ creation_id: creationId, access_token: accessToken }),
  });
}

/** Polls a freshly-created container until it's FINISHED (ready to
 * publish) or ERROR/EXPIRED. Meta's own guidance: check at most once a
 * minute for up to ~5 minutes — this app's cron job runs far more often
 * than that, so a short in-process poll with a few-second gap is used
 * instead; a container that's still IN_PROGRESS when this gives up is left
 * for the NEXT cron run to find and retry, rather than blocking it. */
export async function waitForInstagramContainerReady(
  containerId: string,
  accessToken: string,
  { maxAttempts = 6, delayMs = 4000 }: { maxAttempts?: number; delayMs?: number } = {}
): Promise<"FINISHED"> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const { status_code } = await getInstagramContainerStatus(containerId, accessToken);
    if (status_code === "FINISHED") return "FINISHED";
    if (status_code === "ERROR" || status_code === "EXPIRED") {
      throw new MetaGraphError(`Instagram media container ${status_code.toLowerCase()} before it could be published.`);
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  throw new MetaGraphError("Instagram media container was still processing after the maximum wait — will retry on the next scheduled run.");
}

export function instagramPostPermalink(username: string | null, mediaId: string): string {
  // Best-effort permalink; Meta also returns a real permalink via a
  // separate /{media-id}?fields=permalink call once published, which the
  // publisher (lib/cron/marketing-publisher.ts) fetches for the real link
  // shown on the Published tab rather than relying on this guess alone.
  return username ? `https://www.instagram.com/${username}/` : `https://www.instagram.com/p/${mediaId}/`;
}

export async function getInstagramMediaPermalink(mediaId: string, accessToken: string): Promise<string | null> {
  try {
    const result = await graphFetch<{ permalink?: string }>(`/${mediaId}`, { fields: "permalink", access_token: accessToken });
    return result.permalink ?? null;
  } catch {
    return null;
  }
}

/** GET /{ig-user-id}/content_publishing_limit — checked before a batch of
 * scheduled publishes runs, since Meta's own docs currently disagree with
 * themselves on the actual number (50 vs 100/24h for carousels) — reading
 * this live avoids hardcoding either figure. */
export async function getInstagramPublishingLimit(igUserId: string, accessToken: string): Promise<{ quota_usage: number; config: { quota_total: number; quota_duration: number } } | null> {
  try {
    const result = await graphFetch<{ data: { quota_usage: number; config: { quota_total: number; quota_duration: number } }[] }>(
      `/${igUserId}/content_publishing_limit`,
      { fields: "quota_usage,config", access_token: accessToken }
    );
    return result.data?.[0] ?? null;
  } catch {
    return null;
  }
}

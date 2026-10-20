import "server-only";
import { createClient } from "@/lib/supabase/server";
import { addDays, addMonths, mondayOfDateString } from "@/lib/utils";
import { getNzPublicHolidaysInRange } from "@/lib/nz-public-holidays";
import { todayIso, nzWallTimeToUtcIso, utcIsoToNzWallTime } from "@/lib/marketing/timezone";
import { getStaffList } from "@/lib/data/staff";
import { buildMarketingSuggestions } from "@/lib/marketing/post-suggestions";
import type {
  MarketingPlatform,
  MarketingPost,
  MarketingPostMedia,
  MarketingPostMediaChildTag,
  MarketingPostPlatformResult,
  MarketingPostStatus,
  MarketingConnection,
  MarketingSettings,
  MarketingOverviewStats,
  MarketingSuggestion,
  MarketingCalendarWeek,
} from "@/lib/types";
import type {
  MarketingPostRow,
  MarketingPostMediaRow,
  MarketingPostMediaChildRow,
  MarketingPostPlatformResultRow,
  MarketingConnectionRow,
  MarketingSettingsRow,
} from "@/lib/supabase/database.types";

const MEDIA_BUCKET = process.env.NEXT_PUBLIC_MARKETING_MEDIA_BUCKET || "marketing-media";

function mediaPublicUrl(supabase: ReturnType<typeof createClient>, storagePath: string): string {
  return supabase.storage.from(MEDIA_BUCKET).getPublicUrl(storagePath).data.publicUrl;
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

function mapSettings(row: MarketingSettingsRow): MarketingSettings {
  return {
    monthlyGoal: row.monthly_goal,
    weeklyGoalEnabled: row.weekly_goal_enabled,
    weeklyGoal: row.weekly_goal,
    christmasClosureStart: row.christmas_closure_start,
    christmasReopeningDate: row.christmas_reopening_date,
    updatedAt: row.updated_at,
  };
}

export async function getMarketingSettings(): Promise<MarketingSettings> {
  const supabase = createClient();
  const { data } = await supabase.from("marketing_settings").select("*").eq("id", "default").maybeSingle();
  if (!data) {
    // Shouldn't happen (migration seeds the row), but fall back sensibly
    // rather than throwing on a page load.
    return { monthlyGoal: 1, weeklyGoalEnabled: false, weeklyGoal: null, christmasClosureStart: null, christmasReopeningDate: null, updatedAt: new Date().toISOString() };
  }
  return mapSettings(data as MarketingSettingsRow);
}

// ---------------------------------------------------------------------------
// Posts — shared mapping from rows (+ their media/children/platform rows)
// to the app-level MarketingPost shape.
// ---------------------------------------------------------------------------

async function mapPosts(postRows: MarketingPostRow[]): Promise<MarketingPost[]> {
  if (postRows.length === 0) return [];
  const supabase = createClient();
  const postIds = postRows.map((p) => p.id);

  const [{ data: mediaRows }, { data: resultRows }] = await Promise.all([
    supabase.from("marketing_post_media").select("*").in("post_id", postIds).order("sort_order", { ascending: true }),
    supabase.from("marketing_post_platform_results").select("*").in("post_id", postIds),
  ]);

  const media = (mediaRows ?? []) as MarketingPostMediaRow[];
  const mediaIds = media.map((m) => m.id);

  const { data: childTagRows } = mediaIds.length > 0
    ? await supabase.from("marketing_post_media_children").select("*").in("media_id", mediaIds)
    : { data: [] as MarketingPostMediaChildRow[] };

  const taggedChildIds = Array.from(
    new Set((childTagRows ?? []).map((t) => t.child_id).filter((v): v is string => Boolean(v)))
  );
  const { data: childRows } = taggedChildIds.length > 0
    ? await supabase.from("children").select("id, full_name").in("id", taggedChildIds)
    : { data: [] as { id: string; full_name: string }[] };
  const childNameById = new Map((childRows ?? []).map((c) => [c.id, c.full_name]));

  const tagsByMediaId = new Map<string, MarketingPostMediaChildTag[]>();
  for (const tag of (childTagRows ?? []) as MarketingPostMediaChildRow[]) {
    const list = tagsByMediaId.get(tag.media_id) ?? [];
    list.push({
      childId: tag.child_id,
      childName: tag.child_id ? childNameById.get(tag.child_id) ?? null : null,
      consentConfirmed: tag.consent_confirmed,
      consentSource: tag.consent_source,
    });
    tagsByMediaId.set(tag.media_id, list);
  }

  const mediaByPostId = new Map<string, MarketingPostMedia[]>();
  for (const m of media) {
    const list = mediaByPostId.get(m.post_id) ?? [];
    list.push({
      id: m.id,
      url: mediaPublicUrl(supabase, m.storage_path),
      mediaType: m.media_type,
      mimeType: m.mime_type,
      fileSize: m.file_size,
      width: m.width,
      height: m.height,
      durationSeconds: m.duration_seconds,
      sortOrder: m.sort_order,
      altText: m.alt_text,
      taggedChildren: tagsByMediaId.get(m.id) ?? [],
    });
    mediaByPostId.set(m.post_id, list);
  }

  const resultsByPostId = new Map<string, MarketingPostPlatformResult[]>();
  for (const r of (resultRows ?? []) as MarketingPostPlatformResultRow[]) {
    const list = resultsByPostId.get(r.post_id) ?? [];
    list.push({
      platform: r.platform,
      status: r.status,
      externalPostId: r.external_post_id,
      externalPermalink: r.external_permalink,
      errorMessage: r.error_message,
      attemptCount: r.attempt_count,
      lastAttemptedAt: r.last_attempted_at,
      publishedAt: r.published_at,
    });
    resultsByPostId.set(r.post_id, list);
  }

  return postRows.map((p) => {
    const postMedia = mediaByPostId.get(p.id) ?? [];
    const needsReview = postMedia.some((m) => m.taggedChildren.some((t) => !t.consentConfirmed));
    return {
      id: p.id,
      caption: p.caption,
      captionFacebook: p.caption_facebook,
      captionInstagram: p.caption_instagram,
      platforms: p.platforms,
      status: p.status,
      scheduledAt: p.scheduled_at,
      publishedAt: p.published_at,
      suggestionKey: p.suggestion_key,
      photoPermissionReviewed: p.photo_permission_reviewed,
      media: postMedia,
      platformResults: resultsByPostId.get(p.id) ?? [],
      createdAt: p.created_at,
      updatedAt: p.updated_at,
      needsPhotoPermissionReview: needsReview || (postMedia.length > 0 && !p.photo_permission_reviewed && postMedia.some((m) => m.taggedChildren.length > 0)),
    };
  });
}

export async function getMarketingPosts(status?: MarketingPostStatus | MarketingPostStatus[]): Promise<MarketingPost[]> {
  const supabase = createClient();
  let query = supabase.from("marketing_posts").select("*").order("created_at", { ascending: false });
  if (status) {
    query = Array.isArray(status) ? query.in("status", status) : query.eq("status", status);
  }
  const { data } = await query;
  const posts = await mapPosts((data ?? []) as MarketingPostRow[]);
  // Scheduled posts read more naturally soonest-first; everything else
  // (drafts, published, failed) stays most-recently-touched-first.
  if (!status || status === "scheduled" || (Array.isArray(status) && status.includes("scheduled"))) {
    posts.sort((a, b) => {
      if (a.status === "scheduled" && b.status === "scheduled") {
        return (a.scheduledAt ?? "").localeCompare(b.scheduledAt ?? "");
      }
      return 0;
    });
  }
  return posts;
}

export async function getMarketingPostById(id: string): Promise<MarketingPost | null> {
  const supabase = createClient();
  const { data } = await supabase.from("marketing_posts").select("*").eq("id", id).maybeSingle();
  if (!data) return null;
  const [mapped] = await mapPosts([data as MarketingPostRow]);
  return mapped ?? null;
}

// ---------------------------------------------------------------------------
// Overview stats
// ---------------------------------------------------------------------------

export async function getMarketingOverviewStats(): Promise<MarketingOverviewStats> {
  const supabase = createClient();
  const settings = await getMarketingSettings();
  const monthStartDate = `${todayIso().slice(0, 7)}-01`;
  const monthEndDate = addMonths(monthStartDate, 1);
  // NZ-calendar-date boundaries converted to real UTC instants before
  // comparing against the timestamptz columns — comparing the plain date
  // strings directly would implicitly anchor to UTC midnight, not NZ
  // midnight, and misattribute up to half a day's posts at the boundary.
  const monthStart = nzWallTimeToUtcIso(monthStartDate, "00:00");
  const monthEnd = nzWallTimeToUtcIso(monthEndDate, "00:00");

  const [{ count: draftCount }, { count: scheduledCount }, { data: publishedThisMonthRows }, { data: scheduledThisMonthRows }, { data: failedResultRows }] =
    await Promise.all([
      supabase.from("marketing_posts").select("id", { count: "exact", head: true }).eq("status", "draft"),
      supabase.from("marketing_posts").select("id", { count: "exact", head: true }).eq("status", "scheduled"),
      supabase.from("marketing_posts").select("id").eq("status", "published").gte("published_at", monthStart).lt("published_at", monthEnd),
      supabase.from("marketing_posts").select("id").eq("status", "scheduled").gte("scheduled_at", monthStart).lt("scheduled_at", monthEnd),
      supabase.from("marketing_post_platform_results").select("id").eq("status", "failed"),
    ]);

  return {
    monthlyGoal: settings.monthlyGoal,
    weeklyGoalEnabled: settings.weeklyGoalEnabled,
    weeklyGoal: settings.weeklyGoal,
    publishedThisMonth: publishedThisMonthRows?.length ?? 0,
    scheduledThisMonth: scheduledThisMonthRows?.length ?? 0,
    draftCount: draftCount ?? 0,
    scheduledCount: scheduledCount ?? 0,
    failedCount: failedResultRows?.length ?? 0,
  };
}

// ---------------------------------------------------------------------------
// Suggestions
// ---------------------------------------------------------------------------

export async function getMarketingSuggestions(): Promise<MarketingSuggestion[]> {
  const supabase = createClient();
  const [settings, { data: draftedRows }, { data: dismissedRows }, staff] = await Promise.all([
    getMarketingSettings(),
    supabase.from("marketing_posts").select("suggestion_key").not("suggestion_key", "is", null),
    supabase.from("marketing_dismissed_suggestions").select("suggestion_key"),
    getStaffList({ status: "active" }),
  ]);

  // Rotate which staff member gets featured by picking the one whose
  // record was updated longest ago among active staff with a role set —
  // simple, real, and never repeats the same person every month by luck
  // of alphabetical order alone.
  const candidates = staff.filter((s) => s.role);
  const featured = candidates.length > 0
    ? [...candidates].sort((a, b) => a.updated_at.localeCompare(b.updated_at))[0]
    : null;

  return buildMarketingSuggestions({
    settings,
    alreadyDraftedKeys: new Set((draftedRows ?? []).map((r) => r.suggestion_key).filter((v): v is string => Boolean(v))),
    dismissedKeys: new Set((dismissedRows ?? []).map((r) => r.suggestion_key)),
    featuredStaff: featured ? { name: featured.full_name, role: featured.role } : null,
  });
}

// ---------------------------------------------------------------------------
// Calendar
// ---------------------------------------------------------------------------

export async function getMarketingCalendarMonth(monthKey: string): Promise<MarketingCalendarWeek[]> {
  const monthStart = `${monthKey}-01`;
  const monthEnd = addMonths(monthStart, 1);
  const gridStart = mondayOfDateString(monthStart);

  const weekStarts: string[] = [];
  let w = gridStart;
  while (w < monthEnd) {
    weekStarts.push(w);
    w = addDays(w, 7);
  }
  const gridEnd = addDays(weekStarts[weekStarts.length - 1], 7);

  // Same NZ-midnight-to-UTC conversion as getMarketingOverviewStats — the
  // grid's own date strings stay NZ-calendar dates for display/grouping,
  // but the DB query needs real UTC instants to compare against the
  // timestamptz columns correctly.
  const gridStartUtc = nzWallTimeToUtcIso(gridStart, "00:00");
  const gridEndUtc = nzWallTimeToUtcIso(gridEnd, "00:00");

  const [posts, holidays] = await Promise.all([
    (async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("marketing_posts")
        .select("*")
        .or(`and(scheduled_at.gte.${gridStartUtc},scheduled_at.lt.${gridEndUtc}),and(published_at.gte.${gridStartUtc},published_at.lt.${gridEndUtc})`);
      return mapPosts((data ?? []) as MarketingPostRow[]);
    })(),
    Promise.resolve(getNzPublicHolidaysInRange(gridStart, gridEnd)),
  ]);

  const holidayByDate = new Map(holidays.map((h) => [h.date, h]));
  const postsByDate = new Map<string, MarketingPost[]>();
  for (const post of posts) {
    const instant = post.scheduledAt ?? post.publishedAt;
    if (!instant) continue;
    const nzDate = utcIsoToNzWallTime(instant).date; // grid is laid out in NZ calendar dates
    const list = postsByDate.get(nzDate) ?? [];
    list.push(post);
    postsByDate.set(nzDate, list);
  }

  return weekStarts.map((weekStartDate) => ({
    weekStartDate,
    days: Array.from({ length: 7 }, (_, i) => {
      const date = addDays(weekStartDate, i);
      return {
        date,
        inMonth: date >= monthStart && date < monthEnd,
        posts: postsByDate.get(date) ?? [],
        publicHoliday: holidayByDate.get(date) ?? null,
      };
    }),
  }));
}

// ---------------------------------------------------------------------------
// Connections — NEVER selects access_token_encrypted into the returned
// shape; see src/lib/marketing/token-crypto.ts for where the real token is
// decrypted (only inside the publish/cron path, never for display).
// ---------------------------------------------------------------------------

function mapConnection(row: MarketingConnectionRow): MarketingConnection {
  return {
    platform: row.platform,
    externalAccountId: row.external_account_id,
    externalAccountName: row.external_account_name,
    status: row.status,
    scopes: row.scopes,
    tokenExpiresAt: row.token_expires_at,
    connectedAt: row.long_lived_token_obtained_at,
    lastVerifiedAt: row.last_verified_at,
    lastError: row.last_error,
  };
}

/** Reads back a pending OAuth hand-off row for the Connections page's
 * "pick a Page" step — never exposes the encrypted tokens to the
 * component, only each Page's id/name/Instagram-link for display. */
export async function getMarketingOauthPendingPages(state: string): Promise<{ id: string; name: string; instagramAccountName: string | null }[] | null> {
  const supabase = createClient();
  const { data } = await supabase.from("marketing_oauth_pending").select("pages, expires_at").eq("state", state).maybeSingle();
  if (!data) return null;
  if (new Date(data.expires_at).getTime() < Date.now()) return null;
  return ((data.pages ?? []) as { id: string; name: string; instagram_business_account_name: string | null }[]).map((p) => ({
    id: p.id,
    name: p.name,
    instagramAccountName: p.instagram_business_account_name,
  }));
}

export async function getMarketingConnections(): Promise<MarketingConnection[]> {
  const supabase = createClient();
  const { data } = await supabase
    .from("marketing_connections")
    .select("id, platform, external_account_id, external_account_name, token_expires_at, long_lived_token_obtained_at, scopes, status, last_verified_at, last_error, connected_by, created_at, updated_at");
  return ((data ?? []) as Omit<MarketingConnectionRow, "access_token_encrypted">[]).map((row) => mapConnection(row as MarketingConnectionRow));
}

// ---------------------------------------------------------------------------
// Child tagging search — reuses the same children table the rest of the
// app already uses; no separate "marketing contacts" list.
// ---------------------------------------------------------------------------

export async function searchChildrenForMarketingTagging(query: string): Promise<{ id: string; full_name: string; marketing_photo_consent: boolean | null }[]> {
  const supabase = createClient();
  let q = supabase.from("children").select("id, full_name, marketing_photo_consent, status").eq("status", "active").order("full_name", { ascending: true }).limit(25);
  if (query.trim()) q = q.ilike("full_name", `%${query.trim()}%`);
  const { data } = await q;
  return (data ?? []).map((r: any) => ({ id: r.id, full_name: r.full_name, marketing_photo_consent: r.marketing_photo_consent }));
}

export function platformsLabel(platforms: MarketingPlatform[]): string {
  if (platforms.length === 2) return "Facebook & Instagram";
  if (platforms[0] === "facebook") return "Facebook";
  if (platforms[0] === "instagram") return "Instagram";
  return "—";
}

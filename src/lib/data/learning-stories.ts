import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getRosterRooms } from "@/lib/data/roster";
import { getChildrenList } from "@/lib/data/children";
import { getProfilesMap } from "@/lib/data/profiles";
import { getAllLearningTagsFlat } from "@/lib/data/learning-tags";
import { addMonths } from "@/lib/utils";
import type {
  LearningStory,
  LearningStoryBlock,
  LearningStoryChildRef,
  LearningStoryListItem,
  LearningStoryMedia,
  LearningStoryStatusHistoryEntry,
  LearningStoriesOverview,
  MonthlyTrackerRoomRow,
  LearningTag,
} from "@/lib/types";
import type { LearningStoryStatus } from "@/lib/supabase/database.types";

const BUCKET = process.env.NEXT_PUBLIC_LEARNING_STORY_MEDIA_BUCKET || "learning-story-media";
const SIGNED_URL_TTL_SECONDS = 60 * 60; // 1 hour — media tends to stay on-screen a while

/** Current month as "YYYY-MM", in the server's local calendar date. */
export function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(monthKey: string): string {
  const [y, m] = monthKey.split("-").map(Number);
  const d = new Date(Date.UTC(y, (m ?? 1) - 1, 1));
  return new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric", timeZone: "UTC" }).format(d);
}

function monthRange(monthKey: string): { start: string; end: string } {
  const start = `${monthKey}-01`;
  return { start, end: addMonths(start, 1) };
}

type StaffNameRow = { id: string; full_name: string };

async function getStaffNameMap(): Promise<Map<string, string>> {
  const supabase = createClient();
  const { data } = await supabase.from("staff").select("id, full_name");
  return new Map(((data ?? []) as StaffNameRow[]).map((s) => [s.id, s.full_name]));
}

async function signMediaUrls(
  media: Array<{ id: string; storage_path: string }>
): Promise<Map<string, string>> {
  const supabase = createClient();
  const urlByMediaId = new Map<string, string>();
  if (media.length === 0) return urlByMediaId;
  const { data: signed } = await supabase.storage
    .from(BUCKET)
    .createSignedUrls(
      media.map((m) => m.storage_path),
      SIGNED_URL_TTL_SECONDS
    );
  const urlByPath = new Map<string, string>();
  (signed ?? []).forEach((s) => {
    if (s.signedUrl && !s.error) urlByPath.set(s.path ?? "", s.signedUrl);
  });
  media.forEach((m) => {
    const url = urlByPath.get(m.storage_path);
    if (url) urlByMediaId.set(m.id, url);
  });
  return urlByMediaId;
}

export type LearningStoryFilters = {
  roomId?: string;
  childId?: string;
  authorStaffId?: string;
  month?: string; // "YYYY-MM"
  status?: LearningStoryStatus;
  tagId?: string;
  search?: string;
};

/** The recent-stories list on the Learning Stories home page, and the
 * backing data for Search. Server-side filters (status/author/month) keep
 * the initial fetch small; room/child/tag/search filters are applied in
 * memory afterwards since Beach Kids' story volume is small enough that
 * this is simpler and more flexible than deep SQL joins for every
 * combination — including full-text search across the actual story
 * content, which a column filter can't do against JSON blocks anyway. */
export async function getLearningStoriesList(filters?: LearningStoryFilters): Promise<LearningStoryListItem[]> {
  const supabase = createClient();

  let query = supabase.from("learning_stories").select("*").order("story_date", { ascending: false });
  if (filters?.status) query = query.eq("status", filters.status);
  if (filters?.authorStaffId) query = query.eq("author_staff_id", filters.authorStaffId);
  if (filters?.month) {
    const { start, end } = monthRange(filters.month);
    query = query.gte("story_date", start).lt("story_date", end);
  }

  const { data: rows } = await query;
  if (!rows || rows.length === 0) return [];

  const storyIds = rows.map((r) => r.id);

  const [{ data: childLinks }, { data: tagLinks }, { data: mediaRows }, staffNames, allChildren, allTags] =
    await Promise.all([
      supabase.from("learning_story_children").select("story_id, child_id").in("story_id", storyIds),
      supabase.from("learning_story_tags").select("story_id, tag_id").in("story_id", storyIds),
      supabase
        .from("learning_story_media")
        .select("id, story_id, storage_path, kind, sort_order")
        .in("story_id", storyIds)
        .order("sort_order", { ascending: true }),
      getStaffNameMap(),
      getChildrenList(),
      getAllLearningTagsFlat(),
    ]);

  const childById = new Map(allChildren.map((c) => [c.id, c]));
  const tagById = new Map(allTags.map((t) => [t.id, t]));

  const childIdsByStory = new Map<string, string[]>();
  (childLinks ?? []).forEach((l) => {
    const list = childIdsByStory.get(l.story_id) ?? [];
    list.push(l.child_id);
    childIdsByStory.set(l.story_id, list);
  });

  const tagIdsByStory = new Map<string, string[]>();
  (tagLinks ?? []).forEach((l) => {
    const list = tagIdsByStory.get(l.story_id) ?? [];
    list.push(l.tag_id);
    tagIdsByStory.set(l.story_id, list);
  });

  // First image (lowest sort_order) per story stands in as the cover.
  const coverPathByStory = new Map<string, string>();
  (mediaRows ?? []).forEach((m) => {
    if (m.kind !== "image") return;
    if (!coverPathByStory.has(m.story_id)) coverPathByStory.set(m.story_id, m.storage_path);
  });
  const coverUrlByPath = await signMediaUrls(
    Array.from(coverPathByStory.entries()).map(([story_id, storage_path]) => ({ id: story_id, storage_path }))
  );

  let items: LearningStoryListItem[] = rows.map((r) => {
    const childRefs: LearningStoryChildRef[] = (childIdsByStory.get(r.id) ?? [])
      .map((cid) => childById.get(cid))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .map((c) => ({ id: c.id, full_name: c.full_name, room_name: c.room_name, room_color: c.room_color, photo_url: c.photo_url }));

    const tags: LearningTag[] = (tagIdsByStory.get(r.id) ?? [])
      .map((tid) => tagById.get(tid))
      .filter((t): t is LearningTag => Boolean(t));

    return {
      id: r.id,
      story_number: r.story_number,
      title: r.title,
      story_date: r.story_date,
      status: r.status,
      author_name: r.author_staff_id ? staffNames.get(r.author_staff_id) ?? null : null,
      children: childRefs,
      coverMediaUrl: coverUrlByPath.get(r.id) ?? null,
      tags,
    };
  });

  if (filters?.roomId) {
    items = items.filter((s) => s.children.some((c) => allChildren.find((ac) => ac.id === c.id)?.room_id === filters.roomId));
  }
  if (filters?.childId) {
    items = items.filter((s) => s.children.some((c) => c.id === filters.childId));
  }
  if (filters?.tagId) {
    items = items.filter((s) => s.tags.some((t) => t.id === filters.tagId));
  }
  if (filters?.search && filters.search.trim().length > 0) {
    const term = filters.search.trim().toLowerCase();
    const storyContentById = new Map(rows.map((r) => [r.id, JSON.stringify(r.content_blocks ?? "").toLowerCase()]));
    items = items.filter((s) => {
      const haystacks = [
        s.title,
        s.story_number,
        s.author_name ?? "",
        ...s.children.map((c) => c.full_name),
        ...s.tags.map((t) => `${t.name} ${t.maori_name ?? ""}`),
        storyContentById.get(s.id) ?? "",
      ];
      return haystacks.some((h) => h.toLowerCase().includes(term));
    });
  }

  return items;
}

export async function getLearningStoryById(id: string): Promise<LearningStory | null> {
  const supabase = createClient();
  const { data: row } = await supabase.from("learning_stories").select("*").eq("id", id).maybeSingle();
  if (!row) return null;

  const [{ data: childLinks }, { data: tagLinks }, { data: mediaRows }, { data: historyRows }, staffNames, profiles, allChildren, allTags] =
    await Promise.all([
      supabase.from("learning_story_children").select("child_id").eq("story_id", id),
      supabase.from("learning_story_tags").select("tag_id").eq("story_id", id),
      supabase.from("learning_story_media").select("*").eq("story_id", id).order("sort_order", { ascending: true }),
      supabase
        .from("learning_story_status_history")
        .select("*")
        .eq("story_id", id)
        .order("changed_at", { ascending: true }),
      getStaffNameMap(),
      getProfilesMap(),
      getChildrenList(),
      getAllLearningTagsFlat(),
    ]);

  const childById = new Map(allChildren.map((c) => [c.id, c]));
  const tagById = new Map(allTags.map((t) => [t.id, t]));

  const children: LearningStoryChildRef[] = (childLinks ?? [])
    .map((l) => childById.get(l.child_id))
    .filter((c): c is NonNullable<typeof c> => Boolean(c))
    .map((c) => ({ id: c.id, full_name: c.full_name, room_name: c.room_name, room_color: c.room_color, photo_url: c.photo_url }));

  const tags: LearningTag[] = (tagLinks ?? [])
    .map((l) => tagById.get(l.tag_id))
    .filter((t): t is LearningTag => Boolean(t));

  const urlByMediaId = await signMediaUrls((mediaRows ?? []).map((m) => ({ id: m.id, storage_path: m.storage_path })));

  const media: LearningStoryMedia[] = (mediaRows ?? []).map((m) => ({
    id: m.id,
    story_id: m.story_id,
    storage_path: m.storage_path,
    original_filename: m.original_filename,
    mime_type: m.mime_type,
    file_size_bytes: m.file_size_bytes,
    kind: m.kind,
    caption: m.caption,
    sort_order: m.sort_order,
    uploaded_by_name: m.uploaded_by ? profiles.get(m.uploaded_by)?.full_name ?? null : null,
    uploaded_at: m.uploaded_at,
    url: urlByMediaId.get(m.id) ?? null,
  }));

  const status_history: LearningStoryStatusHistoryEntry[] = (historyRows ?? []).map((h) => ({
    id: h.id,
    from_status: h.from_status,
    to_status: h.to_status,
    comment: h.comment,
    changed_by_name: h.changed_by ? profiles.get(h.changed_by)?.full_name ?? null : null,
    changed_at: h.changed_at,
  }));

  return {
    id: row.id,
    story_number: row.story_number,
    title: row.title,
    story_date: row.story_date,
    status: row.status,
    author_staff_id: row.author_staff_id,
    author_name: row.author_staff_id ? staffNames.get(row.author_staff_id) ?? null : null,
    content_blocks: (row.content_blocks as LearningStoryBlock[] | null) ?? [],
    media,
    children,
    tags,
    requires_approval: row.requires_approval,
    review_comments: row.review_comments,
    created_by_name: row.created_by ? profiles.get(row.created_by)?.full_name ?? null : null,
    created_at: row.created_at,
    updated_by_name: row.updated_by ? profiles.get(row.updated_by)?.full_name ?? null : null,
    updated_at: row.updated_at,
    submitted_by_name: row.submitted_by ? profiles.get(row.submitted_by)?.full_name ?? null : null,
    submitted_at: row.submitted_at,
    reviewed_by_name: row.reviewed_by ? profiles.get(row.reviewed_by)?.full_name ?? null : null,
    approved_at: row.approved_at,
    published_at: row.published_at,
    last_autosaved_at: row.last_autosaved_at,
    status_history,
  };
}

/** All published stories a given child appears in (individual or group),
 * newest first — the data behind the Learning Stories section on that
 * child's existing profile page. No second profile, just a filtered view
 * of the same story records. */
export async function getPublishedStoriesForChild(
  childId: string,
  filters?: { authorStaffId?: string; tagId?: string }
): Promise<LearningStoryListItem[]> {
  const all = await getLearningStoriesList({ status: "published", childId, authorStaffId: filters?.authorStaffId, tagId: filters?.tagId });
  return all;
}

export async function getLearningStoriesOverview(monthKey: string = currentMonthKey()): Promise<LearningStoriesOverview> {
  const supabase = createClient();
  const { start, end } = monthRange(monthKey);

  const [{ data: monthRows }, activeChildren] = await Promise.all([
    supabase.from("learning_stories").select("id, status").gte("story_date", start).lt("story_date", end),
    getChildrenList({ status: "active" }),
  ]);

  const storyIds = (monthRows ?? []).map((r) => r.id);
  const { data: childLinks } = storyIds.length
    ? await supabase.from("learning_story_children").select("story_id, child_id").in("story_id", storyIds)
    : { data: [] as { story_id: string; child_id: string }[] };

  const statusByStory = new Map((monthRows ?? []).map((r) => [r.id, r.status as LearningStoryStatus]));

  const childrenWithPublished = new Set<string>();
  (childLinks ?? []).forEach((l) => {
    if (statusByStory.get(l.story_id) === "published") childrenWithPublished.add(l.child_id);
  });

  const draftCount = (monthRows ?? []).filter((r) => r.status === "draft").length;
  const awaitingApprovalCount = (monthRows ?? []).filter((r) => r.status === "awaiting_approval").length;
  const publishedThisMonthCount = (monthRows ?? []).filter((r) => r.status === "published").length;

  return {
    monthLabel: monthLabel(monthKey),
    childrenWithPublished: childrenWithPublished.size,
    childrenNeedingStory: Math.max(0, activeChildren.length - childrenWithPublished.size),
    totalActiveChildren: activeChildren.length,
    draftCount,
    awaitingApprovalCount,
    publishedThisMonthCount,
  };
}

const STATUS_PRIORITY: Record<LearningStoryStatus, number> = {
  published: 5,
  awaiting_approval: 4,
  returned_for_editing: 3,
  draft: 2,
  archived: 1,
};

/** The room-by-room, child-by-child tracker: for each active child, the
 * single "best" story status this month (published beats awaiting/draft
 * beats nothing), and which story that was — so clicking the cell can open
 * that exact story. Computed fresh from real records every time; nothing
 * here is cached or hand-maintained. */
export async function getMonthlyTracker(monthKey: string = currentMonthKey()): Promise<MonthlyTrackerRoomRow[]> {
  const supabase = createClient();
  const { start, end } = monthRange(monthKey);

  const [rooms, activeChildren, { data: monthRows }] = await Promise.all([
    getRosterRooms(),
    getChildrenList({ status: "active" }),
    supabase.from("learning_stories").select("id, status").gte("story_date", start).lt("story_date", end),
  ]);

  const storyIds = (monthRows ?? []).map((r) => r.id);
  const statusByStory = new Map((monthRows ?? []).map((r) => [r.id, r.status as LearningStoryStatus]));

  const { data: childLinks } = storyIds.length
    ? await supabase.from("learning_story_children").select("story_id, child_id").in("story_id", storyIds)
    : { data: [] as { story_id: string; child_id: string }[] };

  // For each child, keep whichever linked story has the highest-priority
  // status this month.
  const bestByChild = new Map<string, { storyId: string; status: LearningStoryStatus }>();
  (childLinks ?? []).forEach((l) => {
    const status = statusByStory.get(l.story_id);
    if (!status) return;
    const current = bestByChild.get(l.child_id);
    if (!current || STATUS_PRIORITY[status] > STATUS_PRIORITY[current.status]) {
      bestByChild.set(l.child_id, { storyId: l.story_id, status });
    }
  });

  const rowByRoomId = new Map<string, MonthlyTrackerRoomRow>();
  rooms.forEach((r) => rowByRoomId.set(r.id, { room: { id: r.id, name: r.name, color: r.color }, children: [] }));
  let unassignedRow: MonthlyTrackerRoomRow | null = null;

  activeChildren.forEach((c) => {
    const best = bestByChild.get(c.id);
    const cell = { id: c.id, full_name: c.full_name, status: best?.status ?? ("none" as const), storyId: best?.storyId ?? null };
    if (c.room_id && rowByRoomId.has(c.room_id)) {
      rowByRoomId.get(c.room_id)!.children.push(cell);
    } else {
      if (!unassignedRow) unassignedRow = { room: null, children: [] };
      unassignedRow.children.push(cell);
    }
  });

  rowByRoomId.forEach((row) => row.children.sort((a, b) => a.full_name.localeCompare(b.full_name)));

  // Rooms with no active children (e.g. "Float", which is staff-only) are
  // left out rather than shown as an empty section.
  const result = Array.from(rowByRoomId.values()).filter((r) => r.children.length > 0);
  if (unassignedRow) result.push(unassignedRow);
  return result;
}

export async function getSignedLearningStoryMediaUrl(storagePath: string, download?: boolean): Promise<string | null> {
  const supabase = createClient();
  const { data, error } = await supabase.storage
    .from(BUCKET)
    .createSignedUrl(storagePath, SIGNED_URL_TTL_SECONDS, download ? { download: true } : undefined);
  if (error) return null;
  return data.signedUrl;
}

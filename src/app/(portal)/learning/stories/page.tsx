import Link from "next/link";
import { getLearningStoriesList, getLearningStoriesOverview, currentMonthKey } from "@/lib/data/learning-stories";
import { getLearningTagSets } from "@/lib/data/learning-tags";
import { getRosterRooms } from "@/lib/data/roster";
import { getChildrenList } from "@/lib/data/children";
import { getStaffList } from "@/lib/data/staff";
import { StatTile } from "@/components/dashboard/stat-tile";
import { StoryFiltersBar } from "@/components/learning-stories/story-filters-bar";
import { StoryCard } from "@/components/learning-stories/story-card";
import { CreateStoryButton } from "@/components/learning-stories/create-story-button";
import type { LearningStoryStatus } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function LearningStoriesHomePage({
  searchParams,
}: {
  searchParams: { q?: string; room?: string; child?: string; author?: string; month?: string; status?: string; tag?: string };
}) {
  const overviewMonth = searchParams.month || currentMonthKey();

  const [stories, overview, rooms, children, authors, tagSets] = await Promise.all([
    getLearningStoriesList({
      search: searchParams.q,
      roomId: searchParams.room,
      childId: searchParams.child,
      authorStaffId: searchParams.author,
      month: searchParams.month,
      status: searchParams.status as LearningStoryStatus | undefined,
      tagId: searchParams.tag,
    }),
    getLearningStoriesOverview(overviewMonth),
    getRosterRooms(),
    getChildrenList({ status: "active" }),
    getStaffList({ status: "active" }),
    getLearningTagSets(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Learning Stories</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Individual and group learning stories for the children at Beach Kids.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/learning/stories/tracker" className="btn-ghost">
            Monthly tracker →
          </Link>
          <CreateStoryButton />
        </div>
      </div>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          {overview.monthLabel}
        </h2>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
          <StatTile label="Children with a published story" value={overview.childrenWithPublished} tone="ready" />
          <StatTile
            label="Children still requiring a story"
            value={overview.childrenNeedingStory}
            tone={overview.childrenNeedingStory > 0 ? "action" : "ready"}
          />
          <StatTile label="Draft stories" value={overview.draftCount} tone="neutral" />
          <StatTile label="Stories awaiting approval" value={overview.awaitingApprovalCount} tone="attention" />
          <StatTile label="Stories published this month" value={overview.publishedThisMonthCount} tone="ready" />
        </div>
      </section>

      <StoryFiltersBar
        rooms={rooms}
        children={children.map((c) => ({ id: c.id, full_name: c.full_name }))}
        authors={authors.map((a) => ({ id: a.id, full_name: a.full_name }))}
        tagSets={tagSets}
      />

      {stories.length === 0 ? (
        <div className="card p-10 text-center text-sm text-charcoal/50">
          No learning stories match yet. Try different filters, or create the first one.
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stories.map((story) => (
            <StoryCard key={story.id} story={story} />
          ))}
        </div>
      )}
    </div>
  );
}

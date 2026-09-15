import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { LEARNING_STORY_STATUS_LABEL, learningStoryStatusTone } from "@/lib/constants";
import { formatShortDate } from "@/lib/utils";
import type { LearningStoryListItem } from "@/lib/types";

export function StoryCard({ story }: { story: LearningStoryListItem }) {
  const childNames = story.children.map((c) => c.full_name).join(", ") || "No children linked yet";

  return (
    <Link href={`/learning/stories/${story.id}`} className="card flex flex-col overflow-hidden transition-shadow hover:shadow-cardHover">
      <div className="aspect-[16/10] w-full shrink-0 bg-sand-100">
        {story.coverMediaUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={story.coverMediaUrl} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-xs text-charcoal/30">No photo yet</div>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-4">
        <div className="flex items-start justify-between gap-2">
          <h3 className="font-display text-sm font-semibold leading-snug text-charcoal">
            {story.title || "Untitled story"}
          </h3>
          <StatusBadge tone={learningStoryStatusTone(story.status)} className="shrink-0">
            {LEARNING_STORY_STATUS_LABEL[story.status]}
          </StatusBadge>
        </div>
        <p className="truncate text-xs text-charcoal/60">{childNames}</p>
        <p className="mt-auto text-xs text-charcoal/40">
          {story.author_name ?? "No author set"} · {formatShortDate(story.story_date)}
        </p>
      </div>
    </Link>
  );
}

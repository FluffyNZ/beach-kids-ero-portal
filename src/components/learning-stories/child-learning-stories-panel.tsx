"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { formatShortDate } from "@/lib/utils";
import type { LearningStoryListItem } from "@/lib/types";

/** The Learning Stories section on a child's existing profile — not a
 * second profile, just a chronological, filterable view of the same story
 * records this child is already linked to (via learning_story_children). A
 * group story shows here exactly the same as it shows for every other
 * child it involves. */
export function ChildLearningStoriesPanel({ stories }: { stories: LearningStoryListItem[] }) {
  const [authorFilter, setAuthorFilter] = useState("");
  const [tagFilter, setTagFilter] = useState("");
  const [monthFilter, setMonthFilter] = useState("");

  const authors = useMemo(
    () => Array.from(new Set(stories.map((s) => s.author_name).filter((a): a is string => Boolean(a)))),
    [stories]
  );
  const tags = useMemo(() => {
    const map = new Map<string, string>();
    stories.forEach((s) => s.tags.forEach((t) => map.set(t.id, t.name)));
    return Array.from(map.entries());
  }, [stories]);
  const months = useMemo(
    () => Array.from(new Set(stories.map((s) => s.story_date.slice(0, 7)))).sort().reverse(),
    [stories]
  );

  const filtered = stories.filter((s) => {
    if (authorFilter && s.author_name !== authorFilter) return false;
    if (tagFilter && !s.tags.some((t) => t.id === tagFilter)) return false;
    if (monthFilter && s.story_date.slice(0, 7) !== monthFilter) return false;
    return true;
  });

  if (stories.length === 0) {
    return <p className="text-sm text-charcoal/50">No published learning stories for this child yet.</p>;
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap gap-2">
        <select className="input w-auto text-xs" value={authorFilter} onChange={(e) => setAuthorFilter(e.target.value)}>
          <option value="">All authors</option>
          {authors.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
        <select className="input w-auto text-xs" value={tagFilter} onChange={(e) => setTagFilter(e.target.value)}>
          <option value="">All tags</option>
          {tags.map(([id, name]) => (
            <option key={id} value={id}>
              {name}
            </option>
          ))}
        </select>
        <select className="input w-auto text-xs" value={monthFilter} onChange={(e) => setMonthFilter(e.target.value)}>
          <option value="">All dates</option>
          {months.map((m) => (
            <option key={m} value={m}>
              {new Intl.DateTimeFormat("en-NZ", { month: "long", year: "numeric" }).format(new Date(`${m}-01T00:00:00Z`))}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col divide-y divide-charcoal/5">
        {filtered.map((s) => (
          <Link key={s.id} href={`/learning/stories/${s.id}`} className="flex items-center gap-3 py-2.5 hover:bg-sand-50">
            <div className="h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-sand-100">
              {s.coverMediaUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={s.coverMediaUrl} alt="" className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-charcoal">{s.title || "Untitled story"}</p>
              <p className="text-xs text-charcoal/50">
                {formatShortDate(s.story_date)}
                {s.author_name ? ` · ${s.author_name}` : ""}
                {s.children.length > 1 ? ` · with ${s.children.length - 1} other${s.children.length > 2 ? "s" : ""}` : ""}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}

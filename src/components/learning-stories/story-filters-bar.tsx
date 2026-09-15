"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchIcon } from "@/components/icons";
import { LEARNING_STORY_STATUSES, LEARNING_STORY_STATUS_LABEL } from "@/lib/constants";
import type { RosterRoom, LearningTagSet } from "@/lib/types";

const FILTER_KEYS = ["q", "room", "child", "author", "month", "status", "tag"] as const;
type FilterKey = (typeof FILTER_KEYS)[number];

export function StoryFiltersBar({
  rooms,
  children,
  authors,
  tagSets,
}: {
  rooms: RosterRoom[];
  children: Array<{ id: string; full_name: string }>;
  authors: Array<{ id: string; full_name: string }>;
  tagSets: LearningTagSet[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function pushParams(next: Partial<Record<FilterKey, string>>) {
    const params = new URLSearchParams(searchParams.toString());
    FILTER_KEYS.forEach((key) => {
      if (next[key] !== undefined) {
        if (next[key]) params.set(key, next[key] as string);
        else params.delete(key);
      }
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  // Flattened for the "Learning tag" dropdown — strands and any goals
  // underneath them, across every active tag set.
  const allTags = tagSets.flatMap((set) =>
    set.tags.flatMap((t) => [{ ...t, groupLabel: set.name }, ...t.children.map((c) => ({ ...c, groupLabel: set.name }))])
  );
  const teWhariki = tagSets.find((s) => s.key === "te_whariki");

  return (
    <div className="card flex flex-col gap-3 p-4">
      <form
        className="relative"
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q: query });
        }}
      >
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Search by child, title, story text, educator, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
        <select className="input" value={searchParams.get("room") ?? ""} onChange={(e) => pushParams({ room: e.target.value })}>
          <option value="">All rooms</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>

        <select className="input" value={searchParams.get("child") ?? ""} onChange={(e) => pushParams({ child: e.target.value })}>
          <option value="">All children</option>
          {children.map((c) => (
            <option key={c.id} value={c.id}>
              {c.full_name}
            </option>
          ))}
        </select>

        <select className="input" value={searchParams.get("author") ?? ""} onChange={(e) => pushParams({ author: e.target.value })}>
          <option value="">All authors</option>
          {authors.map((a) => (
            <option key={a.id} value={a.id}>
              {a.full_name}
            </option>
          ))}
        </select>

        <input
          type="month"
          className="input"
          value={searchParams.get("month") ?? ""}
          onChange={(e) => pushParams({ month: e.target.value })}
        />

        <select className="input" value={searchParams.get("status") ?? ""} onChange={(e) => pushParams({ status: e.target.value })}>
          <option value="">All statuses</option>
          {LEARNING_STORY_STATUSES.map((s) => (
            <option key={s} value={s}>
              {LEARNING_STORY_STATUS_LABEL[s]}
            </option>
          ))}
        </select>

        <select className="input" value={searchParams.get("tag") ?? ""} onChange={(e) => pushParams({ tag: e.target.value })}>
          <option value="">All learning tags</option>
          {teWhariki && (
            <optgroup label="Te Whāriki strand">
              {teWhariki.tags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                  {t.maori_name ? ` | ${t.maori_name}` : ""}
                </option>
              ))}
            </optgroup>
          )}
          {allTags.length > 0 && (
            <optgroup label="All learning tags">
              {allTags.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.groupLabel} — {t.name}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </div>
    </div>
  );
}

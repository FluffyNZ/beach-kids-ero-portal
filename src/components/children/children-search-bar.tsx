"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchIcon } from "@/components/icons";
import type { RosterRoom } from "@/lib/types";

export function ChildrenSearchBar({ rooms, showLeft }: { rooms: RosterRoom[]; showLeft: boolean }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function pushParams(next: { q?: string; status?: string; room?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    (["q", "status", "room"] as const).forEach((key) => {
      if (next[key] !== undefined) {
        if (next[key]) params.set(key, next[key] as string);
        else params.delete(key);
      }
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <form
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q: query });
        }}
      >
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Search children by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <select
        className="input sm:w-44"
        value={searchParams.get("room") ?? ""}
        onChange={(e) => pushParams({ room: e.target.value })}
      >
        <option value="">All rooms</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
          </option>
        ))}
      </select>

      <label className="flex shrink-0 items-center gap-2 whitespace-nowrap text-sm text-charcoal/70">
        <input
          type="checkbox"
          className="h-4 w-4 rounded border-charcoal/20"
          checked={showLeft}
          onChange={(e) => pushParams({ status: e.target.checked ? "all" : "" })}
        />
        Show no longer attending
      </label>
    </div>
  );
}

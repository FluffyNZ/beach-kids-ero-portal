"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchIcon } from "@/components/icons";
import { SECTION_META } from "@/lib/constants";

export function ChecklistSearchBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function pushParams(next: { q?: string; section?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.section !== undefined) {
      if (next.section) params.set("section", next.section);
      else params.delete("section");
    }
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
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-400" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Search the checklist by code, title or requirement…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <select
        className="input sm:w-64"
        value={searchParams.get("section") ?? ""}
        onChange={(e) => pushParams({ section: e.target.value })}
      >
        <option value="">All sections</option>
        {Object.entries(SECTION_META).map(([code, meta]) => (
          <option key={code} value={code}>
            {code} — {meta.short}
          </option>
        ))}
      </select>
    </div>
  );
}

"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

/** Filters default to "All children" / "All dates" — records here are rare
 * enough, and reviewed far enough after the fact, that scoping the list to
 * the current month by default would hide history a manager likely wants
 * to see. Both filters are opt-in narrowing, not a default month view. */
export function RecordFiltersBar({ allChildren }: { allChildren: Array<{ id: string; full_name: string }> }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: "child" | "month", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="card flex flex-wrap items-center gap-2 p-4">
      <select
        className="input w-auto text-sm"
        value={searchParams.get("child") ?? ""}
        onChange={(e) => setParam("child", e.target.value)}
      >
        <option value="">All children</option>
        {allChildren.map((c) => (
          <option key={c.id} value={c.id}>
            {c.full_name}
          </option>
        ))}
      </select>

      <input
        type="month"
        className="input w-auto text-sm"
        value={searchParams.get("month") ?? ""}
        onChange={(e) => setParam("month", e.target.value)}
      />
    </div>
  );
}

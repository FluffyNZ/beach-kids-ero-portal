"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import type { RosterRoom } from "@/lib/types";

/** Filters default to "All rooms" / "All dates" — same reasoning as the
 * Accident & Illness list: this is a history view a manager may want to
 * scan back through, not something that should quietly hide past months. */
export function HazardFiltersBar({ rooms }: { rooms: RosterRoom[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: "room" | "month", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="card flex flex-wrap items-center gap-2 p-4">
      <select
        className="input w-auto text-sm"
        value={searchParams.get("room") ?? ""}
        onChange={(e) => setParam("room", e.target.value)}
      >
        <option value="">All rooms</option>
        {rooms.map((r) => (
          <option key={r.id} value={r.id}>
            {r.name}
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

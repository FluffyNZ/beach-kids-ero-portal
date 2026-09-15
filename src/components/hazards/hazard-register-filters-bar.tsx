"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";

/** Defaults to "Open" hazards — this register exists so nothing flagged
 * gets forgotten, so the useful default is what's still outstanding, with
 * resolved history one click away rather than the starting view. */
export function HazardRegisterFiltersBar() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: "status" | "risk", value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="card flex flex-wrap items-center gap-2 p-4">
      <select
        className="input w-auto text-sm"
        value={searchParams.get("status") ?? "open"}
        onChange={(e) => setParam("status", e.target.value)}
      >
        <option value="open">Open hazards</option>
        <option value="resolved">Resolved hazards</option>
        <option value="all">All hazards</option>
      </select>

      <select
        className="input w-auto text-sm"
        value={searchParams.get("risk") ?? ""}
        onChange={(e) => setParam("risk", e.target.value)}
      >
        <option value="">All risk levels</option>
        <option value="high">High risk</option>
        <option value="medium">Medium risk</option>
        <option value="low">Low risk</option>
      </select>
    </div>
  );
}

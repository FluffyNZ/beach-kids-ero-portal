"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchIcon } from "@/components/icons";
import { STAFF_CONTRACT_TYPES, STAFF_CONTRACT_TYPE_LABEL } from "@/lib/constants";
import type { RosterRoom } from "@/lib/types";

export function StaffSearchBar({ rooms }: { rooms: RosterRoom[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function pushParams(next: { q?: string; status?: string; room?: string; contractType?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    if (next.q !== undefined) {
      if (next.q) params.set("q", next.q);
      else params.delete("q");
    }
    if (next.status !== undefined) {
      if (next.status) params.set("status", next.status);
      else params.delete("status");
    }
    if (next.room !== undefined) {
      if (next.room) params.set("room", next.room);
      else params.delete("room");
    }
    if (next.contractType !== undefined) {
      if (next.contractType) params.set("contractType", next.contractType);
      else params.delete("contractType");
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
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Search staff by name or role…"
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

      <select
        className="input sm:w-48"
        value={searchParams.get("contractType") ?? ""}
        onChange={(e) => pushParams({ contractType: e.target.value })}
      >
        <option value="">All employment types</option>
        {STAFF_CONTRACT_TYPES.map((c) => (
          <option key={c} value={c}>
            {STAFF_CONTRACT_TYPE_LABEL[c]}
          </option>
        ))}
      </select>

      <select
        className="input sm:w-48"
        value={searchParams.get("status") ?? "active"}
        onChange={(e) => pushParams({ status: e.target.value })}
      >
        <option value="active">Active</option>
        <option value="former">Former staff</option>
        <option value="all">All staff</option>
      </select>
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import { ChildAvatar } from "@/components/children/child-avatar";
import type { ChildMember, RosterRoom } from "@/lib/types";

/** A single required child for one Accident & Illness record — unlike the
 * Learning Stories picker, this never allows more than one, since the real
 * paper form only ever names one child. */
export function ChildSelect({
  allChildren,
  rooms,
  selectedId,
  onChange,
}: {
  allChildren: ChildMember[];
  rooms: RosterRoom[];
  selectedId: string | null;
  onChange: (id: string) => void;
}) {
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const selected = allChildren.find((c) => c.id === selectedId) ?? null;

  const visible = useMemo(() => {
    return allChildren.filter((c) => {
      if (roomFilter !== "all" && c.room_id !== roomFilter) return false;
      if (search.trim() && !c.full_name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [allChildren, roomFilter, search]);

  return (
    <div className="flex flex-col gap-3">
      {selected && (
        <div className="flex items-center gap-2 rounded-lg border border-burgundy-200 bg-burgundy-50 p-2">
          <ChildAvatar fullName={selected.full_name} roomColor={selected.room_color} photoUrl={selected.photo_url} size="md" />
          <span className="text-sm font-medium text-charcoal">{selected.full_name}</span>
          {selected.status === "left" && <span className="badge bg-sand-100 text-charcoal/50">Left</span>}
        </div>
      )}

      <div className="flex flex-wrap gap-1.5">
        {(["all", ...rooms.map((r) => r.id)] as const).map((key) => {
          const room = rooms.find((r) => r.id === key);
          const active = roomFilter === key;
          return (
            <button
              key={key}
              type="button"
              onClick={() => setRoomFilter(key)}
              className={active ? "badge bg-charcoal text-white" : "badge bg-sand-100 text-charcoal/60 hover:bg-sand-200"}
            >
              {room ? room.name : "All Children"}
            </button>
          );
        })}
      </div>

      <input
        type="text"
        className="input"
        placeholder="Search children…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <div className="grid max-h-64 grid-cols-2 gap-2 overflow-y-auto rounded-lg border border-charcoal/10 p-2 sm:grid-cols-3">
        {visible.length === 0 && <p className="col-span-full py-4 text-center text-xs text-charcoal/40">No children match.</p>}
        {visible.map((c) => {
          const isSelected = c.id === selectedId;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange(c.id)}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${
                isSelected ? "border-burgundy-300 bg-burgundy-50" : "border-transparent hover:bg-sand-50"
              }`}
            >
              <ChildAvatar fullName={c.full_name} roomColor={c.room_color} photoUrl={c.photo_url} size="md" />
              <span className="min-w-0 truncate text-xs font-medium text-charcoal">
                {c.full_name}
                {c.status === "left" && <span className="ml-1 text-charcoal/40">(left)</span>}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

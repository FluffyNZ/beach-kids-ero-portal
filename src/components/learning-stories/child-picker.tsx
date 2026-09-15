"use client";

import { useMemo, useState } from "react";
import { ChildAvatar } from "@/components/children/child-avatar";
import type { ChildMember, RosterRoom } from "@/lib/types";

/** One selected child = an Individual Learning Story. More than one =
 * a Group Learning Story — the story stays a single record either way,
 * this just decides how many rows land in learning_story_children. */
export function ChildPicker({
  allChildren,
  rooms,
  selectedIds,
  onChange,
}: {
  allChildren: ChildMember[];
  rooms: RosterRoom[];
  selectedIds: string[];
  onChange: (ids: string[]) => void;
}) {
  const [roomFilter, setRoomFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const selected = allChildren.filter((c) => selectedIds.includes(c.id));

  const visible = useMemo(() => {
    return allChildren.filter((c) => {
      if (roomFilter !== "all" && c.room_id !== roomFilter) return false;
      if (search.trim() && !c.full_name.toLowerCase().includes(search.trim().toLowerCase())) return false;
      return true;
    });
  }, [allChildren, roomFilter, search]);

  function toggle(childId: string) {
    if (selectedIds.includes(childId)) onChange(selectedIds.filter((id) => id !== childId));
    else onChange([...selectedIds, childId]);
  }

  return (
    <div className="flex flex-col gap-3">
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {selected.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className="badge bg-burgundy-50 text-burgundy-600 hover:bg-burgundy-100"
              title="Remove"
            >
              {c.full_name} ✕
            </button>
          ))}
        </div>
      )}

      <p className="text-xs text-charcoal/50">
        {selected.length === 0
          ? "No children selected yet."
          : selected.length === 1
            ? "Individual Learning Story."
            : `Group Learning Story — ${selected.length} children.`}
      </p>

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
          const isSelected = selectedIds.includes(c.id);
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`flex items-center gap-2 rounded-lg border p-2 text-left transition-colors ${
                isSelected ? "border-burgundy-300 bg-burgundy-50" : "border-transparent hover:bg-sand-50"
              }`}
            >
              <ChildAvatar fullName={c.full_name} roomColor={c.room_color} photoUrl={c.photo_url} size="md" />
              <span className="min-w-0 truncate text-xs font-medium text-charcoal">{c.full_name}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

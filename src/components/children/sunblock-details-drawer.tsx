"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { Drawer } from "@/components/ui/drawer";
import { SunblockPreferenceForm } from "@/components/children/sunblock-preference-form";
import { getRoomColorClasses } from "@/lib/constants";
import { parseSunblockDetails } from "@/lib/sunblock-format";

export type SunblockDetailsChild = {
  id: string;
  full_name: string;
  roomId: string;
  roomName: string;
  roomColor: string;
  uses_own_sunblock: boolean;
  sunblock_instructions: string | null;
};

function summary(child: SunblockDetailsChild) {
  if (!child.uses_own_sunblock) return "Centre sunblock";
  const { product, instructions } = parseSunblockDetails(child.sunblock_instructions);
  return product || instructions || "Details not recorded";
}

/** "Manage sunblock details": every current child in the charted rooms,
 * with their special-sunblock setting, editable one at a time. Saves go to
 * the child's own record (the same fields as their Health & permissions
 * tab), so the charts pick them up straight away. */
export function SunblockDetailsDrawer({
  open,
  onClose,
  childrenList,
  defaultRoomId,
  editChildId,
  onEditChildChange,
}: {
  open: boolean;
  onClose: () => void;
  childrenList: SunblockDetailsChild[];
  defaultRoomId: string;
  editChildId: string | null;
  onEditChildChange: (id: string | null) => void;
}) {
  const [query, setQuery] = useState("");
  const [roomId, setRoomId] = useState(defaultRoomId);
  const [onlySpecial, setOnlySpecial] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [confirmLeave, setConfirmLeave] = useState<null | "close" | "back">(null);
  const [savedName, setSavedName] = useState<string | null>(null);
  const backRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) {
      setRoomId(defaultRoomId);
      setSavedName(null);
    }
  }, [open, defaultRoomId]);

  useEffect(() => {
    setDirty(false);
    setConfirmLeave(null);
  }, [editChildId]);

  const rooms = useMemo(() => {
    const seen = new Map<string, string>();
    childrenList.forEach((c) => seen.set(c.roomId, c.roomName));
    return Array.from(seen, ([id, name]) => ({ id, name }));
  }, [childrenList]);

  const specialCount = childrenList.filter((c) => c.uses_own_sunblock).length;
  const q = query.trim().toLowerCase();
  const visible = childrenList.filter(
    (c) => (!roomId || c.roomId === roomId) && (!onlySpecial || c.uses_own_sunblock) && (!q || c.full_name.toLowerCase().includes(q))
  );
  const editing = editChildId ? childrenList.find((c) => c.id === editChildId) ?? null : null;

  const leave = useCallback(
    (kind: "close" | "back") => {
      if (editing && dirty) {
        setConfirmLeave(kind);
        return;
      }
      if (kind === "close") onClose();
      else onEditChildChange(null);
    },
    [editing, dirty, onClose, onEditChildChange]
  );
  // The Drawer re-runs its focus handling whenever this callback changes,
  // so hand it a stable one.
  const leaveRef = useRef(leave);
  leaveRef.current = leave;
  const requestClose = useCallback(() => leaveRef.current("close"), []);

  return (
    <Drawer
      open={open}
      onRequestClose={requestClose}
      title={editing ? `Sunblock details — ${editing.full_name}` : "Manage sunblock details"}
      description={
        editing
          ? `${editing.roomName} · saved to this child's record`
          : "Saved to each child's record and shown on their Health & permissions tab."
      }
    >
      {confirmLeave && (
        <div role="alertdialog" aria-label="Unsaved changes" className="mb-4 rounded-xl border border-status-attention/40 bg-status-attentionBg p-3 text-sm text-charcoal">
          <p className="font-medium">Discard unsaved changes for {editing?.full_name}?</p>
          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              className="btn-secondary px-3 py-1.5"
              onClick={() => {
                const kind = confirmLeave;
                setConfirmLeave(null);
                setDirty(false);
                if (kind === "close") onClose();
                else onEditChildChange(null);
              }}
            >
              Discard changes
            </button>
            <button
              type="button"
              autoFocus
              className="btn-primary px-3 py-1.5"
              onClick={() => {
                setConfirmLeave(null);
                backRef.current?.focus();
              }}
            >
              Keep editing
            </button>
          </div>
        </div>
      )}

      {editing ? (
        <div className="flex flex-col gap-5">
          <button
            ref={backRef}
            type="button"
            className="self-start text-sm font-medium text-lilac-700 underline-offset-4 hover:underline"
            onClick={() => leave("back")}
          >
            ← All children
          </button>
          <SunblockPreferenceForm
            key={editing.id}
            childId={editing.id}
            initialUsesOwn={editing.uses_own_sunblock}
            initialInstructions={editing.sunblock_instructions}
            onDirtyChange={setDirty}
            onSaved={() => {
              setSavedName(editing.full_name);
              setDirty(false);
              onEditChildChange(null);
            }}
          />
          <p className="border-t border-charcoal/10 pt-4 text-sm text-charcoal/70">
            Also on{" "}
            <Link
              href={`/children/${editing.id}?tab=health`}
              className="font-medium text-lilac-700 underline-offset-4 hover:underline"
            >
              {editing.full_name}&apos;s Health &amp; permissions tab
            </Link>
            .
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-4">
          {savedName && (
            <p role="status" className="rounded-xl bg-status-readyBg px-3 py-2 text-sm text-charcoal">
              Saved sunblock details for {savedName}.
            </p>
          )}
          <p className="text-sm text-charcoal">
            {specialCount === 0
              ? "No children are marked as using their own or special sunblock."
              : `${specialCount} ${specialCount === 1 ? "child uses" : "children use"} own or special sunblock.`}
          </p>
          <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
            <div>
              <label htmlFor="sunblock-details-search" className="mb-1.5 block text-sm font-medium text-charcoal">
                Find a child
              </label>
              <input
                id="sunblock-details-search"
                type="search"
                className="input"
                placeholder="Name"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="sunblock-details-room" className="mb-1.5 block text-sm font-medium text-charcoal">
                Room
              </label>
              <select id="sunblock-details-room" className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
                <option value="">All rooms</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-charcoal/40 accent-charcoal"
              checked={onlySpecial}
              onChange={(e) => setOnlySpecial(e.target.checked)}
            />
            Only show children with own/special sunblock
          </label>

          {visible.length === 0 ? (
            <p className="rounded-xl border border-dashed border-charcoal/15 px-4 py-3 text-sm text-charcoal/70">No children match.</p>
          ) : (
            <ul className="divide-y divide-charcoal/10 rounded-xl border border-charcoal/10">
              {visible.map((c) => (
                <li key={c.id}>
                  <button
                    type="button"
                    onClick={() => {
                      setSavedName(null);
                      onEditChildChange(c.id);
                    }}
                    className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm font-medium text-charcoal">
                        {c.uses_own_sunblock && <span aria-hidden="true">★ </span>}
                        {c.full_name}
                      </span>
                      <span className="block truncate text-xs text-charcoal/70">
                        <span className={`mr-1.5 inline-block h-2 w-2 rounded-full align-middle ${getRoomColorClasses(c.roomColor).chip}`} />
                        {c.roomName} · {summary(c)}
                      </span>
                    </span>
                    <span className="shrink-0 text-sm font-medium text-lilac-700">
                      Edit<span className="sr-only"> sunblock details for {c.full_name}</span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </Drawer>
  );
}

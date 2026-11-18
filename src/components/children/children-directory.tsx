"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ChildAvatar } from "./child-avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { SearchIcon, CloseIcon, ChevronRightIcon } from "@/components/icons";
import { getRoomColorClasses } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { EnrolmentStatus } from "@/lib/child-format";

export type DirectoryChild = {
  id: string;
  fullName: string;
  photoUrl: string | null;
  roomId: string | null;
  roomName: string | null;
  roomColor: string | null;
  status: "active" | "left";
  ageShort: string;
  ageEstimated: boolean;
  enrolment: EnrolmentStatus;
  billPayerName: string | null;
  /** Funding notes for the List view only, e.g. "WINZ subsidy". */
  funding: string[];
};

type Room = { id: string; name: string; color: string | null };
type StatusFilter = "active" | "former";
type View = "grid" | "list";

const NO_ROOM = "none";

/** Case- and accent-insensitive, so "maaka" finds "Māka". */
function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

function GridIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <rect x="2" y="2" width="5" height="5" rx="1" />
      <rect x="9" y="2" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}

function ListIcon() {
  return (
    <svg viewBox="0 0 16 16" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M2 4h12M2 8h12M2 12h12" strokeLinecap="round" />
    </svg>
  );
}

function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode; title?: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="inline-flex shrink-0 rounded-xl border border-charcoal/15 bg-white p-1">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          aria-pressed={value === opt.value}
          title={opt.title}
          onClick={() => onChange(opt.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
            value === opt.value ? "bg-charcoal text-white" : "text-charcoal hover:bg-charcoal/5"
          )}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}

function ChildCard({ child }: { child: DirectoryChild }) {
  return (
    <Link
      href={`/children/${child.id}`}
      className="group flex items-center gap-4 rounded-2xl border border-charcoal/10 bg-white p-4 transition-colors hover:border-charcoal/25 hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
    >
      <ChildAvatar fullName={child.fullName} roomColor={child.roomColor} photoUrl={child.photoUrl} size="card" decorative />
      <div className="min-w-0 flex-1">
        <p className="break-words font-medium leading-snug text-charcoal">{child.fullName}</p>
        <p className="mt-0.5 text-sm text-charcoal/70">
          <span title={child.ageEstimated ? "Estimated — no date of birth recorded" : undefined}>{child.ageShort}</span>
          {child.roomName && <> · {child.roomName}</>}
        </p>
        <StatusPill tone={child.enrolment.tone} className="mt-2">
          {child.enrolment.label}
        </StatusPill>
      </div>
      <ChevronRightIcon className="h-4 w-4 shrink-0 text-charcoal/40 transition-transform group-hover:translate-x-0.5" />
    </Link>
  );
}

function ChildRow({ child }: { child: DirectoryChild }) {
  const href = `/children/${child.id}`;
  return (
    <tr className="group relative transition-colors hover:bg-lilac-50">
      <th scope="row" className="py-3 pl-5 pr-3 text-left font-normal">
        <Link
          href={href}
          className="flex items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal after:absolute after:inset-0 after:content-['']"
        >
          <ChildAvatar fullName={child.fullName} roomColor={child.roomColor} photoUrl={child.photoUrl} size="list" decorative />
          <span className="font-medium text-charcoal">{child.fullName}</span>
        </Link>
      </th>
      <td className="whitespace-nowrap px-3 py-3 text-charcoal">
        <span title={child.ageEstimated ? "Estimated — no date of birth recorded" : undefined}>{child.ageShort}</span>
      </td>
      <td className="whitespace-nowrap px-3 py-3">
        <StatusPill tone={child.enrolment.tone}>{child.enrolment.label}</StatusPill>
      </td>
      <td className="px-3 py-3">
        <p className="break-words text-charcoal">{child.billPayerName ?? <span className="text-charcoal/70">Not set</span>}</p>
        {child.funding.length > 0 && <p className="text-xs text-charcoal/70">{child.funding.join(" · ")}</p>}
      </td>
      <td className="py-3 pl-3 pr-5 text-right">
        <ChevronRightIcon className="ml-auto h-4 w-4 text-charcoal/40" />
      </td>
    </tr>
  );
}

function ChildListItem({ child }: { child: DirectoryChild }) {
  return (
    <li>
      <Link
        href={`/children/${child.id}`}
        className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal"
      >
        <ChildAvatar fullName={child.fullName} roomColor={child.roomColor} photoUrl={child.photoUrl} size="list" decorative />
        <div className="min-w-0 flex-1">
          <p className="break-words font-medium text-charcoal">{child.fullName}</p>
          <p className="text-sm text-charcoal/70">
            {child.ageShort}
            {child.roomName && <> · {child.roomName}</>}
            {child.enrolment.tone !== "ready" && <> · {child.enrolment.label}</>}
          </p>
        </div>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-charcoal/40" />
      </Link>
    </li>
  );
}

type Group = { key: string; name: string; color: string | null; children: DirectoryChild[] };

/** The Children directory: search, room and Active/Former filters, and a
 * Grid or List view — all filtered in the browser from the full list the
 * page loads, with the current filters mirrored into the URL. */
export function ChildrenDirectory({
  childList,
  rooms,
  initial,
}: {
  childList: DirectoryChild[];
  rooms: Room[];
  initial: { q: string; room: string; status: StatusFilter; view: View };
}) {
  const [query, setQuery] = useState(initial.q);
  const [room, setRoom] = useState(initial.room);
  const [status, setStatus] = useState<StatusFilter>(initial.status);
  const [view, setView] = useState<View>(initial.view);
  const searchRef = useRef<HTMLInputElement>(null);

  // Mirror the filters into the address bar without a server round trip.
  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (room) params.set("room", room);
    if (status === "former") params.set("status", "former");
    if (view === "list") params.set("view", "list");
    const qs = params.toString();
    window.history.replaceState(window.history.state, "", qs ? `?${qs}` : window.location.pathname);
  }, [query, room, status, view]);

  const inStatus = useMemo(
    () => childList.filter((c) => (status === "active" ? c.status === "active" : c.status === "left")),
    [childList, status]
  );

  const q = normalise(query);
  const matchesQuery = (c: DirectoryChild) => !q || normalise(c.fullName).includes(q);
  const matchesRoom = (c: DirectoryChild) => !room || (room === NO_ROOM ? !c.roomId : c.roomId === room);

  const visible = inStatus.filter((c) => matchesQuery(c) && matchesRoom(c));

  // Children in the other list who match the search — offered as a hint
  // when the current list has no match.
  const otherStatusMatches = q
    ? childList.filter((c) => (status === "active" ? c.status === "left" : c.status === "active") && matchesQuery(c)).length
    : 0;

  const roomCounts = new Map<string, number>();
  inStatus.forEach((c) => {
    const key = c.roomId ?? NO_ROOM;
    roomCounts.set(key, (roomCounts.get(key) ?? 0) + 1);
  });
  const roomOptions = [
    ...rooms
      .filter((r) => (roomCounts.get(r.id) ?? 0) > 0 || r.id === room)
      .map((r) => ({ id: r.id, name: r.name, color: r.color, count: roomCounts.get(r.id) ?? 0 })),
    ...((roomCounts.get(NO_ROOM) ?? 0) > 0 || room === NO_ROOM
      ? [{ id: NO_ROOM, name: "No room", color: null, count: roomCounts.get(NO_ROOM) ?? 0 }]
      : []),
  ];

  const groups: Group[] = [
    ...rooms.map((r) => ({ key: r.id, name: r.name, color: r.color, children: [] as DirectoryChild[] })),
    { key: NO_ROOM, name: "No room recorded", color: null, children: [] as DirectoryChild[] },
  ];
  const groupByKey = new Map(groups.map((g) => [g.key, g]));
  visible.forEach((c) => (groupByKey.get(c.roomId ?? NO_ROOM) ?? groupByKey.get(NO_ROOM)!).children.push(c));
  const populated = groups.filter((g) => g.children.length > 0);

  const activeCount = childList.filter((c) => c.status === "active").length;
  const formerCount = childList.length - activeCount;
  const startingSoon = childList.filter((c) => c.status === "active" && c.enrolment.label.startsWith("Starts")).length;
  const leavingSoon = childList.filter((c) => c.status === "active" && c.enrolment.label.startsWith("Leaving")).length;
  const roomsWithChildren = new Set(childList.filter((c) => c.status === "active" && c.roomId).map((c) => c.roomId)).size;

  const filtersOn = Boolean(q || room);

  function clearFilters() {
    setQuery("");
    setRoom("");
    searchRef.current?.focus();
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Summary — from the records loaded on this page */}
      <p className="text-sm text-charcoal/70">
        <span className="font-semibold text-charcoal">{activeCount}</span> enrolled across {roomsWithChildren}{" "}
        {roomsWithChildren === 1 ? "room" : "rooms"}
        {startingSoon > 0 && <> · {startingSoon} starting soon</>}
        {leavingSoon > 0 && <> · {leavingSoon} leaving soon</>}
        {" · "}
        {formerCount} former
      </p>

      {/* Toolbar */}
      <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-3 sm:p-4">
        <div className="flex flex-col gap-3 md:flex-row md:items-center">
          <div className="relative flex-1">
            <label htmlFor="children-search" className="sr-only">
              Search children by name
            </label>
            <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/60" />
            <input
              ref={searchRef}
              id="children-search"
              type="search"
              autoComplete="off"
              className="input pl-9"
              placeholder="Search by name"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Segmented<StatusFilter>
              label="Enrolment"
              value={status}
              onChange={(v) => {
                setStatus(v);
                setRoom("");
              }}
              options={[
                { value: "active", label: <>Active <span className="opacity-80">{activeCount}</span></> },
                { value: "former", label: <>Former <span className="opacity-80">{formerCount}</span></> },
              ]}
            />
            <Segmented<View>
              label="View"
              value={view}
              onChange={setView}
              options={[
                { value: "grid", label: <><GridIcon /><span className="sr-only sm:not-sr-only">Grid</span></>, title: "Grid view" },
                { value: "list", label: <><ListIcon /><span className="sr-only sm:not-sr-only">List</span></>, title: "List view" },
              ]}
            />
          </div>
        </div>

        {/* Room filter — doubles as the room counts */}
        <div role="group" aria-label="Room" className="flex flex-wrap gap-2">
          <button
            type="button"
            aria-pressed={!room}
            onClick={() => setRoom("")}
            className={cn(
              "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
              !room ? "border-charcoal bg-charcoal text-white" : "border-charcoal/15 bg-white text-charcoal hover:bg-charcoal/5"
            )}
          >
            All rooms <span className="opacity-80">{inStatus.length}</span>
          </button>
          {roomOptions.map((r) => (
            <button
              key={r.id}
              type="button"
              aria-pressed={room === r.id}
              onClick={() => setRoom(room === r.id ? "" : r.id)}
              className={cn(
                "inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
                room === r.id ? "border-charcoal bg-charcoal text-white" : "border-charcoal/15 bg-white text-charcoal hover:bg-charcoal/5"
              )}
            >
              <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", getRoomColorClasses(r.color).chip)} />
              {r.name} <span className="opacity-80">{r.count}</span>
            </button>
          ))}
        </div>
      </div>

      <p aria-live="polite" className="sr-only">
        {visible.length} {visible.length === 1 ? "child" : "children"} shown
      </p>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-charcoal/10 bg-white px-5 py-10 text-center">
          <p className="font-medium text-charcoal">
            {inStatus.length === 0
              ? status === "active"
                ? "No active children yet"
                : "No former children"
              : q
                ? `No ${status === "active" ? "active" : "former"} children match “${query.trim()}”`
                : "No children in this room"}
          </p>
          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            {otherStatusMatches > 0 && (
              <button type="button" className="btn-secondary" onClick={() => setStatus(status === "active" ? "former" : "active")}>
                Show {otherStatusMatches} {status === "active" ? "former" : "active"}{" "}
                {otherStatusMatches === 1 ? "child who matches" : "children who match"}
              </button>
            )}
            {filtersOn && (
              <button type="button" className="btn-ghost" onClick={clearFilters}>
                <CloseIcon className="h-4 w-4" />
                Clear search and room
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-8">
          {populated.map((group) => (
            <section key={group.key} aria-labelledby={`room-${group.key}`}>
              <h2 id={`room-${group.key}`} className="mb-3 flex items-center gap-2 text-base font-semibold text-charcoal">
                <span aria-hidden="true" className={cn("h-2.5 w-2.5 rounded-full", getRoomColorClasses(group.color).chip)} />
                {group.name}
                <span className="text-sm font-normal text-charcoal/70">
                  {group.children.length} {group.children.length === 1 ? "child" : "children"}
                </span>
              </h2>

              {view === "grid" ? (
                <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                  {group.children.map((c) => (
                    <li key={c.id}>
                      <ChildCard child={c} />
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
                  {/* Phones: simple rows */}
                  <ul className="divide-y divide-charcoal/10 md:hidden">
                    {group.children.map((c) => (
                      <ChildListItem key={c.id} child={c} />
                    ))}
                  </ul>
                  {/* Tablet and up: table */}
                  <table className="hidden w-full table-fixed text-sm md:table">
                    {/* Fixed widths so the columns line up from one room to the next */}
                    <colgroup>
                      <col className="w-[40%]" />
                      <col className="w-[15%]" />
                      <col className="w-[18%]" />
                      <col />
                      <col className="w-12" />
                    </colgroup>
                    <thead>
                      <tr className="border-b border-charcoal/10 bg-canvas text-left text-xs font-semibold uppercase tracking-wide text-charcoal/70">
                        <th scope="col" className="py-2.5 pl-5 pr-3 font-semibold">Child</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Age</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Enrolment</th>
                        <th scope="col" className="px-3 py-2.5 font-semibold">Bill payer</th>
                        <th scope="col" className="py-2.5 pl-3 pr-5">
                          <span className="sr-only">Open</span>
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-charcoal/10">
                      {group.children.map((c) => (
                        <ChildRow key={c.id} child={c} />
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

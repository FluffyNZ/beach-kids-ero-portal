"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { StaffAvatar } from "./staff-avatar";
import { StatusPill } from "@/components/ui/status-pill";
import { SearchIcon, CloseIcon, ChevronRightIcon, ChevronDownIcon } from "@/components/icons";
import { getRoomColorClasses, STAFF_CONTRACT_TYPES, STAFF_CONTRACT_TYPE_LABEL } from "@/lib/constants";
import { cn } from "@/lib/utils";
import type { Tone } from "@/lib/staff-format";

export type DirectoryStaff = {
  id: string;
  fullName: string;
  role: string | null;
  photoUrl: string | null;
  roomId: string | null;
  roomName: string | null;
  roomColor: string | null;
  contractType: string | null;
  contractLabel: string | null;
  isRelief: boolean;
  status: "active" | "former";
  /** The soonest document expiry, when it's expired or within the renewal window. */
  documentAlert: { label: string; tone: Tone } | null;
  /** How many documents are expired or due for renewal. */
  documentsToRenew: number;
  reviewAlert: { label: string; tone: Tone } | null;
  /** Only set where a qualification is relevant to the role. */
  qualification: { label: string; tone: Tone } | null;
  /** Required documents (existing rules) not on file. */
  missingRequired: string[];
  /** Optional details not recorded. */
  optionalMissing: string[];
};

type Room = { id: string; name: string; color: string | null };
type Show = "" | "documents" | "reviews" | "missing";
const NO_ROOM = "none";

function normalise(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

const SHOW_LABEL: Record<Exclude<Show, "">, string> = {
  documents: "documents to renew",
  reviews: "qualification reviews due",
  missing: "missing required documents",
};

function SummaryTile({
  label,
  value,
  note,
  pressed,
  pressedNote = "Showing these staff · select again to clear",
  onClick,
  tone = "neutral",
}: {
  label: string;
  value: number;
  note: string;
  pressedNote?: string;
  pressed: boolean;
  onClick: () => void;
  tone?: "neutral" | "attention";
}) {
  return (
    <button
      type="button"
      aria-pressed={pressed}
      onClick={onClick}
      className={cn(
        "flex flex-col items-start rounded-2xl border bg-white px-4 py-3.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
        pressed ? "border-charcoal ring-1 ring-charcoal" : "border-charcoal/10 hover:border-charcoal/30"
      )}
    >
      <span className="text-sm text-charcoal/70">{label}</span>
      <span className="mt-1 flex items-center gap-2 text-2xl font-semibold leading-none text-charcoal">
        {value}
        {tone === "attention" && value > 0 && (
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-attention" />
        )}
      </span>
      <span className="mt-1.5 text-xs text-charcoal/70">{pressed ? pressedNote : note}</span>
    </button>
  );
}

function StaffRow({ person, expanded, onToggle }: { person: DirectoryStaff; expanded: boolean; onToggle: () => void }) {
  const detailsId = useId();
  const hasMissing = person.missingRequired.length > 0 || person.optionalMissing.length > 0;
  return (
    <li className="relative">
      <div className="flex flex-col gap-3 px-4 py-3.5 transition-colors hover:bg-lilac-50 sm:px-5 md:flex-row md:items-center md:gap-4">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <StaffAvatar fullName={person.fullName} photoUrl={person.photoUrl} size="list" decorative />
          <div className="min-w-0">
            <Link
              href={`/staff/${person.id}`}
              className="rounded font-medium text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal after:absolute after:inset-0 after:content-['']"
            >
              {person.fullName}
            </Link>
            <p className="text-sm text-charcoal/70">{person.role ?? "Role not recorded"}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-charcoal md:w-56 md:flex-col md:items-start md:gap-0.5">
          <span className="inline-flex items-center gap-1.5">
            {person.roomName ? (
              <>
                <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", getRoomColorClasses(person.roomColor).chip)} />
                {person.roomName}
              </>
            ) : (
              <span className="text-charcoal/70">{person.isRelief ? "Relief" : "No room"}</span>
            )}
          </span>
          <span className="text-charcoal/70">{person.contractLabel ?? "Employment type not recorded"}</span>
        </div>

        {/* z-10 keeps these above the row's stretched profile link */}
        <div className="relative z-10 flex flex-wrap items-center gap-1.5 md:w-[22rem] md:justify-end">
          {person.status === "former" && <StatusPill tone="neutral">Former staff</StatusPill>}
          {person.documentAlert && <StatusPill tone={person.documentAlert.tone}>{person.documentAlert.label}</StatusPill>}
          {person.reviewAlert && <StatusPill tone={person.reviewAlert.tone}>{person.reviewAlert.label}</StatusPill>}
          {person.qualification && <StatusPill tone={person.qualification.tone}>{person.qualification.label}</StatusPill>}
          {hasMissing && (
            <button
              type="button"
              aria-expanded={expanded}
              aria-controls={detailsId}
              onClick={onToggle}
              className={cn(
                "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
                person.missingRequired.length > 0
                  ? "bg-status-attentionBg text-charcoal hover:bg-status-attention/20"
                  : "text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal"
              )}
            >
              {person.missingRequired.length > 0
                ? `${person.missingRequired.length} required missing`
                : "Optional details"}
              <ChevronDownIcon className={cn("h-3 w-3 transition-transform", expanded && "rotate-180")} />
            </button>
          )}
        </div>
        <ChevronRightIcon className="hidden h-4 w-4 shrink-0 text-charcoal/40 md:block" />
      </div>

      {expanded && hasMissing && (
        <div id={detailsId} className="relative z-10 mx-4 mb-3.5 grid gap-3 rounded-xl border border-charcoal/10 bg-canvas p-4 text-sm sm:mx-5 sm:grid-cols-2">
          <div>
            <p className="font-medium text-charcoal">Required documents missing</p>
            {person.missingRequired.length === 0 ? (
              <p className="mt-0.5 text-charcoal/70">None — every required document is on file.</p>
            ) : (
              <ul className="mt-1 list-disc pl-5 text-charcoal">
                {person.missingRequired.map((m) => (
                  <li key={m}>{m}</li>
                ))}
              </ul>
            )}
          </div>
          <div>
            <p className="font-medium text-charcoal">Optional details not recorded</p>
            {person.optionalMissing.length === 0 ? (
              <p className="mt-0.5 text-charcoal/70">None.</p>
            ) : (
              <p className="mt-0.5 text-charcoal/80">{person.optionalMissing.join(" · ")}</p>
            )}
          </div>
          <Link
            href={`/staff/${person.id}?tab=documents`}
            className="rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700 sm:col-span-2"
          >
            Open {person.fullName.split(" ")[0]}&apos;s documents →
          </Link>
        </div>
      )}
    </li>
  );
}

/** The Staff directory: practical rows, with search, room, employment type
 * and Active/Former filters, plus summary figures that double as filters.
 * Everything is filtered in the browser from the list the page loads. */
export function StaffDirectory({
  staffList,
  rooms,
  initial,
}: {
  staffList: DirectoryStaff[];
  rooms: Room[];
  initial: { q: string; room: string; contractType: string; status: "active" | "former"; show: Show };
}) {
  const [query, setQuery] = useState(initial.q);
  const [room, setRoom] = useState(initial.room);
  const [contractType, setContractType] = useState(initial.contractType);
  const [status, setStatus] = useState<"active" | "former">(initial.status);
  const [show, setShow] = useState<Show>(initial.show);
  // Opening the page on the "missing" view shows everyone's details straight away.
  const [expanded, setExpanded] = useState<Set<string>>(() =>
    initial.show === "missing"
      ? new Set(staffList.filter((s) => s.status === "active" && s.missingRequired.length > 0).map((s) => s.id))
      : new Set()
  );
  const searchRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const params = new URLSearchParams();
    if (query.trim()) params.set("q", query.trim());
    if (room) params.set("room", room);
    if (contractType) params.set("contractType", contractType);
    if (status === "former") params.set("status", "former");
    if (show) params.set("show", show);
    const qs = params.toString();
    window.history.replaceState(window.history.state, "", qs ? `?${qs}` : window.location.pathname);
  }, [query, room, contractType, status, show]);

  const active = staffList.filter((s) => s.status === "active");
  const former = staffList.filter((s) => s.status === "former");
  const inStatus = status === "active" ? active : former;

  const matchesShow = (s: DirectoryStaff) =>
    show === "documents"
      ? s.documentsToRenew > 0
      : show === "reviews"
        ? s.reviewAlert !== null
        : show === "missing"
          ? s.missingRequired.length > 0
          : true;

  const q = normalise(query);
  const visible = inStatus.filter(
    (s) =>
      (!q || normalise(`${s.fullName} ${s.role ?? ""}`).includes(q)) &&
      (!room || (room === NO_ROOM ? !s.roomId : s.roomId === room)) &&
      (!contractType || s.contractType === contractType) &&
      matchesShow(s)
  );

  const counts = {
    documents: active.filter((s) => s.documentsToRenew > 0).length,
    reviews: active.filter((s) => s.reviewAlert !== null).length,
    missing: active.filter((s) => s.missingRequired.length > 0).length,
  };

  function toggleShow(next: Exclude<Show, "">) {
    setStatus("active");
    setShow((current) => (current === next ? "" : next));
    // Show the details of everyone in the "missing" view straight away.
    if (next === "missing" && show !== "missing") {
      setExpanded(new Set(active.filter((s) => s.missingRequired.length > 0).map((s) => s.id)));
    }
  }

  function toggleRow(id: string) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  const filtersOn = Boolean(q || room || contractType || show);
  function clearFilters(focusSearch = true) {
    setQuery("");
    setRoom("");
    setContractType("");
    setShow("");
    if (focusSearch) searchRef.current?.focus();
  }

  const selectClass = "input w-full sm:w-auto";

  return (
    <div className="flex flex-col gap-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <SummaryTile
          label="Active staff"
          value={active.length}
          note="Show everyone"
          pressedNote="Showing everyone"
          pressed={status === "active" && !show && !filtersOn}
          onClick={() => {
            setStatus("active");
            clearFilters(false);
          }}
        />
        <SummaryTile
          label="Documents to renew"
          value={counts.documents}
          note="Expired or due within 90 days"
          tone="attention"
          pressed={show === "documents"}
          onClick={() => toggleShow("documents")}
        />
        <SummaryTile
          label="Qualification reviews due"
          value={counts.reviews}
          note="Overdue or due within 90 days"
          tone="attention"
          pressed={show === "reviews"}
          onClick={() => toggleShow("reviews")}
        />
        <SummaryTile
          label="Missing required documents"
          value={counts.missing}
          note="See what's missing"
          tone="attention"
          pressed={show === "missing"}
          onClick={() => toggleShow("missing")}
        />
      </div>

      <div className="flex flex-col gap-3 rounded-2xl border border-charcoal/10 bg-white p-3 sm:p-4 lg:flex-row lg:items-center">
        <div className="relative flex-1">
          <label htmlFor="staff-search" className="sr-only">
            Search staff by name or role
          </label>
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/60" />
          <input
            ref={searchRef}
            id="staff-search"
            type="search"
            autoComplete="off"
            className="input pl-9"
            placeholder="Search by name or role"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center">
          <label className="sr-only" htmlFor="staff-room">
            Room
          </label>
          <select id="staff-room" className={selectClass} value={room} onChange={(e) => setRoom(e.target.value)}>
            <option value="">All rooms</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
            <option value={NO_ROOM}>No room</option>
          </select>
          <label className="sr-only" htmlFor="staff-contract">
            Employment type
          </label>
          <select
            id="staff-contract"
            className={selectClass}
            value={contractType}
            onChange={(e) => setContractType(e.target.value)}
          >
            <option value="">All types</option>
            {STAFF_CONTRACT_TYPES.map((c) => (
              <option key={c} value={c}>
                {STAFF_CONTRACT_TYPE_LABEL[c]}
              </option>
            ))}
          </select>
          <div role="group" aria-label="Staff status" className="col-span-2 inline-flex rounded-xl border border-charcoal/15 bg-white p-1 sm:col-span-1">
            {(["active", "former"] as const).map((value) => (
              <button
                key={value}
                type="button"
                aria-pressed={status === value}
                onClick={() => {
                  setStatus(value);
                  if (value === "former") setShow("");
                }}
                className={cn(
                  "flex-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
                  status === value ? "bg-charcoal text-white" : "text-charcoal hover:bg-charcoal/5"
                )}
              >
                {value === "active" ? "Active" : "Former"}{" "}
                <span className="opacity-80">{value === "active" ? active.length : former.length}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-charcoal/70">
        <p aria-live="polite">
          Showing <span className="font-semibold text-charcoal">{visible.length}</span> of {inStatus.length}{" "}
          {status === "active" ? "active" : "former"} staff
          {show && <> with {SHOW_LABEL[show]}</>}
        </p>
        {filtersOn && (
          <button
            type="button"
            onClick={() => clearFilters()}
            className="inline-flex items-center gap-1 rounded font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
          >
            <CloseIcon className="h-3.5 w-3.5" />
            Clear filters
          </button>
        )}
      </div>

      {visible.length === 0 ? (
        <div className="rounded-2xl border border-charcoal/10 bg-white px-5 py-10 text-center">
          <p className="font-medium text-charcoal">
            {show ? `No ${status} staff with ${SHOW_LABEL[show]}` : "No staff match these filters"}
          </p>
          {filtersOn && (
            <button type="button" className="btn-secondary mt-3" onClick={() => clearFilters()}>
              Clear filters
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-charcoal/10 overflow-hidden rounded-2xl border border-charcoal/10 bg-white">
          {visible.map((person) => (
            <StaffRow key={person.id} person={person} expanded={expanded.has(person.id)} onToggle={() => toggleRow(person.id)} />
          ))}
        </ul>
      )}
    </div>
  );
}

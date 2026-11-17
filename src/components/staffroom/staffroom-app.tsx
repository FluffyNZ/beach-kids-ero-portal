"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { keepStaffroomAlive, lockStaffroom } from "@/lib/staffroom/actions";
import { Logo } from "@/components/brand/logo";
import type { ChildContactEntry, ChildEntry, RoomGroup, StaffroomDirectory } from "@/lib/staffroom/types";

const ALL_ROOMS = "all";

/** How often an in-use page tells the server it's still being used. */
const KEEPALIVE_MS = 60_000;
/** How often the idle timer checks. */
const TICK_MS = 10_000;

function telHref(phone: string): string {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function firstName(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName;
}

function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`;
}

/** Case-insensitive match on any of the given strings; if the search looks
 * like part of a phone number (3+ digits), also matches on digits alone so
 * "021 123" finds "021-123 4567". */
function matches(haystack: (string | null | undefined)[], query: string): boolean {
  const q = query.trim().toLowerCase();
  if (!q) return true;
  const digits = q.replace(/\D/g, "");
  return haystack.some((h) => {
    if (!h) return false;
    if (h.toLowerCase().includes(q)) return true;
    return digits.length >= 3 && h.replace(/\D/g, "").includes(digits);
  });
}

function PhoneButton({ phone }: { phone: string }) {
  return (
    <a
      href={telHref(phone)}
      className="inline-flex shrink-0 items-center rounded-xl bg-charcoal px-4 py-2.5 text-lg font-semibold tracking-wide text-white active:bg-charcoal/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2"
    >
      {phone}
    </a>
  );
}

/** The red "do not release" box. Shown on a child's card at all times —
 * even when the card is closed — so it can't be missed by someone who only
 * glances at the list. */
function ForbiddenBanner({ childName, contacts }: { childName: string; contacts: ChildContactEntry[] }) {
  if (contacts.length === 0) return null;
  return (
    <div role="alert" className="rounded-xl border-2 border-status-action bg-status-actionBg px-4 py-3">
      <p className="flex flex-wrap items-center gap-2 text-base font-semibold text-charcoal">
        <span className="rounded-md bg-status-action px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-white">
          Forbidden access
        </span>
        Do not release {firstName(childName)} to:
      </p>
      <ul className="mt-1.5">
        {contacts.map((contact) => (
          <li key={contact.id} className="text-lg font-bold text-charcoal">
            {contact.name}
            {contact.relationship && <span className="font-normal text-charcoal/75"> ({contact.relationship})</span>}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ContactRow({ contact }: { contact: ChildContactEntry }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-3">
      <div className="min-w-0">
        <p className="text-lg font-medium text-charcoal">
          {contact.name}
          {contact.relationship && <span className="text-base font-normal text-charcoal/70"> · {contact.relationship}</span>}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {contact.canPickUp ? (
            <span className="badge bg-status-readyBg text-charcoal">
              <span className="h-2 w-2 rounded-full bg-status-ready" aria-hidden="true" />
              Can pick up
            </span>
          ) : (
            <span className="badge bg-status-neutralBg text-charcoal/70">Not listed for pick-up</span>
          )}
          {contact.conditionalAccess && (
            <span className="badge bg-status-attentionBg text-charcoal">Conditional access — check with manager</span>
          )}
          {contact.isPrimaryCaregiver && <span className="badge bg-lilac-100 text-charcoal">Primary caregiver</span>}
          {contact.isEmergency && <span className="badge bg-status-attentionBg text-charcoal">Emergency contact</span>}
        </div>
        {contact.notes && <p className="mt-1 text-sm text-charcoal/70">{contact.notes}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {contact.phone && <PhoneButton phone={contact.phone} />}
        {contact.altPhone && <PhoneButton phone={contact.altPhone} />}
        {!contact.phone && !contact.altPhone && <p className="text-base text-charcoal/70">No number on file</p>}
      </div>
    </div>
  );
}

function ChildCard({ child, open, onToggle }: { child: ChildEntry; open: boolean; onToggle: () => void }) {
  const forbidden = child.contacts.filter((c) => c.forbidden);
  const allowed = child.contacts.filter((c) => !c.forbidden);
  const panelId = `child-contacts-${child.id}`;

  return (
    <section className="card flex flex-col gap-3 p-5">
      <h3>
        <button
          type="button"
          onClick={onToggle}
          aria-expanded={open}
          aria-controls={open ? panelId : undefined}
          className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-4"
        >
          <span className="text-xl font-semibold text-charcoal">{child.name}</span>
          <span className="flex items-center gap-2 text-sm font-normal text-charcoal/70">
            {plural(allowed.length, "contact")}
            <span aria-hidden="true" className="text-base">
              {open ? "▲" : "▼"}
            </span>
          </span>
        </button>
      </h3>

      <ForbiddenBanner childName={child.name} contacts={forbidden} />

      {open && (
        <div id={panelId}>
          {allowed.length === 0 ? (
            <p className="text-base text-charcoal/70">No contacts on file yet.</p>
          ) : (
            <div className="divide-y divide-charcoal/5 border-t border-charcoal/5">
              {allowed.map((contact) => (
                <ContactRow key={contact.id} contact={contact} />
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** The contacts (PIN) page: children's contacts only, grouped by room, with
 * room tabs, one big search box and tap-to-call numbers. Nothing else in
 * Earlydesk is reachable from here.
 *
 * Locking: after `idleMinutes` without a touch/keypress/scroll the screen is
 * covered immediately, the server session is cleared, and it refreshes back
 * to the PIN pad. While the page IS being used it pings the server about
 * once a minute to keep the (shorter) server-side session alive — see
 * lib/staffroom/session.ts. */
export function StaffroomApp({
  directory,
  idleMinutes,
}: {
  directory: StaffroomDirectory;
  idleMinutes: number;
}) {
  const router = useRouter();
  const [roomId, setRoomId] = useState<string>(ALL_ROOMS);
  const [query, setQuery] = useState("");
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [covered, setCovered] = useState(false);
  const lockingRef = useRef(false);
  const idleMs = idleMinutes * 60_000;

  const lockNow = useCallback(() => {
    if (lockingRef.current) return;
    lockingRef.current = true;
    // Hide everything straight away; the server round trip follows.
    setCovered(true);
    lockStaffroom()
      .catch(() => undefined)
      .finally(() => router.refresh());
  }, [router]);

  useEffect(() => {
    let lastActivity = Date.now();
    let lastKeepAlive = Date.now();

    const bump = () => {
      lastActivity = Date.now();
    };
    const activityEvents = ["pointerdown", "touchstart", "keydown", "scroll", "wheel"] as const;
    // capture: true so scrolling inside any inner container counts too.
    activityEvents.forEach((name) => window.addEventListener(name, bump, { capture: true, passive: true }));

    async function check() {
      const now = Date.now();
      if (now - lastActivity >= idleMs) {
        lockNow();
        return;
      }
      if (lastActivity > lastKeepAlive && now - lastKeepAlive >= KEEPALIVE_MS) {
        lastKeepAlive = now;
        try {
          const result = await keepStaffroomAlive();
          if (!result.active) lockNow();
        } catch {
          // Offline blip — try again next tick; the idle lock still applies.
        }
      }
    }

    const timer = window.setInterval(check, TICK_MS);
    // A tablet that's been asleep has frozen timers — re-check the moment it wakes.
    const onVisible = () => {
      if (document.visibilityState === "visible") void check();
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      activityEvents.forEach((name) => window.removeEventListener(name, bump, { capture: true }));
    };
  }, [idleMs, lockNow]);

  const toggle = useCallback((id: string) => {
    setOpenIds((current) => (current.includes(id) ? current.filter((x) => x !== id) : [...current, id]));
  }, []);

  const searching = query.trim().length > 0;
  const totalChildren = directory.rooms.reduce((sum, room) => sum + room.children.length, 0);

  // Search looks across every room, so a name is never "missing" just
  // because a different room tab is selected.
  const visibleRooms: RoomGroup[] = useMemo(() => {
    const rooms = searching || roomId === ALL_ROOMS ? directory.rooms : directory.rooms.filter((r) => r.id === roomId);
    return rooms
      .map((room) => ({
        ...room,
        children: room.children.filter((child) =>
          matches([child.name, ...child.contacts.flatMap((c) => [c.name, c.relationship, c.phone, c.altPhone])], query)
        ),
      }))
      .filter((room) => room.children.length > 0);
  }, [directory.rooms, roomId, query, searching]);

  if (covered) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center gap-4 bg-canvas text-charcoal/70">
        <Logo variant="icon" height={48} decorative />
        Locking…
      </div>
    );
  }

  const tabs = [
    { id: ALL_ROOMS, label: "All rooms", count: totalChildren },
    ...directory.rooms.map((room) => ({ id: room.id, label: room.name, count: room.children.length })),
  ];

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-4">
          <Logo variant="icon" height={44} />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-charcoal md:text-3xl">Children&apos;s contacts</h1>
            <p className="mt-0.5 text-sm text-charcoal/70">
              Tap a child to see who can pick them up. Locks after {idleMinutes} minutes without a touch.
            </p>
          </div>
        </div>
        <button type="button" onClick={lockNow} className="btn-secondary px-5 py-3 text-base">
          Lock now
        </button>
      </header>

      <div
        role="group"
        aria-label="Show children in"
        className="flex gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none]"
      >
        {tabs.map((tab) => {
          const selected = !searching && roomId === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              aria-pressed={selected}
              onClick={() => {
                setRoomId(tab.id);
                setQuery("");
              }}
              className={`shrink-0 rounded-xl px-4 py-3 text-base font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 focus-visible:ring-offset-2 ${
                selected ? "bg-charcoal text-white" : "border border-charcoal/10 bg-white text-charcoal active:bg-charcoal/5"
              }`}
            >
              {tab.label} <span className={selected ? "text-white/75" : "text-charcoal/70"}>{tab.count}</span>
            </button>
          );
        })}
      </div>

      <input
        type="search"
        inputMode="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search all rooms — a child, a contact's name or a number…"
        aria-label="Search children's contacts"
        className="input py-3.5 text-lg"
      />

      {visibleRooms.length === 0 ? (
        <p className="card p-5 text-base text-charcoal/70">
          {searching ? "No children or contacts match that search." : "No children to show."}
        </p>
      ) : (
        visibleRooms.map((room) => (
          <section key={room.id} aria-labelledby={`room-${room.id}`} className="flex flex-col gap-3">
            <h2 id={`room-${room.id}`} className="flex items-baseline gap-2 pt-2 text-lg font-semibold text-charcoal">
              <span className="h-2.5 w-2.5 shrink-0 self-center rounded-full bg-lilac-400" aria-hidden="true" />
              {room.name}
              <span className="text-sm font-normal text-charcoal/70">{room.children.length} {room.children.length === 1 ? "child" : "children"}</span>
            </h2>
            {room.children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                open={searching || openIds.includes(child.id)}
                onToggle={() => toggle(child.id)}
              />
            ))}
          </section>
        ))
      )}
    </div>
  );
}

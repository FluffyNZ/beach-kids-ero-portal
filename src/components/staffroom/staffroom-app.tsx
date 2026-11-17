"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { keepStaffroomAlive, lockStaffroom } from "@/lib/staffroom/actions";
import type { ChildContactEntry, ChildEntry, StaffEntry, StaffroomDirectory } from "@/lib/staffroom/types";

type TabKey = "children" | "staff" | "emergency";

const TABS: { key: TabKey; label: string }[] = [
  { key: "children", label: "Children" },
  { key: "staff", label: "Staff" },
  { key: "emergency", label: "Emergency contacts" },
];

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
      className="inline-flex shrink-0 items-center rounded-xl bg-charcoal px-4 py-2.5 text-lg font-semibold tracking-wide text-white active:bg-charcoal/80"
    >
      {phone}
    </a>
  );
}

/** The red "do not release" box. Shown on a child's card at all times —
 * even when the card is collapsed — so it can't be missed by someone who
 * only glances at the list. */
function ForbiddenBanner({ childName, contacts }: { childName: string; contacts: ChildContactEntry[] }) {
  if (contacts.length === 0) return null;
  return (
    <div role="alert" className="rounded-xl border-2 border-status-action bg-status-actionBg px-4 py-3">
      <p className="text-sm font-bold uppercase tracking-wide text-status-action">
        Forbidden access — do not release {firstName(childName)} to:
      </p>
      <ul className="mt-1">
        {contacts.map((contact) => (
          <li key={contact.id} className="text-lg font-semibold text-status-action">
            {contact.name}
            {contact.relationship && <span className="font-normal"> ({contact.relationship})</span>}
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
          {contact.relationship && <span className="text-base font-normal text-charcoal/55"> · {contact.relationship}</span>}
        </p>
        <div className="mt-1 flex flex-wrap items-center gap-1.5">
          {contact.canPickUp ? (
            <span className="badge bg-status-readyBg text-status-ready">Can pick up</span>
          ) : (
            <span className="badge bg-status-neutralBg text-status-neutral">Not listed for pick-up</span>
          )}
          {contact.conditionalAccess && (
            <span className="badge bg-status-attentionBg text-status-attention">Conditional access — check with manager</span>
          )}
          {contact.isPrimaryCaregiver && <span className="badge bg-charcoal/5 text-charcoal/70">Primary caregiver</span>}
          {contact.isEmergency && <span className="badge bg-status-attentionBg text-status-attention">Emergency contact</span>}
        </div>
        {contact.notes && <p className="mt-1 text-sm text-charcoal/50">{contact.notes}</p>}
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {contact.phone && <PhoneButton phone={contact.phone} />}
        {contact.altPhone && <PhoneButton phone={contact.altPhone} />}
        {!contact.phone && !contact.altPhone && <p className="text-base text-charcoal/45">No number on file</p>}
      </div>
    </div>
  );
}

function ChildCard({
  child,
  open,
  onToggle,
  emergencyOnly = false,
}: {
  child: ChildEntry;
  open: boolean;
  onToggle: () => void;
  emergencyOnly?: boolean;
}) {
  const forbidden = child.contacts.filter((c) => c.forbidden);
  const allowed = child.contacts.filter((c) => !c.forbidden && (!emergencyOnly || c.isEmergency));
  const countLabel = emergencyOnly
    ? `${allowed.length} emergency contact${allowed.length === 1 ? "" : "s"}`
    : `${allowed.length} contact${allowed.length === 1 ? "" : "s"}`;

  return (
    <section className="card flex flex-col gap-3 p-5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full flex-wrap items-center justify-between gap-2 text-left"
      >
        <h3 className="text-xl font-semibold text-charcoal">{child.name}</h3>
        <span className="flex items-center gap-2 text-sm text-charcoal/50">
          {countLabel}
          <span aria-hidden="true" className="text-base">
            {open ? "▲" : "▼"}
          </span>
        </span>
      </button>

      <ForbiddenBanner childName={child.name} contacts={forbidden} />

      {open &&
        (allowed.length === 0 ? (
          <p className="text-base text-charcoal/45">
            {emergencyOnly ? "No emergency contacts on file." : "No contacts on file yet."}
          </p>
        ) : (
          <div className="divide-y divide-charcoal/5 border-t border-charcoal/5">
            {allowed.map((contact) => (
              <ContactRow key={contact.id} contact={contact} />
            ))}
          </div>
        ))}
    </section>
  );
}

function StaffCard({ member, emergencyOnly = false }: { member: StaffEntry; emergencyOnly?: boolean }) {
  return (
    <section className="card p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h3 className="text-xl font-semibold text-charcoal">{member.name}</h3>
        {member.role && <p className="text-sm text-charcoal/55">{member.role}</p>}
      </div>

      {!emergencyOnly && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-medium uppercase tracking-wide text-charcoal/40">Mobile</p>
          {member.mobile ? <PhoneButton phone={member.mobile} /> : <p className="text-base text-charcoal/45">Not on file yet</p>}
        </div>
      )}

      <div className={`${emergencyOnly ? "mt-2" : "mt-3 border-t border-charcoal/5 pt-3"} flex flex-wrap items-center justify-between gap-3`}>
        <div className="min-w-0">
          <p className="text-sm font-medium uppercase tracking-wide text-charcoal/40">Emergency contact</p>
          {member.emergency ? (
            <p className="text-lg text-charcoal">
              {member.emergency.name}
              {member.emergency.relationship && (
                <span className="text-base text-charcoal/55"> · {member.emergency.relationship}</span>
              )}
            </p>
          ) : (
            <p className="text-base text-charcoal/45">Not on file yet</p>
          )}
        </div>
        {member.emergency?.phone && <PhoneButton phone={member.emergency.phone} />}
      </div>
    </section>
  );
}

function EmptyNote({ children }: { children: React.ReactNode }) {
  return <p className="card p-5 text-base text-charcoal/55">{children}</p>;
}

/** The staff-room tablet screen: three tabs (children, staff, emergency
 * contacts), one big search box, and tap-to-call numbers.
 *
 * Children are listed one card per child, each with that child's own
 * contacts and whether each person can pick up. Anyone marked Forbidden
 * Access is shown in a red box on the child's card at all times.
 *
 * Locking: this component also owns the auto-lock. After `idleMinutes`
 * without a touch/keypress/scroll it covers the screen immediately, clears
 * the server session, and refreshes back to the PIN pad. While the page IS
 * being used it pings the server about once a minute to keep the (shorter)
 * server-side session alive — see lib/staffroom/session.ts. */
export function StaffroomApp({
  directory,
  idleMinutes,
}: {
  directory: StaffroomDirectory;
  idleMinutes: number;
}) {
  const router = useRouter();
  const [tab, setTab] = useState<TabKey>("children");
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

  const children = useMemo(
    () =>
      directory.children.filter((child) =>
        matches([child.name, ...child.contacts.flatMap((c) => [c.name, c.relationship, c.phone, c.altPhone])], query)
      ),
    [directory.children, query]
  );

  const staff = useMemo(
    () =>
      directory.staff.filter((s) =>
        matches(
          [s.name, s.role, s.mobile, s.emergency?.name, s.emergency?.relationship, s.emergency?.phone],
          query
        )
      ),
    [directory.staff, query]
  );

  const emergencyChildren = useMemo(
    () => children.filter((child) => child.contacts.some((c) => c.isEmergency && !c.forbidden)),
    [children]
  );
  const emergencyStaff = useMemo(() => staff.filter((s) => s.emergency), [staff]);

  if (covered) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-neutral-50 text-charcoal/50">Locking…</div>
    );
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 px-4 py-6 md:px-8">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold text-charcoal">Staff room contacts</h1>
          <p className="mt-1 text-sm text-charcoal/55">
            Tap a child to see who can pick them up. Tap a number to call. This screen locks itself after {idleMinutes}{" "}
            minutes without a touch.
          </p>
        </div>
        <button type="button" onClick={lockNow} className="btn-secondary px-5 py-3 text-base">
          Lock now
        </button>
      </header>

      <div role="tablist" aria-label="Contact lists" className="grid grid-cols-3 gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-xl px-3 py-3.5 text-base font-semibold transition-colors ${
              tab === t.key ? "bg-charcoal text-white" : "border border-charcoal/10 bg-white text-charcoal/70 active:bg-charcoal/5"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <input
        type="search"
        inputMode="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search a child, a contact's name or a number…"
        aria-label="Search contacts"
        className="input py-3.5 text-lg"
      />

      {tab === "children" && (
        <div className="flex flex-col gap-3">
          {children.length === 0 ? (
            <EmptyNote>No children or contacts match that search.</EmptyNote>
          ) : (
            children.map((child) => (
              <ChildCard
                key={child.id}
                child={child}
                open={searching || openIds.includes(child.id)}
                onToggle={() => toggle(child.id)}
              />
            ))
          )}
        </div>
      )}

      {tab === "staff" && (
        <div className="flex flex-col gap-3">
          {staff.length === 0 ? (
            <EmptyNote>No staff match that search.</EmptyNote>
          ) : (
            staff.map((member) => <StaffCard key={member.id} member={member} />)
          )}
        </div>
      )}

      {tab === "emergency" && (
        <div className="flex flex-col gap-6">
          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-charcoal/50">
              Children&apos;s emergency contacts
            </h2>
            {emergencyChildren.length === 0 ? (
              <EmptyNote>
                {searching
                  ? "No children's emergency contacts match that search."
                  : "No children's emergency contacts are on file yet. A manager can add them in the portal under Children → Contact numbers."}
              </EmptyNote>
            ) : (
              emergencyChildren.map((child) => (
                <ChildCard
                  key={child.id}
                  child={child}
                  emergencyOnly
                  open={searching || openIds.includes(child.id)}
                  onToggle={() => toggle(child.id)}
                />
              ))
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-charcoal/50">Staff emergency contacts</h2>
            {emergencyStaff.length === 0 ? (
              <EmptyNote>
                {searching ? "No staff emergency contacts match that search." : "No staff emergency contacts are on file yet."}
              </EmptyNote>
            ) : (
              emergencyStaff.map((member) => <StaffCard key={member.id} member={member} emergencyOnly />)
            )}
          </div>
        </div>
      )}
    </div>
  );
}

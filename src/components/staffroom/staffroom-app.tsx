"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { keepStaffroomAlive, lockStaffroom } from "@/lib/staffroom/actions";
import type { DirectoryContact, FamilyEntry, StaffEntry, StaffroomDirectory } from "@/lib/staffroom/types";

type TabKey = "children" | "staff" | "emergency";

const TABS: { key: TabKey; label: string }[] = [
  { key: "children", label: "Children & families" },
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

function ContactRow({ contact }: { contact: DirectoryContact }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 py-2.5">
      <div className="min-w-0">
        <p className="text-lg font-medium text-charcoal">{contact.name}</p>
        <p className="flex flex-wrap items-center gap-2 text-sm text-charcoal/55">
          {contact.relationship}
          {contact.isEmergency && <span className="badge bg-status-actionBg text-status-action">Emergency</span>}
        </p>
      </div>
      <PhoneButton phone={contact.phone} />
    </div>
  );
}

function FamilyCard({ family, emergencyOnly = false }: { family: FamilyEntry; emergencyOnly?: boolean }) {
  const contacts = emergencyOnly ? family.contacts.filter((c) => c.isEmergency) : family.contacts;
  return (
    <section className="card p-5">
      <h3 className="text-xl font-semibold text-charcoal">{family.children.join(" · ")}</h3>
      {contacts.length === 0 ? (
        <p className="mt-2 text-base text-charcoal/45">No phone number on file yet.</p>
      ) : (
        <div className="mt-1 divide-y divide-charcoal/5">
          {contacts.map((contact) => (
            <ContactRow key={`${contact.phone}-${contact.name}`} contact={contact} />
          ))}
        </div>
      )}
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

/** The staff-room tablet screen: three tabs (children & families, staff,
 * emergency contacts), one big search box, and tap-to-call numbers.
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

  const families = useMemo(
    () =>
      directory.families.filter((f) =>
        matches([...f.children, ...f.contacts.flatMap((c) => [c.name, c.relationship, c.phone])], query)
      ),
    [directory.families, query]
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

  const emergencyFamilies = useMemo(() => families.filter((f) => f.contacts.some((c) => c.isEmergency)), [families]);
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
            Tap a number to call. This screen locks itself after {idleMinutes} minutes without a touch.
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
        placeholder="Search a name or number…"
        aria-label="Search contacts"
        className="input py-3.5 text-lg"
      />

      {tab === "children" && (
        <div className="flex flex-col gap-3">
          {families.length === 0 ? (
            <EmptyNote>No children or families match that search.</EmptyNote>
          ) : (
            families.map((family) => <FamilyCard key={family.key} family={family} />)
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
            {emergencyFamilies.length === 0 ? (
              <EmptyNote>
                {query.trim()
                  ? "No children's emergency contacts match that search."
                  : "No children's emergency contacts have been marked yet. A manager can add them in the portal under Children → Contact numbers."}
              </EmptyNote>
            ) : (
              emergencyFamilies.map((family) => <FamilyCard key={family.key} family={family} emergencyOnly />)
            )}
          </div>

          <div className="flex flex-col gap-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-charcoal/50">Staff emergency contacts</h2>
            {emergencyStaff.length === 0 ? (
              <EmptyNote>
                {query.trim()
                  ? "No staff emergency contacts match that search."
                  : "No staff emergency contacts are on file yet."}
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

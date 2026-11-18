"use client";

import { createContext, useCallback, useContext, useEffect, useId, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// Shared client-side state for a record page (a child's or staff member's
// profile): which tab is showing and whether its Edit drawer is open. Every
// tab's content is rendered on the server up front, so switching tabs is
// instant and never re-fetches. The current tab is mirrored into ?tab= so a
// link or refresh lands on the same tab.

type ProfileContextValue = {
  tab: string;
  setTab: (tab: string, options?: { scroll?: boolean }) => void;
  editOpen: boolean;
  openEdit: () => void;
  closeEdit: () => void;
};

const ProfileContext = createContext<ProfileContextValue | null>(null);

function useProfile(): ProfileContextValue {
  const ctx = useContext(ProfileContext);
  if (!ctx) throw new Error("Record page controls must be inside <RecordShell>.");
  return ctx;
}

export function useRecordEdit() {
  const { editOpen, openEdit, closeEdit } = useProfile();
  return { editOpen, openEdit, closeEdit };
}

export function RecordShell({
  initialTab,
  tabKeys,
  children,
}: {
  initialTab: string;
  tabKeys: string[];
  children: React.ReactNode;
}) {
  const [tab, setTabState] = useState(tabKeys.includes(initialTab) ? initialTab : tabKeys[0]);
  const [editOpen, setEditOpen] = useState(false);

  const setTab = useCallback(
    (next: string, options?: { scroll?: boolean }) => {
      if (!tabKeys.includes(next)) return;
      setTabState(next);
      const url = new URL(window.location.href);
      if (next === tabKeys[0]) url.searchParams.delete("tab");
      else url.searchParams.set("tab", next);
      window.history.replaceState(window.history.state, "", url.pathname + url.search);
      if (options?.scroll) document.getElementById("profile-tabs")?.scrollIntoView({ behavior: "smooth", block: "start" });
    },
    [tabKeys]
  );

  const value = useMemo(
    () => ({ tab, setTab, editOpen, openEdit: () => setEditOpen(true), closeEdit: () => setEditOpen(false) }),
    [tab, setTab, editOpen]
  );

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export type RecordTab = { key: string; label: string; count?: number; content: React.ReactNode };

/** Underline tabs that scroll sideways on narrow screens (the active tab is
 * kept in view). Arrow keys move between tabs. */
export function RecordTabs({ tabs, label = "Sections" }: { tabs: RecordTab[]; label?: string }) {
  const { tab, setTab } = useProfile();
  const baseId = useId();
  const listRef = useRef<HTMLDivElement>(null);
  const active = tabs.find((t) => t.key === tab) ?? tabs[0];

  useEffect(() => {
    const el = listRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]');
    el?.scrollIntoView({ block: "nearest", inline: "nearest" });
  }, [tab]);

  function onKeyDown(e: React.KeyboardEvent) {
    const idx = tabs.findIndex((t) => t.key === active.key);
    let next = -1;
    if (e.key === "ArrowRight") next = (idx + 1) % tabs.length;
    if (e.key === "ArrowLeft") next = (idx - 1 + tabs.length) % tabs.length;
    if (e.key === "Home") next = 0;
    if (e.key === "End") next = tabs.length - 1;
    if (next < 0) return;
    e.preventDefault();
    setTab(tabs[next].key);
    listRef.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next]?.focus();
  }

  return (
    <div id="profile-tabs" className="flex scroll-mt-4 flex-col gap-5">
      <div
        ref={listRef}
        role="tablist"
        aria-label={label}
        onKeyDown={onKeyDown}
        className="-mx-4 flex gap-1 overflow-x-auto border-b border-charcoal/10 px-4 [scrollbar-width:none] sm:mx-0 sm:px-0 [&::-webkit-scrollbar]:hidden"
      >
        {tabs.map((t) => {
          const selected = t.key === active.key;
          return (
            <button
              key={t.key}
              id={`${baseId}-tab-${t.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`${baseId}-panel-${t.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setTab(t.key)}
              className={cn(
                "-mb-px flex shrink-0 items-center gap-2 border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal",
                selected ? "border-charcoal text-charcoal" : "border-transparent text-charcoal/70 hover:text-charcoal"
              )}
            >
              {t.label}
              {typeof t.count === "number" && t.count > 0 && (
                <span className="rounded-full bg-lilac-100 px-1.5 py-0.5 text-xs font-semibold text-charcoal">{t.count}</span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel" id={`${baseId}-panel-${active.key}`} aria-labelledby={`${baseId}-tab-${active.key}`}>
        {active.content}
      </div>
    </div>
  );
}

/** A small text button that switches to another tab — used for the
 * "View all" / "Edit" links on the Overview panels. */
export function RecordTabLink({ tab, children, className }: { tab: string; children: React.ReactNode; className?: string }) {
  const { setTab } = useProfile();
  return (
    <button
      type="button"
      onClick={() => setTab(tab, { scroll: true })}
      className={cn(
        "shrink-0 rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700",
        className
      )}
    >
      {children}
    </button>
  );
}

/** Opens the record's Edit drawer. `variant="link"` for panel headers. */
export function RecordEditButton({
  variant = "primary",
  children,
}: {
  variant?: "primary" | "link";
  children: React.ReactNode;
}) {
  const { openEdit } = useProfile();
  return (
    <button
      type="button"
      onClick={openEdit}
      aria-haspopup="dialog"
      className={
        variant === "primary"
          ? "btn-primary"
          : "shrink-0 rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
      }
    >
      {children}
    </button>
  );
}

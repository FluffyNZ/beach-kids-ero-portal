"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type TabItem = {
  key: string;
  label: string;
  icon?: React.ReactNode;
  /** Optional trailing count pill, e.g. the number of invoices or emails
   * on record — omit for tabs with nothing to count. */
  count?: number;
  content: React.ReactNode;
};

/**
 * Shared horizontal underline-style tabs — see DESIGN_SYSTEM.md's Components
 * table ("Tabs — new shared component. Horizontal, underline-style
 * (border-b-2 border-burgundy-500 on the active tab, text-charcoal/50
 * inactive → text-charcoal hover), optional trailing count badge per tab").
 * First built for the child profile's tabbed layout; generic enough for any
 * future detail page (staff, bill payer, etc).
 *
 * All tab content is rendered up front by the server component that fetches
 * it — this is purely a client-side show/hide switch, not a data loader, so
 * switching tabs never re-fetches anything.
 */
export function Tabs({ tabs, defaultTab }: { tabs: TabItem[]; defaultTab?: string }) {
  const [active, setActive] = useState(defaultTab ?? tabs[0]?.key);
  const activeTab = tabs.find((t) => t.key === active) ?? tabs[0];

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-1 overflow-x-auto border-b border-charcoal/10" role="tablist">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab?.key;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              onClick={() => setActive(tab.key)}
              className={cn(
                "flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                isActive ? "border-burgundy-500 text-charcoal" : "border-transparent text-charcoal/50 hover:text-charcoal"
              )}
            >
              {tab.icon}
              {tab.label}
              {typeof tab.count === "number" && (
                <span className="rounded-full bg-charcoal/5 px-1.5 py-0.5 text-xs font-semibold text-charcoal/60">
                  {tab.count}
                </span>
              )}
            </button>
          );
        })}
      </div>
      <div role="tabpanel">{activeTab?.content}</div>
    </div>
  );
}

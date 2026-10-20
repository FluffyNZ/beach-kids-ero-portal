"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/marketing", label: "Overview" },
  { href: "/marketing/calendar", label: "Calendar" },
  { href: "/marketing/drafts", label: "Drafts" },
  { href: "/marketing/published", label: "Published" },
  { href: "/marketing/connections", label: "Connections" },
];

function isActive(pathname: string, href: string) {
  if (href === "/marketing") return pathname === "/marketing";
  return pathname === href || pathname.startsWith(href + "/");
}

/** Route-based tabs (each a real page, not a client-side switch) — same
 * underline visual language as the shared src/components/ui/tabs.tsx, but
 * built on Link so each tab is directly linkable/bookmarkable and the
 * heavier per-tab data (Calendar's month grid, Drafts/Published's lists)
 * only loads when that tab is actually open. */
export function MarketingTabs() {
  const pathname = usePathname();
  return (
    <div className="flex gap-1 overflow-x-auto border-b border-charcoal/10" role="tablist">
      {TABS.map((tab) => {
        const active = isActive(pathname, tab.href);
        return (
          <Link
            key={tab.href}
            href={tab.href}
            role="tab"
            aria-selected={active}
            className={cn(
              "flex shrink-0 items-center gap-2 border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
              active ? "border-burgundy-500 text-charcoal" : "border-transparent text-charcoal/50 hover:text-charcoal"
            )}
          >
            {tab.label}
          </Link>
        );
      })}
    </div>
  );
}

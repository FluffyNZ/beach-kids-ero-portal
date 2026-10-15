"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";

const ROSTER_TABS = [
  { label: "Weekly roster", href: "/roster" },
  { label: "Leave & availability", href: "/roster/leave" },
  { label: "Coverage", href: "/roster/coverage" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/roster") return pathname === "/roster";
  return pathname === href || pathname.startsWith(href + "/");
}

/** The Roster area's own horizontal nav — Weekly roster/Leave & availability/
 * Coverage, each a real route (not a client-side tab switch), underline-style
 * per DESIGN_SYSTEM.md's Tabs spec, matching FinanceNav's own pattern. The
 * selected week carries across tabs via ?week=.
 *
 * Room Board, Room Ratios and Attendance Roll predate this redesign and
 * aren't part of the brief's three tabs, but stay reachable (never remove
 * existing routes/functionality) as small secondary links on the right. */
export function RosterNav({ weekStartDate }: { weekStartDate: string }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const week = searchParams?.get("week") ?? weekStartDate;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/10">
      <nav className="flex flex-wrap gap-1 overflow-x-auto" role="tablist" aria-label="Roster sections">
        {ROSTER_TABS.map((tab) => {
          const active = isActive(pathname ?? "", tab.href);
          return (
            <Link
              key={tab.href}
              href={`${tab.href}?week=${week}`}
              role="tab"
              aria-selected={active}
              className={cn(
                "shrink-0 whitespace-nowrap border-b-2 px-3.5 py-2.5 text-sm font-medium transition-colors",
                active ? "border-charcoal text-charcoal" : "border-transparent text-charcoal/50 hover:text-charcoal"
              )}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <div className="mb-1 flex shrink-0 flex-wrap gap-3 text-xs font-medium text-charcoal/40">
        <Link href={`/roster/board?week=${week}`} className="hover:text-charcoal">
          Room board
        </Link>
        <Link href="/roster/ratios" className="hover:text-charcoal">
          Room ratios
        </Link>
        <Link href="/roster/attendance-roll" className="hover:text-charcoal">
          Attendance roll
        </Link>
      </div>
    </div>
  );
}

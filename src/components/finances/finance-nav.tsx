"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const FINANCE_TABS = [
  { label: "Overview", href: "/finances" },
  { label: "Income", href: "/finances/income" },
  { label: "Fees", href: "/finances/fees" },
  { label: "Invoices", href: "/finances/invoices" },
  { label: "Statements", href: "/finances/statements" },
  { label: "Family accounts", href: "/finances/clients" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/finances") return pathname === "/finances";
  return pathname === href || pathname.startsWith(href + "/");
}

/** The Finance area's own horizontal nav — Overview/Income/Fees/Invoices/
 * Statements/Family accounts, each a real route (not a client-side tab
 * switch), underline-style per DESIGN_SYSTEM.md's Tabs spec. "Family
 * accounts" is the brief's label for the existing /finances/clients route
 * — the route itself isn't renamed, so nothing that already links to
 * /finances/clients (e.g. the child profile's Finance tab) breaks.
 *
 * The small "Connections" link on the right is the brief's "keep Xero
 * accessible through a small action" requirement — it replaces the old
 * Overview's full-size "Xero bank sync" card, but stays reachable from
 * every Finance page rather than only Overview. */
export function FinanceNav() {
  const pathname = usePathname();

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-charcoal/10">
      <nav className="flex flex-wrap gap-1 overflow-x-auto" role="tablist" aria-label="Finance sections">
        {FINANCE_TABS.map((tab) => {
          const active = isActive(pathname, tab.href);
          return (
            <Link
              key={tab.href}
              href={tab.href}
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
      <Link
        href="/finances/xero"
        className="mb-1 shrink-0 text-xs font-medium text-charcoal/40 hover:text-charcoal"
        title="Xero bank sync connection"
      >
        Connections
      </Link>
    </div>
  );
}

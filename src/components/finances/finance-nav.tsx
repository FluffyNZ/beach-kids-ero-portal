"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export const FINANCE_SECTIONS = [
  { label: "Overview", href: "/finances" },
  { label: "Income", href: "/finances/income" },
  { label: "Fees", href: "/finances/fees" },
  { label: "Invoices", href: "/finances/invoices" },
  { label: "Statements", href: "/finances/statements" },
  { label: "Family accounts", href: "/finances/clients" },
  { label: "Connections", href: "/finances/xero" },
] as const;

function isActive(pathname: string, href: string): boolean {
  if (href === "/finances") return pathname === "/finances";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** The Finance area's section navigation, shown at the top of every
 * Finance page. Each section is its own page. */
export function FinanceNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Finance sections" className="-mx-4 overflow-x-auto border-b border-charcoal/10 px-4 md:mx-0 md:px-0 print:hidden">
      <ul className="flex min-w-max gap-1">
        {FINANCE_SECTIONS.map((s) => {
          const active = isActive(pathname, s.href);
          return (
            <li key={s.href}>
              <Link
                href={s.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "-mb-px block whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal",
                  active ? "border-lilac-600 text-charcoal" : "border-transparent text-charcoal/70 hover:border-charcoal/20 hover:text-charcoal"
                )}
              >
                {s.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

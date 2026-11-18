"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const SECTIONS = [
  { label: "Overview", href: "/email" },
  { label: "Templates", href: "/email/templates" },
  { label: "History", href: "/email/history" },
  { label: "Enquiries", href: "/email/enquiries" },
] as const;

/** Section navigation for the Email area. */
export function EmailNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Email sections" className="-mx-4 overflow-x-auto border-b border-charcoal/10 px-4 md:mx-0 md:px-0">
      <ul className="flex min-w-max gap-1">
        {SECTIONS.map((s) => {
          const active = s.href === "/email" ? pathname === "/email" : pathname === s.href || pathname.startsWith(`${s.href}/`);
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

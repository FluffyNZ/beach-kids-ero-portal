"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { Modal } from "@/components/ui/modal";
import {
  DashboardIcon,
  ChecklistIcon,
  LibraryIcon,
  PolicyIcon,
  StaffIcon,
  RosterIcon,
  ChildrenIcon,
  ActionsIcon,
  PackIcon,
  SettingsIcon,
  StockIcon,
  FinancesIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  MoreIcon,
  CalendarIcon,
} from "@/components/icons";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: DashboardIcon,
  checklist: ChecklistIcon,
  library: LibraryIcon,
  policies: PolicyIcon,
  records: ShieldCheckIcon,
  learning: BookOpenIcon,
  staff: StaffIcon,
  roster: RosterIcon,
  children: ChildrenIcon,
  calendar: CalendarIcon,
  stock: StockIcon,
  finances: FinancesIcon,
  actions: ActionsIcon,
  pack: PackIcon,
  settings: SettingsIcon,
};

// Only a handful of items fit a thumb-sized bottom bar before the icons and
// labels become too small to read or tap reliably (this is what Ethan
// flagged — all 14 sections were squeezed into one row). These four cover
// day-to-day use; everything else lives one tap away behind "More".
const PRIMARY_HREFS = ["/dashboard", "/checklist", "/records", "/actions"];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);

  const primaryItems = NAV_ITEMS.filter((item) => PRIMARY_HREFS.includes(item.href));
  const moreItems = NAV_ITEMS.filter((item) => !PRIMARY_HREFS.includes(item.href));
  const moreActive = moreItems.some((item) => isActive(pathname, item.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-charcoal/10 bg-white/95 px-1 py-1.5 backdrop-blur md:hidden">
        {primaryItems.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(pathname, item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium",
                active ? "text-burgundy-600" : "text-charcoal/40"
              )}
            >
              <Icon className="h-6 w-6" />
              <span className="truncate px-0.5">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium",
            moreActive ? "text-burgundy-600" : "text-charcoal/40"
          )}
        >
          <MoreIcon className="h-6 w-6" />
          <span className="truncate px-0.5">More</span>
        </button>
      </nav>

      <Modal open={moreOpen} onClose={() => setMoreOpen(false)} title="More">
        <nav className="grid grid-cols-2 gap-2">
          {moreItems.map((item) => {
            const Icon = ICONS[item.icon];
            const active = isActive(pathname, item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-sm font-medium",
                  active
                    ? "border-burgundy-200 bg-burgundy-50 text-burgundy-600"
                    : "border-charcoal/10 text-charcoal hover:bg-sand-100"
                )}
              >
                <Icon className="h-6 w-6" />
                {item.label}
              </Link>
            );
          })}
        </nav>
      </Modal>
    </>
  );
}

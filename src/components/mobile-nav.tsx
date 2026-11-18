"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS, activeNavIndex } from "@/lib/constants";
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
  MailIcon,
  MegaphoneIcon,
  AttendanceIcon,
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
  attendance: AttendanceIcon,
  calendar: CalendarIcon,
  email: MailIcon,
  marketing: MegaphoneIcon,
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

// Attendance also owns the printable booked roll under /roster.
const ALSO_ACTIVE_FOR: Record<string, string[]> = { "/children/hours": ["/roster/attendance-roll"] };

export function MobileNav() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  // Only the single most specific match is highlighted (e.g. Attendance,
  // not Children as well, on /children/hours).
  const currentHref =
    NAV_ITEMS[activeNavIndex(pathname, NAV_ITEMS.map((i) => ({ href: i.href, alsoActiveFor: ALSO_ACTIVE_FOR[i.href] })))]?.href;
  const isActive = (href: string) => href === currentHref;

  const primaryItems = NAV_ITEMS.filter((item) => PRIMARY_HREFS.includes(item.href));
  const moreItems = NAV_ITEMS.filter((item) => !PRIMARY_HREFS.includes(item.href));
  const moreActive = moreItems.some((item) => isActive(item.href));

  return (
    <>
      <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-charcoal/10 bg-white/95 px-1 py-1.5 backdrop-blur md:hidden print:hidden">
        {primaryItems.map((item) => {
          const Icon = ICONS[item.icon];
          const active = isActive(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex flex-1 flex-col items-center gap-1 rounded-lg py-1.5 text-xs font-medium",
                active ? "text-charcoal" : "text-charcoal/40"
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
            moreActive ? "text-charcoal" : "text-charcoal/40"
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
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMoreOpen(false)}
                className={cn(
                  "flex flex-col items-center gap-2 rounded-xl border px-3 py-4 text-center text-sm font-medium",
                  active
                    ? "border-lilac-200 bg-lilac-100 text-charcoal"
                    : "border-charcoal/10 text-charcoal hover:bg-charcoal/5"
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

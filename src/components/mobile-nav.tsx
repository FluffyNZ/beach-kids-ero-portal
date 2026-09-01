"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_ITEMS } from "@/lib/constants";
import { cn } from "@/lib/utils";
import {
  DashboardIcon,
  ChecklistIcon,
  LibraryIcon,
  PolicyIcon,
  StaffIcon,
  ActionsIcon,
  PackIcon,
  SettingsIcon,
} from "@/components/icons";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  dashboard: DashboardIcon,
  checklist: ChecklistIcon,
  library: LibraryIcon,
  policies: PolicyIcon,
  staff: StaffIcon,
  actions: ActionsIcon,
  pack: PackIcon,
  settings: SettingsIcon,
};

export function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 flex border-t border-charcoal/10 bg-white/95 px-1 py-1.5 backdrop-blur md:hidden">
      {NAV_ITEMS.map((item) => {
        const Icon = ICONS[item.icon];
        const active = pathname === item.href || pathname.startsWith(item.href + "/");
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex flex-1 flex-col items-center gap-0.5 rounded-lg py-1.5 text-[10px] font-medium",
              active ? "text-burgundy-600" : "text-charcoal/40"
            )}
          >
            <Icon className="h-5 w-5" />
            <span className="truncate px-0.5">{item.label.split(" ")[0]}</span>
          </Link>
        );
      })}
    </nav>
  );
}

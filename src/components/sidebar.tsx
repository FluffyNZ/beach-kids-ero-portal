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
  RosterIcon,
  ChildrenIcon,
  ActionsIcon,
  PackIcon,
  SettingsIcon,
  StockIcon,
  FinancesIcon,
  WaveIcon,
  ShieldCheckIcon,
  BookOpenIcon,
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
  stock: StockIcon,
  finances: FinancesIcon,
  actions: ActionsIcon,
  pack: PackIcon,
  settings: SettingsIcon,
};

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col bg-burgundy-500 px-4 py-6 md:flex">
      <Link href="/dashboard" className="mb-8 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/15 text-white">
          <WaveIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block font-display text-base font-semibold leading-tight text-white">
            Beach Kids
          </span>
          <span className="block text-xs leading-tight text-pink-100/80">ERO Self-Audit Portal</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const Icon = ICONS[item.icon];
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-white text-burgundy-600 shadow-card"
                  : "text-pink-100/85 hover:bg-white/10 hover:text-white"
              )}
            >
              <Icon className="h-5 w-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

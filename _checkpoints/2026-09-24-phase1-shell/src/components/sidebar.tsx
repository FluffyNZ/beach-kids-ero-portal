"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS } from "@/lib/constants";
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

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-charcoal/10 bg-white px-3 py-5 md:flex">
      <Link href="/dashboard" className="mb-6 flex items-center gap-2.5 px-2">
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-burgundy-500 text-white">
          <WaveIcon className="h-5 w-5" />
        </span>
        <span>
          <span className="block text-sm font-semibold leading-tight text-charcoal">Beach Kids</span>
          <span className="block text-xs leading-tight text-charcoal/45">ERO Self-Audit Portal</span>
        </span>
      </Link>

      <nav className="flex flex-1 flex-col gap-5 overflow-y-auto pb-2">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-charcoal/35">
              {group.label}
            </p>
            {group.items.map((item) => {
              const Icon = ICONS[item.icon];
              const active = pathname === item.href || pathname.startsWith(item.href + "/");
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 rounded-full px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-burgundy-50 text-burgundy-600"
                      : "text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        ))}
      </nav>
    </aside>
  );
}

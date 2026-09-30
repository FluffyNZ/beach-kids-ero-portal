"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { NAV_GROUPS, NAV_BOTTOM_ITEMS, type ShellNavItem } from "@/lib/constants";
import { cn } from "@/lib/utils";
import { signOut } from "@/lib/actions/auth";
import { Avatar } from "@/components/ui/avatar";
import { IconButton } from "@/components/ui/icon-button";
import {
  HomeIcon,
  ChecklistIcon,
  PolicyIcon,
  StaffIcon,
  RoomsIcon,
  AttendanceIcon,
  ChildrenIcon,
  ActionsIcon,
  SettingsIcon,
  StockIcon,
  FinancesIcon,
  WaveIcon,
  ShieldCheckIcon,
  BookOpenIcon,
  CalendarIcon,
  MessagesIcon,
  RecordsFolderIcon,
  ReportsIcon,
  HelpIcon,
  ChevronDownIcon,
  LogoutIcon,
} from "@/components/icons";

const ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  home: HomeIcon,
  children: ChildrenIcon,
  staff: StaffIcon,
  rooms: RoomsIcon,
  attendance: AttendanceIcon,
  learning: BookOpenIcon,
  messages: MessagesIcon,
  calendar: CalendarIcon,
  actions: ActionsIcon,
  recordsFolder: RecordsFolderIcon,
  finances: FinancesIcon,
  stock: StockIcon,
  checklist: ChecklistIcon,
  policies: PolicyIcon,
  records: ShieldCheckIcon,
  reports: ReportsIcon,
  help: HelpIcon,
  settings: SettingsIcon,
};

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(href + "/");
}

function NavRow({ item, pathname }: { item: ShellNavItem; pathname: string }) {
  const Icon = ICONS[item.icon];
  const hasChildren = Boolean(item.children?.length);
  const childActive = item.children?.some((c) => isActive(pathname, c.href)) ?? false;
  const active = (item.href ? isActive(pathname, item.href) : false) || childActive;
  const [open, setOpen] = useState(childActive);

  if (item.status === "soon") {
    return (
      <div
        className="flex cursor-default items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-charcoal/30"
        title="Coming soon — not built yet"
      >
        <Icon className="h-[18px] w-[18px] shrink-0" />
        <span className="truncate">{item.label}</span>
        <span className="badge ml-auto bg-charcoal/5 px-2 py-0.5 text-[10px] text-charcoal/40">Soon</span>
      </div>
    );
  }

  return (
    <div>
      {/* Phase 3 (Contra visual refit): a subtle, rectangular pale-lilac
          active state — replaces the previous fully-rounded burgundy pill.
          Colour/weight live on this wrapper; the Link and toggle button
          inherit them (Tailwind's preflight sets `a { color: inherit }`),
          so this is the only place "active" styling is decided. */}
      <div
        className={cn(
          "group flex items-center rounded-lg transition-colors",
          active ? "bg-lilac-100 font-semibold text-charcoal" : "font-medium text-charcoal/60 hover:bg-charcoal/5 hover:text-charcoal"
        )}
      >
        <Link href={item.href!} className="flex flex-1 items-center gap-3 px-3 py-2 text-sm">
          <Icon className="h-[18px] w-[18px] shrink-0" />
          <span className="truncate">{item.label}</span>
        </Link>
        {hasChildren && (
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-label={open ? `Collapse ${item.label}` : `Expand ${item.label}`}
            className="mr-1.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full hover:bg-charcoal/10"
          >
            <ChevronDownIcon className={cn("h-3.5 w-3.5 transition-transform", open ? "rotate-180" : "")} />
          </button>
        )}
      </div>

      {hasChildren && open && (
        <div className="ml-[26px] mt-0.5 flex flex-col gap-0.5 border-l border-charcoal/10 pl-3">
          {item.children!.map((child) => {
            const childIsActive = isActive(pathname, child.href);
            return (
              <Link
                key={child.href}
                href={child.href}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm transition-colors",
                  childIsActive
                    ? "bg-lilac-100 font-medium text-charcoal"
                    : "text-charcoal/55 hover:bg-charcoal/5 hover:text-charcoal"
                )}
              >
                {child.label}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function Sidebar({
  userName,
  userEmail,
}: {
  userName: string;
  userEmail?: string | null;
}) {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-charcoal/10 bg-white md:flex">
      {/* Phase 3 (Contra visual refit): styled as a bordered "workspace"
          box near the top, matching Contra's proportions for that slot.
          Beach Kids only ever has the one centre, so — unlike Contra —
          there's nothing to switch between and no dropdown chevron here;
          it's a real link back to Home, not a fake workspace switcher. */}
      <div className="px-3 pb-2 pt-4">
        <Link
          href="/dashboard"
          className="flex items-center gap-2.5 rounded-xl border border-charcoal/10 px-3 py-2.5 transition-colors hover:bg-charcoal/[0.03]"
        >
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-charcoal text-white">
            <WaveIcon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold leading-tight text-charcoal">Beach Kids</span>
            <span className="block truncate text-xs leading-tight text-charcoal/45">Centre Management</span>
          </span>
        </Link>
      </div>

      <nav className="flex flex-1 flex-col gap-4 overflow-y-auto px-3 pb-2 pt-1">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="flex flex-col gap-0.5">
            <p className="px-3 pb-1 pt-1 text-[10px] font-medium uppercase tracking-wider text-charcoal/30">
              {group.label}
            </p>
            {group.items.map((item) => (
              <NavRow key={item.label} item={item} pathname={pathname} />
            ))}
          </div>
        ))}
      </nav>

      <div className="flex flex-col gap-0.5 border-t border-charcoal/10 px-3 py-3">
        {NAV_BOTTOM_ITEMS.map((item) => (
          <NavRow key={item.label} item={item} pathname={pathname} />
        ))}
      </div>

      <div className="flex items-center gap-2.5 border-t border-charcoal/10 px-4 py-3">
        <Avatar name={userName} size="md" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-charcoal">{userName}</p>
          {userEmail && <p className="truncate text-xs text-charcoal/45">{userEmail}</p>}
        </div>
        <form action={signOut}>
          <IconButton label="Sign out" size="sm" type="submit">
            <LogoutIcon className="h-4 w-4" />
          </IconButton>
        </form>
      </div>
    </aside>
  );
}

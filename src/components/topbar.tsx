"use client";

import { usePathname } from "next/navigation";
import { signOut } from "@/lib/actions/auth";
import { getPageTitle } from "@/lib/constants";
import { IconButton } from "@/components/ui/icon-button";
import { SearchIcon, BellIcon, LogoutIcon } from "@/components/icons";

/**
 * Phase 3 (Contra visual refit): a genuinely persistent top header, shown
 * on every screen size and every page — not the old mobile-only user pill.
 * It matches Contra's proportions (~64px, white, thin bottom border, page
 * title left, icon actions right) rather than being redesigned per page.
 *
 * The page title is derived from the route via `getPageTitle` (same nav
 * data the sidebar renders from) so every existing page gets a consistent
 * header without having to declare its own title — nothing about the pages
 * themselves changes.
 *
 * Search and Notifications are shown disabled/"coming soon", same as the
 * Home dashboard's header used to show them — there's no real search or
 * notifications feature anywhere in the app yet, so this is the one place
 * those icons live now (removed from the Home dashboard to avoid showing
 * them twice).
 *
 * Sign-out stays available here on mobile only: the desktop sidebar (which
 * carries the real account footer + sign-out) is hidden below the `md`
 * breakpoint, so without this the mobile sign-out button from the old
 * Topbar would disappear entirely.
 */
export function Topbar() {
  const pathname = usePathname();
  const title = getPageTitle(pathname);

  return (
    <header className="sticky top-0 z-10 flex h-16 shrink-0 items-center justify-between border-b border-charcoal/10 bg-white px-4 md:px-8">
      <h1 className="truncate text-base font-semibold text-charcoal md:text-lg">{title}</h1>
      <div className="flex shrink-0 items-center gap-1">
        <IconButton label="Search — coming soon" disabled>
          <SearchIcon className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton label="Notifications — coming soon" disabled>
          <BellIcon className="h-[18px] w-[18px]" />
        </IconButton>
        <form action={signOut} className="md:hidden">
          <IconButton label="Sign out" type="submit">
            <LogoutIcon className="h-[18px] w-[18px]" />
          </IconButton>
        </form>
      </div>
    </header>
  );
}

import Link from "next/link";
import { signOut } from "@/lib/actions/auth";
import { Logo } from "@/components/brand/logo";
import { LogoutIcon } from "@/components/icons";
import { initials } from "@/lib/utils";

// Desktop now shows the signed-in user and sign-out at the bottom of the
// sidebar (see sidebar.tsx's account footer), so this bar only needs to
// exist on mobile, where the sidebar itself is hidden — hence `md:hidden`
// on the whole header rather than duplicating the account pill on desktop.
export function Topbar({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-charcoal/10 bg-white/90 px-4 py-3 backdrop-blur md:hidden print:hidden">
      <Link
        href="/dashboard"
        aria-label="Earlydesk — go to Home"
        className="rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40"
      >
        <Logo variant="full" height={22} decorative className="hidden min-[360px]:block" />
        <Logo variant="icon" height={30} decorative className="min-[360px]:hidden" />
      </Link>
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-neutral-100 px-2 py-1 pr-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-burgundy-50 text-xs font-semibold text-burgundy-600">
            {initials(userName)}
          </span>
          <span className="hidden text-sm font-medium text-charcoal sm:inline">{userName}</span>
        </div>

        <form action={signOut}>
          <button type="submit" className="btn-ghost" aria-label="Sign out" title="Sign out">
            <LogoutIcon className="h-5 w-5" />
            <span className="hidden sm:inline">Sign out</span>
          </button>
        </form>
      </div>
    </header>
  );
}

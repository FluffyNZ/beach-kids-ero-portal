import { signOut } from "@/lib/actions/auth";
import { LogoutIcon } from "@/components/icons";
import { initials } from "@/lib/utils";

export function Topbar({ userName }: { userName: string }) {
  return (
    <header className="sticky top-0 z-10 flex items-center justify-end border-b border-charcoal/10 bg-cream/90 px-4 py-3 backdrop-blur md:px-8 md:py-4">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 rounded-full bg-white px-2 py-1 pr-3 shadow-card">
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

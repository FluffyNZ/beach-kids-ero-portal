import { QuickCreateMenu } from "@/components/dashboard/quick-create-menu";

/**
 * Phase 3 (Contra visual refit): Search and Notifications moved up into the
 * new persistent global header (see topbar.tsx) — showing them here too
 * would duplicate them on every page they're visible on. This keeps only
 * what's specific to Home: the greeting/date and Quick Create. The greeting
 * is also noticeably smaller than before — Contra doesn't use an oversized
 * hero-style dashboard greeting (see DESIGN_SYSTEM.md's Phase 3 notes).
 */
export function HomeHeader({ greeting, dateLabel }: { greeting: string; dateLabel: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight text-charcoal md:text-2xl">{greeting}</h2>
        <p className="mt-1 text-sm text-charcoal/60">{dateLabel}</p>
      </div>
      <QuickCreateMenu />
    </div>
  );
}

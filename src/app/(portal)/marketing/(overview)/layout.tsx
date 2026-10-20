import { MarketingTabs } from "@/components/marketing/marketing-tabs";
import { CreatePostButton } from "@/components/marketing/create-post-button";

// A route group (not reflected in the URL) so this tabbed header only
// wraps the Overview/Calendar/Drafts/Published/Connections pages — the
// Create/Edit post screen (src/app/(portal)/marketing/posts/*) lives
// outside this group and gets its own simpler header instead, since tabs
// + a global "+ Create post" button don't make sense on top of a form
// that IS that create flow.
export default function MarketingOverviewLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Marketing</h1>
          <p className="mt-1 text-sm text-charcoal/60">Plan and share moments from Beach Kids.</p>
        </div>
        <CreatePostButton />
      </div>
      <MarketingTabs />
      {children}
    </div>
  );
}

import { SearchIcon, BellIcon } from "@/components/icons";
import { IconButton } from "@/components/ui/icon-button";
import { QuickCreateMenu } from "@/components/dashboard/quick-create-menu";

/**
 * Top of the Home dashboard. Search and Notifications are shown disabled
 * ("coming soon") rather than wired up — neither has a real implementation
 * anywhere in the app yet, so they'd otherwise look functional and not be.
 * Quick Create is real: every item in it opens an existing creation flow.
 */
export function HomeHeader({ greeting, dateLabel }: { greeting: string; dateLabel: string }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-charcoal md:text-3xl">{greeting}</h1>
        <p className="mt-1 text-sm text-charcoal/60">{dateLabel}</p>
      </div>
      <div className="flex items-center gap-1.5">
        <IconButton label="Search — coming soon" disabled>
          <SearchIcon className="h-[18px] w-[18px]" />
        </IconButton>
        <IconButton label="Notifications — coming soon" disabled>
          <BellIcon className="h-[18px] w-[18px]" />
        </IconButton>
        <QuickCreateMenu />
      </div>
    </div>
  );
}

import { QuickCreateMenu } from "@/components/dashboard/quick-create-menu";

export function DashboardHeader({
  greeting,
  dateLabel,
  centreName,
}: {
  greeting: string;
  dateLabel: string;
  centreName: string;
}) {
  return (
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="text-2xl font-semibold tracking-tight text-charcoal md:text-[1.75rem]">{greeting}</h1>
        <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-charcoal/70">
          <span>{dateLabel}</span>
          <span aria-hidden="true">·</span>
          <span className="inline-flex items-center gap-1.5 font-medium text-charcoal">
            <span aria-hidden="true" className="h-2 w-2 rounded-full bg-lilac-400" />
            {centreName}
          </span>
        </p>
      </div>
      <QuickCreateMenu />
    </header>
  );
}

import { cn } from "@/lib/utils";

type ChipTone = "lilac" | "attention" | "neutral";

const CHIP_CLASSES: Record<ChipTone, string> = {
  lilac: "bg-lilac-100 text-lilac-600",
  attention: "bg-status-actionBg text-status-action",
  neutral: "bg-charcoal/5 text-charcoal/60",
};

/** One Finance Overview summary card — a small icon chip over a label and
 * a bold figure, with an optional one-line note underneath (e.g. "$1,150
 * of this is overdue"). The lilac icon chip is a deliberate, scoped use of
 * the lilac token beyond its usual sidebar/avatar role — matching the
 * attached reference image's card style specifically for this dashboard,
 * per the brief. `attention` swaps the chip (and the figure) to the
 * status-action red, for the Overdue fees card. */
export function FinanceStatCard({
  label,
  value,
  note,
  icon,
  tone = "lilac",
}: {
  label: string;
  value: string;
  note?: string;
  icon: React.ReactNode;
  tone?: ChipTone;
}) {
  return (
    <div className="card flex flex-col gap-3 p-5">
      <span className={cn("flex h-9 w-9 items-center justify-center rounded-full", CHIP_CLASSES[tone])}>{icon}</span>
      <div>
        <p className="text-xs font-medium text-charcoal/50">{label}</p>
        <p className={cn("mt-0.5 text-2xl font-bold tracking-tight md:text-[1.75rem]", tone === "attention" ? "text-status-action" : "text-charcoal")}>
          {value}
        </p>
      </div>
      {note && <p className="text-xs text-charcoal/45">{note}</p>}
    </div>
  );
}

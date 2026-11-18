import { cn } from "@/lib/utils";

/** A short, calm "nothing here" message — one line of what's empty and,
 * optionally, a second line on what will appear (or what to do). Kept
 * deliberately small so an empty section doesn't take over the page. */
export function EmptyState({
  title,
  description,
  tone = "neutral",
  className,
}: {
  title: string;
  description?: React.ReactNode;
  tone?: "neutral" | "positive";
  className?: string;
}) {
  return (
    <div className={cn("flex items-start gap-3 px-5 py-4", className)}>
      <span
        aria-hidden="true"
        className={cn(
          "mt-1.5 h-2 w-2 shrink-0 rounded-full",
          tone === "positive" ? "bg-status-ready" : "bg-lilac-400"
        )}
      />
      <div>
        <p className="text-sm font-medium text-charcoal">{title}</p>
        {description && <p className="mt-0.5 text-sm text-charcoal/70">{description}</p>}
      </div>
    </div>
  );
}

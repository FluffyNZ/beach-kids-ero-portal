import Link from "next/link";
import { cn } from "@/lib/utils";

/** The standard Earlydesk content panel: a white, softly rounded surface
 * with a subtle border, a short heading, optional one-line description and
 * an optional text link on the right ("View all", "View calendar"…).
 * Use `bodyClassName` for the content's padding — lists usually want none
 * (rows bring their own), plain content usually wants "px-5 pb-5". */
export function Panel({
  id,
  title,
  description,
  action,
  count,
  className,
  bodyClassName,
  children,
}: {
  id?: string;
  title: string;
  description?: React.ReactNode;
  action?: { label: string; href: string };
  /** Small number shown beside the title, e.g. how many items there are. */
  count?: number;
  className?: string;
  bodyClassName?: string;
  children: React.ReactNode;
}) {
  const headingId = id ? `${id}-heading` : undefined;
  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn("flex flex-col rounded-2xl border border-charcoal/10 bg-white", className)}
    >
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-5 pb-3 pt-4">
        <div className="min-w-0">
          <h2 id={headingId} className="flex items-center gap-2 text-base font-semibold text-charcoal">
            {title}
            {count !== undefined && (
              <span className="rounded-full bg-lilac-100 px-2 py-0.5 text-xs font-semibold text-charcoal">{count}</span>
            )}
          </h2>
          {description && <p className="mt-0.5 text-sm text-charcoal/70">{description}</p>}
        </div>
        {action && (
          <Link
            href={action.href}
            className="shrink-0 rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
          >
            {action.label}
          </Link>
        )}
      </header>
      <div className={cn("flex-1", bodyClassName)}>{children}</div>
    </section>
  );
}

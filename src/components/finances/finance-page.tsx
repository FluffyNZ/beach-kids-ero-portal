import { FinanceNav } from "@/components/finances/finance-nav";
import { PageHeader } from "@/components/ui/page-header";
import { cn } from "@/lib/utils";

/** The shared frame for every Finance page: section navigation, then the
 * page title, one-line description and page actions, at one width. */
export function FinancePage({
  title,
  description,
  actions,
  children,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 [contain:inline-size] print:max-w-none print:gap-0 print:[contain:none]">
      <FinanceNav />
      <div className="print:hidden">
        <PageHeader title={title} description={description} actions={actions} />
      </div>
      {children}
    </div>
  );
}

export type Figure = {
  label: string;
  value: React.ReactNode;
  /** What the figure covers, e.g. "Payments dated 1–30 Nov 2026". */
  scope: React.ReactNode;
  detail?: React.ReactNode;
  emphasis?: "attention" | "action";
};

/** A row of headline figures, each with its scope written underneath so
 * period totals and current balances can't be confused. */
export function FigureStrip({ figures, className }: { figures: Figure[]; className?: string }) {
  return (
    <dl
      className={cn(
        "grid grid-cols-1 divide-y divide-charcoal/10 rounded-2xl border border-charcoal/10 bg-white sm:grid-cols-2 sm:divide-y-0 lg:divide-x",
        figures.length >= 4 ? "lg:grid-cols-4" : figures.length === 3 ? "lg:grid-cols-3" : "lg:grid-cols-2",
        className
      )}
    >
      {figures.map((f, i) => (
        <div
          key={f.label}
          className={cn(
            "flex flex-col gap-1 px-5 py-4",
            i >= 2 && "sm:border-t sm:border-charcoal/10 lg:border-t-0",
            i % 2 === 1 && "sm:border-l sm:border-charcoal/10 lg:border-l-0"
          )}
        >
          <dt className="flex items-center gap-2 text-sm font-medium text-charcoal">
            {f.emphasis && (
              <span aria-hidden="true" className={cn("h-2 w-2 rounded-full", f.emphasis === "action" ? "bg-status-action" : "bg-status-attention")} />
            )}
            {f.label}
          </dt>
          <dd className="text-2xl font-semibold tabular-nums tracking-tight text-charcoal">{f.value}</dd>
          <dd className="text-xs text-charcoal/70">{f.scope}</dd>
          {f.detail && <dd className="text-xs text-charcoal/70">{f.detail}</dd>}
        </div>
      ))}
    </dl>
  );
}

/** Standard search box used by Finance tables. */
export function SearchField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="min-w-0 flex-1 sm:max-w-xs">
      <label htmlFor={id} className="sr-only">
        {label}
      </label>
      <input id={id} type="search" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} className="input" />
    </div>
  );
}

/** Pill-style filter buttons with counts. */
export function FilterChips<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: Array<{ value: T; label: string; count?: number }>;
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-1.5">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={value === o.value}
          onClick={() => onChange(o.value)}
          className={cn(
            "inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal",
            value === o.value ? "border-lilac-600 bg-lilac-100 text-charcoal" : "border-charcoal/15 bg-white text-charcoal hover:bg-lilac-50"
          )}
        >
          {o.label}
          {o.count !== undefined && <span className="tabular-nums text-charcoal/70">{o.count}</span>}
        </button>
      ))}
    </div>
  );
}

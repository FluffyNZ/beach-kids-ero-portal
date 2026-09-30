/**
 * Shared top-of-page header (see DESIGN_SYSTEM.md — Components — the
 * "consistent top page header system"). Renders a title, optional
 * description and optional trailing actions in the standard layout/spacing.
 *
 * Not wired into any existing page yet — Phase 1 only builds the shell,
 * sidebar and this primitive so existing page content stays untouched.
 * Adopting it into individual pages (starting with Dashboard) is a later,
 * separate, page-by-page step.
 *
 * Example usage once adopted:
 *
 *   <PageHeader
 *     title="Staff"
 *     description="Everyone on the Beach Kids team, active and former."
 *     actions={<button className="btn-primary">Add staff</button>}
 *   />
 */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-charcoal md:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-charcoal/60">{description}</p>}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
    </div>
  );
}

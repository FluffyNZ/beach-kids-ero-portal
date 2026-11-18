/**
 * Shared top-of-page header (see DESIGN_SYSTEM.md — Components — the
 * "consistent top page header system"): a title, optional one-line
 * description and optional actions on the right, in the standard layout
 * and spacing. Actions wrap under the title on narrow screens.
 *
 *   <PageHeader
 *     title="Children"
 *     description="Find a child's profile, whānau contacts and booked sessions."
 *     actions={<button className="btn-primary">Add child</button>}
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
      <div className="min-w-0">
        <h1 className="text-2xl font-bold tracking-tight text-charcoal md:text-3xl">{title}</h1>
        {description && <p className="mt-1.5 text-sm text-charcoal/70">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}

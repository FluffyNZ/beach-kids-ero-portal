import { getActionsList } from "@/lib/data/actions";
import { ActionsFilterBar } from "@/components/actions/actions-filter-bar";
import { ActionsTable } from "@/components/actions/actions-table";
import { StatTile } from "@/components/dashboard/stat-tile";
import type { ActionStatusValue, ActionPriority } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function ActionsPage({
  searchParams,
}: {
  searchParams: { status?: string; priority?: string; section?: string; responsible?: string };
}) {
  const [actions, allActions] = await Promise.all([
    getActionsList({
      status: (searchParams.status as ActionStatusValue | "overdue" | "due_soon" | undefined) || undefined,
      priority: (searchParams.priority as ActionPriority | undefined) || undefined,
      sectionCode: searchParams.section || undefined,
      responsiblePerson: searchParams.responsible || undefined,
    }),
    getActionsList(),
  ]);

  const responsiblePeople = Array.from(new Set(allActions.map((a) => a.responsible_person))).sort();

  const openCount = allActions.filter((a) => a.status !== "completed").length;
  const overdueCount = allActions.filter(
    (a) => a.status !== "completed" && a.due_date && new Date(a.due_date) < new Date(new Date().toDateString())
  ).length;
  const completedCount = allActions.filter((a) => a.status === "completed").length;

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ocean-950 md:text-3xl">Actions</h1>
        <p className="mt-1 text-sm text-ocean-500">Every action raised against an ERO criterion, in one place.</p>
      </div>

      <div className="grid grid-cols-3 gap-3 sm:max-w-md">
        <StatTile label="Open" value={openCount} tone="neutral" />
        <StatTile label="Overdue" value={overdueCount} tone="action" />
        <StatTile label="Completed" value={completedCount} tone="ready" />
      </div>

      <ActionsFilterBar responsiblePeople={responsiblePeople} />

      <ActionsTable actions={actions} />
    </div>
  );
}

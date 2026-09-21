import Link from "next/link";
import { getEmergencyDrills, getNextDrillDue } from "@/lib/data/emergency-drills";
import { StatusBadge } from "@/components/status-badge";
import { PlusIcon, ChevronRightIcon } from "@/components/icons";
import { EMERGENCY_DRILL_TYPE_LABEL } from "@/lib/constants";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function EmergencyDrillsPage() {
  const [drills, nextDue] = await Promise.all([getEmergencyDrills(), getNextDrillDue()]);
  const dueAlert = getDeadlineAlert(nextDue.nextDueDate, null);

  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-ocean-500">
        <Link href="/checklist/HS8" className="hover:text-ocean-700">
          HS8 — Emergency Drills
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-ocean-800">Emergency Drill Register</span>
      </nav>

      <div className="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
        <div>
          <h1 className="font-display text-2xl font-semibold text-ocean-950 md:text-3xl">
            Emergency Drill Register
          </h1>
          <p className="mt-1 text-sm text-ocean-500">
            A running record of every drill carried out, kept every 3 months. Each one can be printed and filed
            as evidence against HS8.
          </p>
        </div>
        <Link href="/emergency-drills/new" className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Log a drill
        </Link>
      </div>

      <div className="card flex flex-col gap-1 p-5">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ocean-500">Next drill due</h2>
        {nextDue.lastDrillDate ? (
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm text-ocean-700">
              Last drill {formatDate(nextDue.lastDrillDate)} · next due {formatDate(nextDue.nextDueDate)}
            </p>
            {dueAlert && <StatusBadge tone={dueAlert.tone}>{dueAlert.label}</StatusBadge>}
          </div>
        ) : (
          <p className="text-sm text-ocean-500">No drills logged yet — one is due now.</p>
        )}
      </div>

      {drills.length === 0 ? (
        <div className="card p-6 text-center text-sm text-ocean-500">
          No drills logged yet. Use &quot;Log a drill&quot; after your next one to start the register.
        </div>
      ) : (
        <ul className="card divide-y divide-ocean-50">
          {drills.map((d) => (
            <li key={d.id}>
              <Link
                href={`/emergency-drills/${d.id}`}
                className="flex items-center justify-between gap-3 px-5 py-3.5 transition-colors hover:bg-ocean-50/60"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ocean-950">
                    {EMERGENCY_DRILL_TYPE_LABEL[d.drill_type]} — {formatDate(d.drill_date)}
                  </p>
                  <p className="truncate text-xs text-ocean-500">
                    {d.conducted_by ? `Conducted by ${d.conducted_by}` : "Conducted by —"}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge tone={d.evidence_id ? "ready" : "attention"}>
                    {d.evidence_id ? "Filed as evidence" : "Not yet filed"}
                  </StatusBadge>
                  <ChevronRightIcon className="h-4 w-4 text-ocean-300" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

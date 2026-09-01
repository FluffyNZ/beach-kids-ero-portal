import Link from "next/link";
import { DrillForm } from "@/components/emergency-drills/drill-form";
import { ChevronRightIcon } from "@/components/icons";

export default function NewEmergencyDrillPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-ocean-500">
        <Link href="/emergency-drills" className="hover:text-ocean-700">
          Emergency Drill Register
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-ocean-800">New drill record</span>
      </nav>

      <div>
        <h1 className="font-display text-2xl font-semibold text-ocean-950 md:text-3xl">Log an emergency drill</h1>
        <p className="mt-1 text-sm text-ocean-500">
          Fill this out straight after a drill while it&apos;s fresh. Saving it creates a record you can print to
          PDF and file as evidence for HS8.
        </p>
      </div>

      <section className="card p-5">
        <DrillForm />
      </section>
    </div>
  );
}

import Link from "next/link";
import { getHazardRegister } from "@/lib/data/hazard-checks";
import { HazardRegisterFiltersBar } from "@/components/hazards/hazard-register-filters-bar";
import { HazardRegisterList } from "@/components/hazards/hazard-register-list";
import { ChevronRightIcon } from "@/components/icons";
import type { HazardRiskLevel } from "@/lib/supabase/database.types";

export const dynamic = "force-dynamic";

export default async function HazardRegisterPage({
  searchParams,
}: {
  searchParams: { status?: string; risk?: string };
}) {
  const status = searchParams.status ?? "open";
  const resolved = status === "open" ? false : status === "resolved" ? true : undefined;
  const riskLevel = (searchParams.risk as HazardRiskLevel | undefined) || undefined;

  const entries = await getHazardRegister({ resolved, riskLevel });

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/records" className="hover:text-charcoal">
          Records &amp; Compliance
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">Hazard Register</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Hazard Register</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Every hazard logged from a Daily Hazard Checklist, its risk level, and whether it&apos;s been resolved.
          </p>
        </div>
        <Link href="/records/hazards" className="btn-secondary">
          Daily Hazard Checks
        </Link>
      </div>

      <HazardRegisterFiltersBar />
      <HazardRegisterList entries={entries} />
    </div>
  );
}

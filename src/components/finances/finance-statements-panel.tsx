import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

/** The Overview's compact Statements block — per the brief: "account
 * statements, FamilyBoost documents and statement history." Account
 * statements and statement history both point at the real
 * /finances/statements page (there's no separate history log in this
 * schema, so "history" is the same page's existing list of outstanding —
 * and previously sent — statements, not a second page).
 *
 * FamilyBoost (the government's parent-facing childcare rebate scheme)
 * has no data or workflow anywhere in this app yet — no table, no
 * generator, nothing to wire a real button to. Rather than fabricate one,
 * this row is shown disabled, matching the sidebar's own "Soon" treatment
 * for not-yet-built features. Flagged in the summary as something to
 * confirm before building. */
export function FinanceStatementsPanel({ outstandingCount }: { outstandingCount: number }) {
  return (
    <section className="card flex flex-col gap-1 p-5">
      <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Statements</h2>

      <Link
        href="/finances/statements"
        className="group flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-charcoal/5"
      >
        <span>
          <span className="block text-sm font-medium text-charcoal">Account statements</span>
          <span className="block text-xs text-charcoal/45">
            {outstandingCount > 0 ? `${outstandingCount} famil${outstandingCount === 1 ? "y" : "ies"} with a balance` : "Nobody currently owes anything"}
          </span>
        </span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-charcoal/20 transition-transform group-hover:translate-x-0.5" />
      </Link>

      <div className="flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-charcoal/35" title="Not built yet — no FamilyBoost data or workflow exists in this app">
        <span>
          <span className="block text-sm font-medium">FamilyBoost documents</span>
          <span className="block text-xs">Not set up yet</span>
        </span>
        <span className="badge bg-charcoal/5 px-2 py-0.5 text-[10px] text-charcoal/40">Soon</span>
      </div>

      <Link
        href="/finances/statements"
        className="group flex items-center justify-between gap-3 rounded-xl px-2 py-2.5 transition-colors hover:bg-charcoal/5"
      >
        <span className="text-sm font-medium text-charcoal">Statement history</span>
        <ChevronRightIcon className="h-4 w-4 shrink-0 text-charcoal/20 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </section>
  );
}

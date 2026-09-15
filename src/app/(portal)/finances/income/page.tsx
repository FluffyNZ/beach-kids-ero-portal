import Link from "next/link";
import { getFinanceIncome } from "@/lib/data/finances";
import { AddIncomeModal } from "@/components/finances/add-income-modal";
import { IncomeTable } from "@/components/finances/income-table";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const income = await getFinanceIncome();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/finances" className="hover:text-charcoal">
          Finances
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">Income</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Income</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            MOE funding, invoices issued to parents, and anything else outside the automatically-calculated fee
            revenue — most recent first.
          </p>
        </div>
        <AddIncomeModal />
      </div>

      <IncomeTable income={income} />
    </div>
  );
}

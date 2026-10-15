import { getFinanceIncome } from "@/lib/data/finances";
import { AddIncomeModal } from "@/components/finances/add-income-modal";
import { IncomeTable } from "@/components/finances/income-table";
import { FinanceNav } from "@/components/finances/finance-nav";

export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const income = await getFinanceIncome();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <FinanceNav />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal md:text-3xl">Income</h1>
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

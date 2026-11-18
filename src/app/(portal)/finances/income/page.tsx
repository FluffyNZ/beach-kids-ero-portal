import { FinancePage, FigureStrip } from "@/components/finances/finance-page";
import { AddIncomeModal } from "@/components/finances/add-income-modal";
import { IncomeTable } from "@/components/finances/income-table";
import { getFinanceIncome } from "@/lib/data/finances";
import { fmtDate, plural } from "@/lib/finance-format";
import { formatCurrency, nzTodayDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function IncomePage() {
  const today = nzTodayDateString();
  const income = await getFinanceIncome();
  const fyStart = Number(today.slice(5, 7)) >= 4 ? `${today.slice(0, 4)}-04-01` : `${Number(today.slice(0, 4)) - 1}-04-01`;
  const receivedFy = income.filter((i) => i.status === "received" && i.received_date && i.received_date >= fyStart && i.received_date <= today);
  const pending = income.filter((i) => i.status === "pending");

  return (
    <FinancePage
      title="Income"
      description="MOE funding and other money received outside family invoices."
      actions={<AddIncomeModal />}
    >
      <FigureStrip
        figures={[
          {
            label: "Received this financial year",
            value: formatCurrency(receivedFy.reduce((s, i) => s + i.amount, 0)),
            scope: `Received ${fmtDate(fyStart)} – ${fmtDate(today)}`,
            detail: receivedFy.length ? plural(receivedFy.length, "record") : "Nothing received yet this year",
          },
          {
            label: "Expected",
            value: formatCurrency(pending.reduce((s, i) => s + i.amount, 0)),
            scope: "Recorded but not yet received",
            detail: plural(pending.length, "record"),
          },
        ]}
      />
      <IncomeTable income={income} today={today} />
      <p className="text-xs text-charcoal/70">Family fee payments are recorded on invoices and appear in the Overview alongside this income.</p>
    </FinancePage>
  );
}

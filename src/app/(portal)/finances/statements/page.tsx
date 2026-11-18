import Link from "next/link";
import { FinancePage } from "@/components/finances/finance-page";
import { StatementControls, type StatementPreset } from "@/components/finances/statement-controls";
import { SendStatementPanel } from "@/components/finances/send-statement-panel";
import { StatementDocument, PaymentDetails } from "@/components/finances/finance-documents";
import { StatementHistory } from "@/components/finances/statement-history";
import { EmptyState } from "@/components/ui/empty-state";
import { getFamilyAccounts, getStatementData, getStatementHistory } from "@/lib/data/finance-hub";
import { getFinancialYearRange } from "@/lib/data/finances";
import { ADMIN_PHONE, BANK_ACCOUNT_NAME, BANK_ACCOUNT_NUMBER } from "@/lib/email/invoice-email";
import { fmtDate } from "@/lib/finance-format";
import { addDays, addMonths, formatCurrency, nzTodayDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";

const DATE = /^\d{4}-\d{2}-\d{2}$/;

function presets(today: string): StatementPreset[] {
  const monthStart = `${today.slice(0, 7)}-01`;
  const lastMonthStart = addMonths(monthStart, -1);
  const fy = getFinancialYearRange(new Date(`${today}T00:00:00Z`));
  return [
    { key: "this_month", label: "This month to date", from: monthStart, to: today },
    { key: "last_month", label: "Last month", from: lastMonthStart, to: addDays(monthStart, -1) },
    { key: "last_3_months", label: "Last 3 months", from: addMonths(monthStart, -2), to: today },
    { key: "financial_year", label: "Financial year to date", from: fy.start, to: today },
  ];
}

export default async function StatementsPage({ searchParams }: { searchParams: { family?: string; from?: string; to?: string } }) {
  const today = nzTodayDateString();
  const options = presets(today);
  let from = DATE.test(searchParams.from ?? "") ? searchParams.from! : options[2].from;
  let to = DATE.test(searchParams.to ?? "") ? searchParams.to! : options[2].to;
  if (from > to) [from, to] = [to, from];

  const { rows } = await getFamilyAccounts();
  const families = rows
    .filter((r) => r.children.length > 0 || r.invoiceCount > 0)
    .map((r) => ({ id: r.id, name: r.name, email: r.email, outstanding: r.outstanding }));
  const familyId = searchParams.family && families.some((f) => f.id === searchParams.family) ? searchParams.family : null;
  const [data, history] = familyId ? await Promise.all([getStatementData(familyId, from, to), getStatementHistory(familyId)]) : [null, []];
  const withBalance = rows.filter((r) => r.outstanding > 0).sort((a, b) => b.overdue - a.overdue || b.outstanding - a.outstanding);

  return (
    <FinancePage title="Statements" description="Preview a family account's statement for any period, then print or email it.">
      <StatementControls families={families} familyId={familyId} from={from} to={to} presets={options} />

      {!data ? (
        <section aria-labelledby="balances-heading" className="rounded-2xl border border-charcoal/10 bg-white">
          <header className="px-5 pb-3 pt-4">
            <h2 id="balances-heading" className="text-base font-semibold text-charcoal">
              Family accounts with a balance
            </h2>
            <p className="text-sm text-charcoal/70">As of {fmtDate(today)}. Choose one to prepare a statement, or search above for any family account.</p>
          </header>
          {withBalance.length === 0 ? (
            <EmptyState title="No family account owes anything" description="Every sent invoice has been paid or voided." />
          ) : (
            <div className="overflow-x-auto border-t border-charcoal/10">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
                    <th scope="col" className="px-5 py-2.5">Family account</th>
                    <th scope="col" className="px-3 py-2.5">Email</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Outstanding</th>
                    <th scope="col" className="px-3 py-2.5 text-right">Overdue</th>
                    <th scope="col" className="px-5 py-2.5"><span className="sr-only">Action</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-charcoal/10">
                  {withBalance.map((r) => (
                    <tr key={r.id}>
                      <th scope="row" className="px-5 py-2.5 text-left font-medium text-charcoal">{r.name}</th>
                      <td className="px-3 py-2.5 text-charcoal">{r.email ?? <span className="text-charcoal/70">No email on file</span>}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{formatCurrency(r.outstanding)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{r.overdue > 0 ? formatCurrency(r.overdue) : "—"}</td>
                      <td className="px-5 py-2.5 text-right">
                        <Link
                          href={`/finances/statements?family=${r.id}&from=${from}&to=${to}`}
                          className="font-medium text-lilac-700 underline-offset-4 hover:underline"
                        >
                          Prepare statement
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      ) : (
        <div className="grid items-start gap-4 lg:grid-cols-[1fr_18rem]">
          <div className="overflow-hidden rounded-2xl border border-charcoal/10 bg-white print:rounded-none print:border-0">
            <style>{`@media print { @page { size: A4 portrait; margin: 14mm; } }`}</style>
            <StatementDocument
              accountName={data.account.full_name}
              recipient={data.account.email}
              childNames={data.children}
              statement={data.statement}
              issuedOn={today}
              payment={<PaymentDetails accountName={BANK_ACCOUNT_NAME} accountNumber={BANK_ACCOUNT_NUMBER} phone={ADMIN_PHONE} />}
            />
          </div>
          <div className="flex flex-col gap-4 lg:sticky lg:top-6">
            <SendStatementPanel
              billPayerId={data.account.id}
              accountName={data.account.full_name}
              recipient={data.account.email?.trim() || null}
              from={from}
              to={to}
              closing={data.statement.closingBalance}
              entryCount={data.statement.entries.length}
            />
            <Link href={`/finances/clients/${data.account.id}`} className="text-sm font-medium text-lilac-700 underline-offset-4 hover:underline print:hidden">
              Open family account
            </Link>
          </div>
        </div>
      )}

      {data && (
        <div className="print:hidden">
          <StatementHistory sends={history} />
        </div>
      )}
    </FinancePage>
  );
}

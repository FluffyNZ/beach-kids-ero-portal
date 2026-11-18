import Link from "next/link";
import { notFound } from "next/navigation";
import { FinancePage, FigureStrip } from "@/components/finances/finance-page";
import { EditFamilyAccountButton } from "@/components/finances/family-account-forms";
import { StatementHistory } from "@/components/finances/statement-history";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { getFamilyAccountDetail } from "@/lib/data/finance-hub";
import { INVOICE_STATE_LABEL, INVOICE_STATE_TONE, fmtDate, fmtWeek, invoiceBalance, invoiceState, plural } from "@/lib/finance-format";
import { formatCurrency } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function FamilyAccountPage({ params }: { params: { id: string } }) {
  const d = await getFamilyAccountDetail(params.id);
  if (!d) notFound();
  const { account, balances, today } = d;
  const enrolled = d.children.filter((c) => c.status === "active");
  const former = d.children.filter((c) => c.status !== "active");
  const lastPayment = d.payments[0];
  const ledger = [...d.ledger].reverse();

  return (
    <FinancePage
      title={account.full_name}
      description="Family account"
      actions={
        <>
          <EditFamilyAccountButton account={account} />
          <Link href={`/finances/statements?family=${account.id}`} className="btn-primary">
            Prepare statement
          </Link>
        </>
      }
    >
      <Link href="/finances/clients" className="-mt-3 text-sm font-medium text-lilac-700 underline-offset-4 hover:underline">
        ← All family accounts
      </Link>

      <FigureStrip
        figures={[
          { label: "Outstanding", value: formatCurrency(balances.outstanding), scope: `As of ${fmtDate(today)}`, detail: plural(balances.unpaidCount, "unpaid invoice") },
          { label: "Overdue", value: formatCurrency(balances.overdue), scope: "Part of outstanding", emphasis: balances.overdue > 0 ? "action" : undefined },
          {
            label: "Last payment",
            value: lastPayment ? formatCurrency(lastPayment.amount) : "None recorded",
            scope: lastPayment ? fmtDate(lastPayment.date) : "No payments recorded in Earlydesk",
          },
          { label: "Invoices", value: d.invoices.length, scope: "All statuses, including drafts and void" },
        ]}
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Contact" bodyClassName="px-5 pb-5">
          <dl className="grid grid-cols-[5rem_1fr] gap-x-3 gap-y-2 text-sm">
            <dt className="text-charcoal/70">Email</dt>
            <dd className="min-w-0 break-words text-charcoal">{account.email || <span className="text-charcoal/70">Not recorded — invoices can&apos;t be emailed</span>}</dd>
            <dt className="text-charcoal/70">Phone</dt>
            <dd className="text-charcoal">{account.phone || <span className="text-charcoal/70">Not recorded</span>}</dd>
            <dt className="text-charcoal/70">Address</dt>
            <dd className="text-charcoal">{account.address || <span className="text-charcoal/70">Not recorded</span>}</dd>
            {account.notes && (
              <>
                <dt className="text-charcoal/70">Notes</dt>
                <dd className="whitespace-pre-line text-charcoal">{account.notes}</dd>
              </>
            )}
          </dl>
        </Panel>
        <Panel title="Linked children" count={enrolled.length} className="lg:col-span-2" bodyClassName="px-5 pb-5">
          {d.children.length === 0 ? (
            <p className="text-sm text-charcoal/70">No children are linked to this family account.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {[...enrolled, ...former].map((c) => (
                <li key={c.id}>
                  <Link href={`/children/${c.id}`} className="inline-flex items-center gap-2 rounded-full border border-charcoal/15 px-3 py-1 text-sm text-charcoal hover:bg-lilac-50">
                    {c.full_name}
                    {c.status !== "active" && <span className="text-xs text-charcoal/70">left</span>}
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <Panel title="Ledger" description="Charges when invoices are issued and payments when they're recorded, newest first" bodyClassName="">
        {ledger.length === 0 ? (
          <EmptyState title="No charges or payments yet" description="Sent invoices and recorded payments appear here." />
        ) : (
          <div className="overflow-x-auto border-t border-charcoal/10">
            <table className="w-full min-w-[640px] text-sm">
              <thead>
                <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
                  <th scope="col" className="px-5 py-2.5">Date</th>
                  <th scope="col" className="px-3 py-2.5">Details</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Charge</th>
                  <th scope="col" className="px-3 py-2.5 text-right">Payment</th>
                  <th scope="col" className="px-3 py-2.5 pr-5 text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-charcoal/10">
                {ledger.map((e, i) => (
                  <tr key={`${e.invoiceId}-${e.kind}-${i}`}>
                    <td className="whitespace-nowrap px-5 py-2.5">{fmtDate(e.date)}</td>
                    <td className="px-3 py-2.5">
                      <Link href={`/finances/invoices?invoice=${e.invoiceId}`} className="text-charcoal hover:underline">
                        {e.description}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{e.kind === "charge" ? formatCurrency(e.amount) : ""}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums">{e.kind === "payment" ? formatCurrency(e.amount) : ""}</td>
                    <td className="px-3 py-2.5 pr-5 text-right font-medium tabular-nums">{formatCurrency(e.balance)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title="Invoices" count={d.invoices.length} action={{ label: "Open in Invoices", href: "/finances/invoices" }} bodyClassName="">
          {d.invoices.length === 0 ? (
            <EmptyState title="No invoices" description="Draft one from Fees." />
          ) : (
            <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
              {d.invoices.map((inv) => {
                const st = invoiceState(inv, today);
                const bal = invoiceBalance(inv);
                return (
                  <li key={inv.id}>
                    <Link href={`/finances/invoices?invoice=${inv.id}`} className="flex items-center gap-3 px-5 py-3 hover:bg-lilac-50">
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-charcoal">{inv.invoice_number}</span>
                        <span className="block text-xs text-charcoal/70">
                          Week of {fmtWeek(inv.week_start_date)} · due {fmtDate(inv.due_date)}
                        </span>
                      </span>
                      <span className="text-right">
                        <span className="block text-sm tabular-nums text-charcoal">{formatCurrency(inv.total_due)}</span>
                        <span className="block text-xs text-charcoal/70">{bal === null ? "Not owed" : `Balance ${formatCurrency(bal)}`}</span>
                      </span>
                      <StatusPill tone={INVOICE_STATE_TONE[st]}>{INVOICE_STATE_LABEL[st]}</StatusPill>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </Panel>
        <Panel title="Payments" count={d.payments.length} bodyClassName="">
          {d.payments.length === 0 ? (
            <EmptyState title="No payments recorded" description="Payments are recorded from an unpaid invoice." />
          ) : (
            <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
              {d.payments.map((p) => (
                <li key={p.id} className="flex items-center justify-between gap-3 px-5 py-3">
                  <span>
                    <span className="block text-sm font-medium text-charcoal">{fmtDate(p.date)}</span>
                    <span className="block text-xs text-charcoal/70">{p.detail}</span>
                  </span>
                  <span className="text-sm font-semibold tabular-nums">{formatCurrency(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      </div>

      <StatementHistory sends={d.statements} />
    </FinancePage>
  );
}

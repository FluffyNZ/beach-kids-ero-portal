import { formatCurrency } from "@/lib/utils";
import { fmtDate, fmtRange, fmtWeek, invoiceBalance } from "@/lib/finance-format";
import type { StatementSummary } from "@/lib/finance-ledger";
import type { Invoice } from "@/lib/types";

// Printable documents with Beach Kids as the identity. Black text on white,
// thin rules, sized for A4 portrait.

function Letterhead({ title, meta }: { title: string; meta: React.ReactNode }) {
  return (
    <header className="flex flex-wrap items-start justify-between gap-4 border-b-2 border-charcoal pb-4">
      <div>
        <p className="text-xl font-bold tracking-tight text-charcoal">Beach Kids Waihi</p>
        <p className="text-sm text-charcoal/80">Early childhood education</p>
      </div>
      <div className="text-right">
        <p className="text-lg font-semibold text-charcoal">{title}</p>
        <div className="text-sm text-charcoal/80">{meta}</div>
      </div>
    </header>
  );
}

export function PaymentDetails({ accountName, accountNumber, phone, reference }: { accountName: string; accountNumber: string; phone: string; reference?: string }) {
  return (
    <section className="rounded-lg border border-charcoal/20 p-4 text-sm text-charcoal">
      <p className="font-semibold">How to pay</p>
      <p className="mt-1">
        Account name: {accountName}
        <br />
        Account number: {accountNumber}
        {reference ? (
          <>
            <br />
            Reference: {reference}
          </>
        ) : null}
      </p>
      <p className="mt-2 text-charcoal/80">Questions? Call or text Administration on {phone}.</p>
    </section>
  );
}

export function InvoiceDocument({ invoice, payment }: { invoice: Invoice; payment: React.ReactNode }) {
  const balance = invoiceBalance(invoice);
  return (
    <article className="mx-auto flex w-full max-w-[190mm] flex-col gap-6 bg-white p-8 text-charcoal print:max-w-none print:p-0">
      <Letterhead
        title={`Invoice ${invoice.invoice_number}`}
        meta={
          <>
            Issued {fmtDate(invoice.issued_date)}
            <br />
            Due {fmtDate(invoice.due_date)}
          </>
        }
      />
      <div className="grid gap-4 text-sm sm:grid-cols-2">
        <div>
          <p className="font-semibold">Bill to</p>
          <p>{invoice.bill_payer_name}</p>
          {invoice.bill_payer_email && <p className="text-charcoal/80">{invoice.bill_payer_email}</p>}
        </div>
        <div className="sm:text-right">
          <p className="font-semibold">Billing week</p>
          <p>{fmtWeek(invoice.week_start_date)}</p>
        </div>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-charcoal text-left">
            <th scope="col" className="py-2 pr-2 font-semibold">Child</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">Fee</th>
            <th scope="col" className="px-2 py-2 text-right font-semibold">WINZ</th>
            <th scope="col" className="py-2 pl-2 text-right font-semibold">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.line_items.map((li) => (
            <tr key={li.id} className="border-b border-charcoal/20">
              <td className="py-2 pr-2">
                {li.child_name}
                {li.is_estimated && <span className="block text-xs text-charcoal/80">Based on booked hours</span>}
              </td>
              <td className="px-2 py-2 text-right tabular-nums">{formatCurrency(li.fee_total)}</td>
              <td className="px-2 py-2 text-right tabular-nums">{li.winz_payment > 0 ? `−${formatCurrency(li.winz_payment)}` : "—"}</td>
              <td className="py-2 pl-2 text-right tabular-nums">{formatCurrency(li.parent_pays)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          <tr>
            <th scope="row" colSpan={3} className="py-2 pr-2 text-right font-semibold">
              Total due
            </th>
            <td className="py-2 pl-2 text-right text-base font-bold tabular-nums">{formatCurrency(invoice.total_due)}</td>
          </tr>
          {balance !== null && (
            <tr>
              <th scope="row" colSpan={3} className="py-1 pr-2 text-right font-normal">
                {invoice.status === "paid" ? "Balance (paid)" : "Balance"}
              </th>
              <td className="py-1 pl-2 text-right tabular-nums">{formatCurrency(balance)}</td>
            </tr>
          )}
        </tfoot>
      </table>
      {invoice.status === "void" && <p className="rounded border border-charcoal p-2 text-center text-sm font-semibold">VOID — nothing is owed on this invoice</p>}
      {invoice.status === "draft" && <p className="rounded border border-charcoal/40 p-2 text-center text-sm">Draft — not yet sent</p>}
      {payment}
    </article>
  );
}

export function StatementDocument({
  accountName,
  recipient,
  childNames,
  statement,
  issuedOn,
  payment,
}: {
  accountName: string;
  recipient: string | null;
  childNames: string[];
  statement: StatementSummary;
  issuedOn: string;
  payment: React.ReactNode;
}) {
  return (
    <article className="flex w-full flex-col gap-5 bg-white p-6 text-charcoal sm:p-8 print:p-0" aria-label="Statement preview">
      <Letterhead
        title="Statement of account"
        meta={
          <>
            {fmtRange(statement.from, statement.to)}
            <br />
            Prepared {fmtDate(issuedOn)}
          </>
        }
      />
      <div className="text-sm">
        <p className="font-semibold">{accountName}</p>
        {recipient && <p className="text-charcoal/80">{recipient}</p>}
        {childNames.length > 0 && <p className="text-charcoal/80">For {childNames.join(", ")}</p>}
      </div>

      <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-charcoal/20 bg-charcoal/20 text-sm sm:grid-cols-4">
        {[
          ["Opening balance", statement.openingBalance, `at ${fmtDate(statement.from)}`],
          ["Charges", statement.totalCharges, "invoices issued"],
          ["Payments", statement.totalPayments, "received"],
          ["Closing balance", statement.closingBalance, `at ${fmtDate(statement.to)}`],
        ].map(([label, value, note]) => (
          <div key={label as string} className="bg-white p-3">
            <dt className="text-xs text-charcoal/80">{label}</dt>
            <dd className="text-lg font-semibold tabular-nums">{formatCurrency(value as number)}</dd>
            <dd className="text-xs text-charcoal/70">{note}</dd>
          </div>
        ))}
      </dl>

      {statement.entries.length === 0 ? (
        <p className="text-sm text-charcoal/80">No charges or payments in this period.</p>
      ) : (
        <div className="overflow-x-auto print:overflow-visible">
        <table className="w-full min-w-[34rem] text-sm print:min-w-0">
          <thead>
            <tr className="border-b border-charcoal text-left">
              <th scope="col" className="py-2 pr-2 font-semibold">Date</th>
              <th scope="col" className="px-2 py-2 font-semibold">Details</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Charge</th>
              <th scope="col" className="px-2 py-2 text-right font-semibold">Payment</th>
              <th scope="col" className="py-2 pl-2 text-right font-semibold">Balance</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-charcoal/20">
              <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(statement.from)}</td>
              <td className="px-2 py-2">Opening balance</td>
              <td />
              <td />
              <td className="py-2 pl-2 text-right tabular-nums">{formatCurrency(statement.openingBalance)}</td>
            </tr>
            {statement.entries.map((e, i) => (
              <tr key={`${e.invoiceId}-${e.kind}-${i}`} className="border-b border-charcoal/20">
                <td className="py-2 pr-2 whitespace-nowrap">{fmtDate(e.date)}</td>
                <td className="px-2 py-2">{e.description}</td>
                <td className="px-2 py-2 text-right tabular-nums">{e.kind === "charge" ? formatCurrency(e.amount) : ""}</td>
                <td className="px-2 py-2 text-right tabular-nums">{e.kind === "payment" ? formatCurrency(e.amount) : ""}</td>
                <td className="py-2 pl-2 text-right tabular-nums">{formatCurrency(e.balance)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <th scope="row" colSpan={4} className="py-2 pr-2 text-right font-semibold">
                Closing balance
              </th>
              <td className="py-2 pl-2 text-right font-bold tabular-nums">{formatCurrency(statement.closingBalance)}</td>
            </tr>
          </tfoot>
        </table>
        </div>
      )}
      {payment}
    </article>
  );
}

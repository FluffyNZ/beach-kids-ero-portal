import Link from "next/link";
import { getBillPayersList } from "@/lib/data/bill-payers";
import { StatTile } from "@/components/dashboard/stat-tile";
import { formatCurrency } from "@/lib/utils";
import { AddClientButton } from "@/components/finances/add-client-button";
import { ClientRow } from "@/components/finances/client-row";

export const dynamic = "force-dynamic";

export default async function ClientsPage() {
  const clients = await getBillPayersList();

  const totalOwing = clients.reduce((sum, c) => sum + c.totalOwing, 0);
  const billedFamilies = clients.filter((c) => c.activeChildrenCount > 0);
  const missingEmail = billedFamilies.filter((c) => !c.email).length;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Clients</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Every family billed through Beach Kids — contact details, who they&apos;re billed for, and what they
            currently owe.
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/finances" className="btn-ghost">
            ← Finances
          </Link>
          <AddClientButton />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <StatTile label="Families currently billed" value={billedFamilies.length} tone="neutral" />
        <StatTile
          label="Total currently owing"
          value={formatCurrency(totalOwing)}
          tone={totalOwing > 0 ? "attention" : "ready"}
        />
        <StatTile
          label="Missing an email on file"
          value={missingEmail}
          tone={missingEmail > 0 ? "action" : "ready"}
        />
      </div>

      {clients.length === 0 ? (
        <div className="card p-6 text-center text-sm text-charcoal/50">
          No clients yet — add one above, or they&apos;ll appear automatically the first time you set a bill payer
          on a child.
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {clients.map((client) => (
            <ClientRow key={client.id} client={client} />
          ))}
        </div>
      )}
    </div>
  );
}

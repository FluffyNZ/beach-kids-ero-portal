import Link from "next/link";
import { getXeroConnectionStatus, listXeroBankAccountOptions } from "@/lib/data/xero";
import { formatShortDate } from "@/lib/utils";
import { XeroBankAccountPicker } from "@/components/finances/xero-bank-account-picker";
import { XeroSyncPanel } from "@/components/finances/xero-sync-panel";
import { XeroDisconnectButton } from "@/components/finances/xero-disconnect-button";

export const dynamic = "force-dynamic";

export default async function XeroPage({ searchParams }: { searchParams: { error?: string } }) {
  const status = await getXeroConnectionStatus();

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Xero bank sync</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Reads payments from one Xero bank account and matches them against outstanding parent fee invoices.
            Read-only on Xero&apos;s side — nothing here ever writes back to Xero.
          </p>
        </div>
        <Link href="/finances/invoices" className="btn-ghost">
          ← Invoices
        </Link>
      </div>

      {searchParams.error && (
        <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{searchParams.error}</p>
      )}

      {!status.connected ? (
        <div className="card flex flex-col items-start gap-3 p-6">
          <p className="text-sm text-charcoal/70">Not connected yet.</p>
          <a href="/api/xero/connect" className="btn-primary">
            Connect to Xero
          </a>
          <p className="text-xs text-charcoal/40">
            You&apos;ll be taken to Xero to log in and approve read-only access, then brought back here.
          </p>
        </div>
      ) : (
        <>
          <div className="card flex flex-wrap items-center justify-between gap-3 p-5">
            <div>
              <p className="text-sm font-medium text-charcoal">
                Connected to {status.tenantName ?? "your Xero organisation"}
              </p>
              <p className="text-xs text-charcoal/50">
                {status.connectedAt ? `Since ${formatShortDate(status.connectedAt.slice(0, 10))}` : ""}
                {status.bankAccountName ? ` · Reading from "${status.bankAccountName}"` : ""}
              </p>
            </div>
            <XeroDisconnectButton />
          </div>

          {!status.bankAccountId ? (
            <BankAccountStep />
          ) : (
            <div className="card p-5">
              <XeroSyncPanel />
            </div>
          )}
        </>
      )}
    </div>
  );
}

async function BankAccountStep() {
  try {
    const options = await listXeroBankAccountOptions();
    return (
      <div className="card p-5">
        <XeroBankAccountPicker options={options} />
      </div>
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load your Xero bank accounts.";
    return <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{message}</p>;
  }
}

import { FinancePage } from "@/components/finances/finance-page";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { XeroBankAccountPicker } from "@/components/finances/xero-bank-account-picker";
import { XeroSyncPanel } from "@/components/finances/xero-sync-panel";
import { XeroDisconnectButton } from "@/components/finances/xero-disconnect-button";
import { getXeroConnectionStatus, listXeroBankAccountOptions } from "@/lib/data/xero";
import { getEmailSendingStatus } from "@/lib/data/finance-hub";
import { fmtDateTime } from "@/lib/finance-format";

export const dynamic = "force-dynamic";

export default async function ConnectionsPage({ searchParams }: { searchParams: { error?: string } }) {
  const status = await getXeroConnectionStatus();
  const email = getEmailSendingStatus();

  return (
    <FinancePage title="Connections" description="Services Finance uses to match bank payments and email invoices and statements.">
      {searchParams.error && (
        <p role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-4 py-3 text-sm text-charcoal">
          {searchParams.error}
        </p>
      )}

      <Panel
        title="Xero bank feed"
        description="Reads payments from one Xero bank account and matches them to unpaid invoices. Nothing is written back to Xero."
        headerAction={
          <StatusPill tone={status.connected && status.bankAccountId ? "ready" : status.connected ? "attention" : "neutral"}>
            {status.connected ? (status.bankAccountId ? "Connected" : "Choose a bank account") : "Not connected"}
          </StatusPill>
        }
        bodyClassName="px-5 pb-5"
      >
        {!status.connected ? (
          <div className="flex flex-col items-start gap-3 border-t border-charcoal/10 pt-4">
            <p className="text-sm text-charcoal">Xero isn&apos;t connected. Payments can still be recorded by hand on each invoice.</p>
            <a href="/api/xero/connect" className="btn-primary">
              Connect to Xero
            </a>
            <p className="text-xs text-charcoal/70">You&apos;ll sign in to Xero to approve read-only access, then come back here.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-4 border-t border-charcoal/10 pt-4">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 text-sm">
                <dt className="text-charcoal/70">Organisation</dt>
                <dd className="text-charcoal">{status.tenantName ?? "Not recorded"}</dd>
                <dt className="text-charcoal/70">Bank account</dt>
                <dd className="text-charcoal">{status.bankAccountName ?? "Not chosen yet"}</dd>
                <dt className="text-charcoal/70">Connected</dt>
                <dd className="text-charcoal">{status.connectedAt ? fmtDateTime(status.connectedAt) : "Not recorded"}</dd>
              </dl>
              <XeroDisconnectButton />
            </div>
            {!status.bankAccountId ? <BankAccountStep /> : <XeroSyncPanel />}
          </div>
        )}
      </Panel>

      <Panel
        title="Email sending"
        description="Invoices and statements are emailed through Resend."
        headerAction={<StatusPill tone={email.configured ? "ready" : "neutral"}>{email.configured ? "Configured" : "Not configured"}</StatusPill>}
        bodyClassName="px-5 pb-5"
      >
        <dl className="grid grid-cols-[8rem_1fr] gap-x-3 gap-y-1 border-t border-charcoal/10 pt-4 text-sm">
          <dt className="text-charcoal/70">API key</dt>
          <dd className="text-charcoal">{email.configured ? "Set" : "Not set — invoices and statements can't be emailed"}</dd>
          <dt className="text-charcoal/70">Sends from</dt>
          <dd className="break-words text-charcoal">
            {email.fromAddress ?? "Resend's test sender — only delivers to the Resend account owner until INVOICE_FROM_EMAIL is set"}
          </dd>
        </dl>
      </Panel>
    </FinancePage>
  );
}

async function BankAccountStep() {
  try {
    const options = await listXeroBankAccountOptions();
    return <XeroBankAccountPicker options={options} />;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Could not load your Xero bank accounts.";
    return (
      <p role="alert" className="rounded-xl border border-status-action/40 bg-status-actionBg px-3 py-2 text-sm text-charcoal">
        {message}
      </p>
    );
  }
}

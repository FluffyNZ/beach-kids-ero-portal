import { EmailPage } from "@/components/email/email-page";
import { HistoryList } from "@/components/email/history-list";
import { getHistory, getMessage } from "@/lib/data/email-hub";
import type { EmailMessageStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUSES: EmailMessageStatus[] = ["draft", "sending", "sent", "failed"];
const KINDS = ["family", "staff", "enquiry", "statement"] as const;

export default async function EmailHistoryPage({ searchParams }: { searchParams: { q?: string; status?: string; kind?: string; days?: string; open?: string } }) {
  const status = STATUSES.find((s) => s === searchParams.status);
  const kind = KINDS.find((k) => k === searchParams.kind);
  const days = ["7", "30", "90"].includes(searchParams.days ?? "") ? Number(searchParams.days) : undefined;
  let messages = await getHistory({ q: searchParams.q, status, kind, days });
  if (searchParams.open && !messages.some((m) => m.id === searchParams.open)) {
    const extra = await getMessage(searchParams.open);
    if (extra) messages = [extra, ...messages];
  }

  return (
    <EmailPage title="History" description="Every email drafted or sent from Earlydesk, newest first.">
      <HistoryList
        messages={messages}
        filters={{ q: searchParams.q ?? "", status: status ?? "", kind: kind ?? "", days: days ? String(days) : "" }}
        initialOpen={searchParams.open ?? null}
      />
      <p className="text-xs text-charcoal/70">
        “Sent” means the sending service accepted the email. Earlydesk doesn&apos;t receive delivery or read confirmations.
      </p>
    </EmailPage>
  );
}

import Link from "next/link";
import { getMarketingConnections, getMarketingOauthPendingPages } from "@/lib/data/marketing";
import { ChoosePageForm } from "@/components/marketing/choose-page-form";
import { DisconnectConnectionButton } from "@/components/marketing/disconnect-connection-button";
import { formatNzDateTime } from "@/lib/marketing/timezone";

export const dynamic = "force-dynamic";

const PLATFORM_LABEL = { facebook_page: "Facebook Page", instagram_business: "Instagram Business" } as const;

export default async function MarketingConnectionsPage({ searchParams }: { searchParams: { pending?: string; error?: string } }) {
  const [connections, pendingPages] = await Promise.all([
    getMarketingConnections(),
    searchParams.pending ? getMarketingOauthPendingPages(searchParams.pending) : Promise.resolve(null),
  ]);

  const facebook = connections.find((c) => c.platform === "facebook_page");
  const instagram = connections.find((c) => c.platform === "instagram_business");

  return (
    <div className="flex flex-col gap-5">
      {searchParams.error && (
        <div className="card border-status-action/30 bg-status-actionBg p-4 text-sm text-status-action">{searchParams.error}</div>
      )}

      {searchParams.pending && (
        pendingPages ? (
          <ChoosePageForm state={searchParams.pending} pages={pendingPages} />
        ) : (
          <div className="card border-status-action/30 bg-status-actionBg p-4 text-sm text-status-action">
            That connection attempt has expired — click &quot;Connect accounts&quot; below to try again.
          </div>
        )
      )}

      <div className="card flex flex-col gap-4 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-charcoal">Social media accounts</h2>
          <a href="/api/marketing/meta/connect" className="btn-primary text-sm">
            Connect accounts
          </a>
        </div>

        {([
          { platform: "facebook_page" as const, connection: facebook },
          { platform: "instagram_business" as const, connection: instagram },
        ]).map(({ platform, connection }) => (
          <div key={platform} className="flex items-center justify-between gap-3 rounded-lg border border-charcoal/10 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-charcoal">{PLATFORM_LABEL[platform]}</p>
              {connection && connection.status === "connected" ? (
                <p className="text-xs text-kelp-600">
                  Connected — {connection.externalAccountName}
                  {connection.connectedAt ? ` · since ${formatNzDateTime(connection.connectedAt)}` : ""}
                </p>
              ) : connection && connection.status === "expired" ? (
                <p className="text-xs text-status-action">Connection expired{connection.lastError ? ` — ${connection.lastError}` : ""} — reconnect below.</p>
              ) : connection && connection.status === "error" ? (
                <p className="text-xs text-status-action">{connection.lastError ?? "Something went wrong with this connection."}</p>
              ) : (
                <p className="text-xs text-charcoal/45">Not connected</p>
              )}
            </div>
            {connection && connection.status === "connected" && <DisconnectConnectionButton platform={platform} />}
          </div>
        ))}

        <p className="text-xs text-charcoal/40">
          Instagram connects automatically once its linked Facebook Page is connected — there's no separate Instagram
          login. See the Marketing setup notes Ethan was given for what needs to exist in Meta's own dashboard before
          this works (a Meta Developer app, the Beach Kids Facebook Page, and a linked Instagram professional account).
        </p>
      </div>

      <div className="card p-5 text-sm text-charcoal/60">
        Not connected yet, and publishing won&apos;t work until it is — nothing here claims to be &quot;live&quot; until a
        real successful publish has happened. See <Link href="/marketing/drafts" className="text-ocean-600 hover:underline">Drafts</Link> to prepare posts in the meantime.
      </div>
    </div>
  );
}

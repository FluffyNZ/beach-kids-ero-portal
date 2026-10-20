import { getMarketingPosts } from "@/lib/data/marketing";
import { MarketingPostListRow } from "@/components/marketing/post-list-row";

export const dynamic = "force-dynamic";

export default async function MarketingDraftsPage() {
  const posts = await getMarketingPosts(["draft", "scheduled", "publishing", "failed"]);
  const scheduled = posts.filter((p) => p.status === "scheduled" || p.status === "publishing");
  const drafts = posts.filter((p) => p.status === "draft");
  const failed = posts.filter((p) => p.status === "failed");

  return (
    <div className="flex flex-col gap-6">
      {failed.length > 0 && (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-status-action">Failed — needs attention</h2>
          <div className="card flex flex-col divide-y divide-charcoal/5">
            {failed.map((post) => (
              <MarketingPostListRow key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Scheduled</h2>
        {scheduled.length === 0 ? (
          <p className="text-sm text-charcoal/45">Nothing scheduled right now.</p>
        ) : (
          <div className="card flex flex-col divide-y divide-charcoal/5">
            {scheduled.map((post) => (
              <MarketingPostListRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Drafts</h2>
        {drafts.length === 0 ? (
          <p className="text-sm text-charcoal/45">No drafts — use "+ Create post" to start one.</p>
        ) : (
          <div className="card flex flex-col divide-y divide-charcoal/5">
            {drafts.map((post) => (
              <MarketingPostListRow key={post.id} post={post} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

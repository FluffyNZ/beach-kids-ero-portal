import { getMarketingPosts } from "@/lib/data/marketing";
import { MarketingPostListRow } from "@/components/marketing/post-list-row";

export const dynamic = "force-dynamic";

export default async function MarketingPublishedPage() {
  const posts = await getMarketingPosts("published");

  return (
    <div className="flex flex-col gap-3">
      <p className="text-sm text-charcoal/60">Every post Beach Kids has actually published, with a link to each platform's real post.</p>
      {posts.length === 0 ? (
        <div className="card flex flex-col items-center gap-1 px-5 py-10 text-center">
          <p className="text-sm font-medium text-charcoal">Nothing published yet</p>
          <p className="text-xs text-charcoal/45">Published posts will show up here, each with a link to Facebook and/or Instagram.</p>
        </div>
      ) : (
        <div className="card flex flex-col divide-y divide-charcoal/5">
          {posts.map((post) => (
            <div key={post.id} className="flex flex-col gap-1.5 px-5 py-3.5">
              <MarketingPostListRow post={post} />
              <div className="flex flex-wrap gap-3 pl-0.5 text-xs">
                {post.platformResults
                  .filter((r) => r.externalPermalink)
                  .map((r) => (
                    <a
                      key={r.platform}
                      href={r.externalPermalink!}
                      target="_blank"
                      rel="noreferrer"
                      className="font-medium text-ocean-600 hover:underline"
                    >
                      View on {r.platform === "facebook" ? "Facebook" : "Instagram"} ↗
                    </a>
                  ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

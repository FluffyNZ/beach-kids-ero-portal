import Link from "next/link";
import type { MarketingPost } from "@/lib/types";
import { MarketingPostStatusBadge, MarketingPlatformResultBadge } from "@/components/marketing/post-status-badge";
import { formatNzDateTime } from "@/lib/marketing/timezone";

function platformsLabel(platforms: MarketingPost["platforms"]): string {
  if (platforms.length === 2) return "Facebook & Instagram";
  if (platforms[0] === "facebook") return "Facebook";
  if (platforms[0] === "instagram") return "Instagram";
  return "—";
}

export function MarketingPostListRow({ post }: { post: MarketingPost }) {
  const caption = post.caption.trim() || "(no caption yet)";
  const whenLabel = post.status === "published" && post.publishedAt
    ? `Published ${formatNzDateTime(post.publishedAt)}`
    : post.scheduledAt
      ? formatNzDateTime(post.scheduledAt)
      : "Not scheduled";

  return (
    <Link
      href={`/marketing/posts/${post.id}`}
      className="flex items-start justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-charcoal/[0.03]"
    >
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{caption}</p>
        <p className="mt-0.5 text-xs text-charcoal/50">
          {platformsLabel(post.platforms)} · {whenLabel}
        </p>
        {post.platformResults.length > 0 && (
          <div className="mt-1.5 flex gap-1.5">
            {post.platformResults.map((r) => (
              <MarketingPlatformResultBadge key={r.platform} status={r.status} className="text-[10px]" />
            ))}
          </div>
        )}
        {post.needsPhotoPermissionReview && (
          <p className="mt-1.5 text-xs font-medium text-status-action">Needs review — photo permission not yet confirmed</p>
        )}
      </div>
      <MarketingPostStatusBadge status={post.status} className="shrink-0" />
    </Link>
  );
}

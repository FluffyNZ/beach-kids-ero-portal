import { StatusBadge } from "@/components/status-badge";
import type { StatusTone } from "@/lib/constants";
import type { MarketingPostStatus, MarketingPlatformResultStatus } from "@/lib/types";

const POST_STATUS_LABEL: Record<MarketingPostStatus, string> = {
  draft: "Draft",
  scheduled: "Scheduled",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
};

const POST_STATUS_TONE: Record<MarketingPostStatus, StatusTone> = {
  draft: "neutral",
  scheduled: "attention",
  publishing: "attention",
  published: "ready",
  failed: "action",
};

export function MarketingPostStatusBadge({ status, className }: { status: MarketingPostStatus; className?: string }) {
  return (
    <StatusBadge tone={POST_STATUS_TONE[status]} className={className}>
      {POST_STATUS_LABEL[status]}
    </StatusBadge>
  );
}

const PLATFORM_RESULT_LABEL: Record<MarketingPlatformResultStatus, string> = {
  pending: "Pending",
  publishing: "Publishing",
  published: "Published",
  failed: "Failed",
  skipped: "Skipped",
};

const PLATFORM_RESULT_TONE: Record<MarketingPlatformResultStatus, StatusTone> = {
  pending: "neutral",
  publishing: "attention",
  published: "ready",
  failed: "action",
  skipped: "neutral",
};

export function MarketingPlatformResultBadge({ status, className }: { status: MarketingPlatformResultStatus; className?: string }) {
  return (
    <StatusBadge tone={PLATFORM_RESULT_TONE[status]} className={className}>
      {PLATFORM_RESULT_LABEL[status]}
    </StatusBadge>
  );
}

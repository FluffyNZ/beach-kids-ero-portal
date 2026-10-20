"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectMetaConnection } from "@/lib/actions/marketing";
import type { MarketingConnectionPlatform } from "@/lib/types";

export function DisconnectConnectionButton({ platform }: { platform: MarketingConnectionPlatform }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      className="btn-ghost text-xs text-status-action hover:bg-status-actionBg"
      onClick={() =>
        startTransition(async () => {
          await disconnectMetaConnection(platform);
          router.refresh();
        })
      }
    >
      {pending ? "Disconnecting…" : "Disconnect"}
    </button>
  );
}

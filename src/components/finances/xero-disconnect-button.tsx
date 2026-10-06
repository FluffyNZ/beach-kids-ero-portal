"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { disconnectXero } from "@/lib/actions/xero";

/** Two-click disconnect (no browser confirm dialog, matching the rest of
 * this app's style) — first click arms it, second within a few seconds
 * actually disconnects. Clears the saved Xero tokens and bank account;
 * doesn't touch any invoice or payment that's already been confirmed. */
export function XeroDisconnectButton() {
  const router = useRouter();
  const [armed, setArmed] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    if (!armed) {
      setArmed(true);
      setTimeout(() => setArmed(false), 5000);
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await disconnectXero();
        setArmed(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not disconnect Xero.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleClick} disabled={pending} className="btn-ghost px-3 py-1.5 text-xs">
        {pending ? "Disconnecting…" : armed ? "Click again to confirm" : "Disconnect"}
      </button>
      {error && <p className="max-w-[16rem] text-right text-xs text-status-action">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { sendStatement } from "@/lib/actions/invoices";

/** Emails this family every invoice they currently have outstanding,
 * rolled into one statement — for chasing an overdue balance rather than
 * re-sending each invoice individually. */
export function SendStatementButton({ billPayerId }: { billPayerId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [justSent, setJustSent] = useState(false);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await sendStatement(billPayerId);
        setJustSent(true);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong sending this statement.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" disabled={pending} onClick={handleClick} className="btn-primary px-3 py-1.5 text-xs">
        {pending ? "Sending…" : justSent ? "Sent ✓" : "Send statement"}
      </button>
      {error && <p className="max-w-[16rem] text-right text-xs text-status-action">{error}</p>}
    </div>
  );
}

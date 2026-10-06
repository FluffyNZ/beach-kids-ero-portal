"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createDraftInvoice } from "@/lib/actions/invoices";

/** Freezes this family's current fee numbers for the week into a new draft
 * invoice, then takes you to Invoices to review and send it. Drafting
 * doesn't email anything — that's a separate, deliberate step. */
export function DraftInvoiceButton({ billPayerId, weekStartDate }: { billPayerId: string; weekStartDate: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleClick() {
    setError(null);
    startTransition(async () => {
      try {
        await createDraftInvoice(billPayerId, weekStartDate);
        router.push("/finances/invoices");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong drafting this invoice.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button type="button" onClick={handleClick} disabled={pending} className="btn-secondary px-3 py-1.5 text-xs">
        {pending ? "Drafting…" : "Draft invoice →"}
      </button>
      {error && <p className="max-w-[16rem] text-right text-xs text-status-action">{error}</p>}
    </div>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { XeroBankAccountOption } from "@/lib/types";
import { selectXeroBankAccount } from "@/lib/actions/xero";

/** One-time (per reconnect) picker for which Xero bank account is the one
 * parent fees actually land in — everything else this feature does reads
 * only from this account, so getting it right here matters. */
export function XeroBankAccountPicker({ options }: { options: XeroBankAccountOption[] }) {
  const router = useRouter();
  const [accountId, setAccountId] = useState(options[0]?.accountId ?? "");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    const option = options.find((o) => o.accountId === accountId);
    if (!option) {
      setError("Pick a bank account first.");
      return;
    }
    setError(null);
    startTransition(async () => {
      try {
        await selectXeroBankAccount(option.accountId, option.name);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Could not save that bank account.");
      }
    });
  }

  if (options.length === 0) {
    return (
      <p className="text-sm text-status-action">
        Xero didn&apos;t return any bank accounts for this organisation — check you have at least one bank account
        set up in Xero.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="xero-bank-account">
          Which Xero bank account do parent fee payments land in?
        </label>
        <select
          id="xero-bank-account"
          className="input"
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
        >
          {options.map((o) => (
            <option key={o.accountId} value={o.accountId}>
              {o.name}
              {o.code ? ` (${o.code})` : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-charcoal/50">
          Only transactions in this one account will ever be read — nothing else in your Xero organisation is
          touched.
        </p>
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-xs text-status-action">{error}</p>}

      <div className="flex justify-end">
        <button type="button" onClick={handleSave} disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Use this account"}
        </button>
      </div>
    </div>
  );
}

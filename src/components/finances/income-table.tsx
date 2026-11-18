"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { setIncomeReceived, deleteIncome } from "@/lib/actions/finances";
import { StatusPill } from "@/components/ui/status-pill";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, SearchField } from "@/components/finances/finance-page";
import { FINANCE_INCOME_SOURCE_LABEL } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { fmtDate } from "@/lib/finance-format";
import type { FinanceIncomeEntry } from "@/lib/types";

type Filter = "all" | "received" | "pending";

/** Income recorded outside invoices (MOE funding and other money in). */
export function IncomeTable({ income, today }: { income: FinanceIncomeEntry[]; today: string }) {
  const router = useRouter();
  const busy = useRef(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  async function run(id: string, action: () => Promise<void>, success: string) {
    if (busy.current) return;
    busy.current = true;
    setSavingId(id);
    setMessage(null);
    try {
      await action();
      setMessage({ kind: "success", text: success });
      setConfirmDelete(null);
      router.refresh();
    } catch (err) {
      setMessage({ kind: "error", text: err instanceof Error ? err.message : "Something went wrong — nothing was changed." });
    } finally {
      busy.current = false;
      setSavingId(null);
    }
  }

  const q = query.trim().toLowerCase();
  const rows = income.filter(
    (i) =>
      (filter === "all" || i.status === filter) &&
      (!q ||
        (i.payer_name ?? "").toLowerCase().includes(q) ||
        (i.description ?? "").toLowerCase().includes(q) ||
        FINANCE_INCOME_SOURCE_LABEL[i.source].toLowerCase().includes(q))
  );

  return (
    <section aria-label="Income records" className="flex flex-col rounded-2xl border border-charcoal/10 bg-white">
      <div className="flex flex-col gap-3 border-b border-charcoal/10 px-4 py-3 sm:px-5">
        <SearchField id="income-search" label="Search income" value={query} onChange={setQuery} placeholder="Payer, source or description" />
        <FilterChips
          label="Income status"
          value={filter}
          onChange={setFilter}
          options={[
            { value: "all", label: "All", count: income.length },
            { value: "received", label: "Received", count: income.filter((i) => i.status === "received").length },
            { value: "pending", label: "Expected", count: income.filter((i) => i.status === "pending").length },
          ]}
        />
      </div>
      {message && (
        <p role={message.kind === "error" ? "alert" : "status"} className={message.kind === "error" ? "mx-5 mt-3 rounded-xl border border-status-action/40 bg-status-actionBg px-3 py-2 text-sm text-charcoal" : "mx-5 mt-3 rounded-xl bg-status-readyBg px-3 py-2 text-sm text-charcoal"}>
          {message.text}
        </p>
      )}
      {rows.length === 0 ? (
        <EmptyState title={income.length === 0 ? "No income recorded yet" : "No income matches"} description={income.length === 0 ? "Add MOE funding or other money received." : "Try another search or status."} />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
                <th scope="col" className="px-5 py-2.5">Date</th>
                <th scope="col" className="px-3 py-2.5">Source</th>
                <th scope="col" className="px-3 py-2.5">From</th>
                <th scope="col" className="px-3 py-2.5 text-right">Amount</th>
                <th scope="col" className="px-3 py-2.5">Status</th>
                <th scope="col" className="px-3 py-2.5 pr-5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/10">
              {rows.map((i) => {
                const late = i.status === "pending" && i.due_date && i.due_date < today;
                return (
                  <tr key={i.id} className="align-top">
                    <td className="whitespace-nowrap px-5 py-2.5">{fmtDate(i.income_date)}</td>
                    <td className="px-3 py-2.5">{FINANCE_INCOME_SOURCE_LABEL[i.source]}</td>
                    <td className="px-3 py-2.5">
                      {i.payer_name || "—"}
                      {(i.description || i.invoice_number) && (
                        <span className="block max-w-xs text-xs text-charcoal/70">
                          {[i.description, i.invoice_number ? `Ref ${i.invoice_number}` : null].filter(Boolean).join(" · ")}
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-right font-medium tabular-nums">{formatCurrency(i.amount)}</td>
                    <td className="px-3 py-2.5">
                      {i.status === "received" ? (
                        <StatusPill tone="ready">Received {fmtDate(i.received_date)}</StatusPill>
                      ) : (
                        <StatusPill tone={late ? "action" : "attention"}>{late ? `Expected by ${fmtDate(i.due_date)} — late` : i.due_date ? `Expected by ${fmtDate(i.due_date)}` : "Expected"}</StatusPill>
                      )}
                    </td>
                    <td className="px-3 py-2.5 pr-5">
                      {confirmDelete === i.id ? (
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          <span className="text-sm">Delete this record?</span>
                          <button type="button" className="btn-secondary px-3 py-1" disabled={savingId === i.id} onClick={() => setConfirmDelete(null)}>
                            Keep
                          </button>
                          <button
                            type="button"
                            className="btn-danger px-3 py-1"
                            disabled={savingId === i.id}
                            onClick={() => run(i.id, () => deleteIncome(i.id), "Income record deleted.")}
                          >
                            {savingId === i.id ? "Deleting…" : "Delete"}
                          </button>
                        </div>
                      ) : (
                        <div className="flex flex-wrap items-center justify-end gap-1">
                          <button
                            type="button"
                            className="btn-secondary px-3 py-1"
                            disabled={savingId !== null}
                            onClick={() =>
                              run(
                                i.id,
                                () => setIncomeReceived(i.id, i.status !== "received"),
                                i.status === "received" ? "Marked as expected." : `Marked as received today (${fmtDate(today)}).`
                              )
                            }
                          >
                            {savingId === i.id ? "Saving…" : i.status === "received" ? "Mark expected" : "Mark received"}
                          </button>
                          <button type="button" className="btn-ghost px-3 py-1 text-status-action" disabled={savingId !== null} onClick={() => setConfirmDelete(i.id)}>
                            Delete
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

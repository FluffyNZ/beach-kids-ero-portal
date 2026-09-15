"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setIncomeReceived, deleteIncome } from "@/lib/actions/finances";
import { StatusBadge } from "@/components/status-badge";
import { TrashIcon } from "@/components/icons";
import { FINANCE_INCOME_SOURCE_LABEL } from "@/lib/constants";
import { formatDate, formatCurrency, isOverdue } from "@/lib/utils";
import type { FinanceIncomeEntry } from "@/lib/types";

export function IncomeTable({ income }: { income: FinanceIncomeEntry[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (income.length === 0) {
    return <div className="card p-10 text-center text-sm text-charcoal/40">No income recorded yet.</div>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[860px] text-left text-sm">
        <thead>
          <tr className="border-b border-charcoal/5 text-xs uppercase tracking-wide text-charcoal/50">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Source</th>
            <th className="px-4 py-3 font-medium">From</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal/5">
          {income.map((i) => {
            const overdue = i.status === "pending" && isOverdue(i.due_date);
            return (
              <tr key={i.id} className="align-top">
                <td className="px-4 py-3 text-charcoal/70">{formatDate(i.income_date)}</td>
                <td className="px-4 py-3 text-charcoal/70">{FINANCE_INCOME_SOURCE_LABEL[i.source]}</td>
                <td className="px-4 py-3 text-charcoal">{i.payer_name || "—"}</td>
                <td className="max-w-xs px-4 py-3 text-charcoal/70">
                  {i.description || "—"}
                  {i.invoice_number && <span className="block text-xs text-charcoal/40">Invoice #{i.invoice_number}</span>}
                </td>
                <td className="px-4 py-3 font-medium text-charcoal">{formatCurrency(i.amount)}</td>
                <td className={overdue ? "px-4 py-3 font-medium text-status-action" : "px-4 py-3 text-charcoal/70"}>
                  {formatDate(i.due_date)}
                  {overdue ? " (overdue)" : ""}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={i.status === "received" ? "ready" : "attention"}>
                    {i.status === "received" ? "Received" : "Pending"}
                  </StatusBadge>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="btn-ghost px-2.5 py-1 text-xs"
                      onClick={() =>
                        startTransition(async () => {
                          await setIncomeReceived(i.id, i.status !== "received");
                          router.refresh();
                        })
                      }
                    >
                      {i.status === "received" ? "Mark pending" : "Mark received"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      aria-label="Delete"
                      className="rounded-lg p-1.5 text-charcoal/30 hover:bg-status-actionBg hover:text-status-action"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteIncome(i.id);
                          router.refresh();
                        })
                      }
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

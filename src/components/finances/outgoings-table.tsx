"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOutgoingPaid, deleteOutgoing } from "@/lib/actions/finances";
import { StatusBadge } from "@/components/status-badge";
import { TrashIcon } from "@/components/icons";
import { formatDate, formatCurrency, isOverdue } from "@/lib/utils";
import type { FinanceOutgoing } from "@/lib/types";

export function OutgoingsTable({ outgoings }: { outgoings: FinanceOutgoing[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (outgoings.length === 0) {
    return <div className="card p-10 text-center text-sm text-charcoal/40">No outgoings recorded yet.</div>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[820px] text-left text-sm">
        <thead>
          <tr className="border-b border-charcoal/5 text-xs uppercase tracking-wide text-charcoal/50">
            <th className="px-4 py-3 font-medium">Date</th>
            <th className="px-4 py-3 font-medium">Supplier</th>
            <th className="px-4 py-3 font-medium">Category</th>
            <th className="px-4 py-3 font-medium">Description</th>
            <th className="px-4 py-3 font-medium">Amount</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-charcoal/5">
          {outgoings.map((o) => {
            const overdue = o.status === "unpaid" && isOverdue(o.due_date);
            return (
              <tr key={o.id} className="align-top">
                <td className="px-4 py-3 text-charcoal/70">{formatDate(o.expense_date)}</td>
                <td className="px-4 py-3 text-charcoal">{o.supplier || "—"}</td>
                <td className="px-4 py-3 text-charcoal/70">{o.category || "—"}</td>
                <td className="max-w-xs px-4 py-3 text-charcoal/70">
                  {o.description || "—"}
                  {o.needs_more_detail && (
                    <span className="ml-1.5 whitespace-nowrap text-xs text-status-attention">· needs detail</span>
                  )}
                </td>
                <td className="px-4 py-3 font-medium text-charcoal">{formatCurrency(o.amount)}</td>
                <td className={overdue ? "px-4 py-3 font-medium text-status-action" : "px-4 py-3 text-charcoal/70"}>
                  {formatDate(o.due_date)}
                  {overdue ? " (overdue)" : ""}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={o.status === "paid" ? "ready" : "attention"}>
                    {o.status === "paid" ? "Paid" : "Unpaid"}
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
                          await setOutgoingPaid(o.id, o.status !== "paid");
                          router.refresh();
                        })
                      }
                    >
                      {o.status === "paid" ? "Mark unpaid" : "Mark paid"}
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      aria-label="Delete"
                      className="rounded-lg p-1.5 text-charcoal/30 hover:bg-status-actionBg hover:text-status-action"
                      onClick={() =>
                        startTransition(async () => {
                          await deleteOutgoing(o.id);
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

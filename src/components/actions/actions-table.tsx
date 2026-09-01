"use client";

import { useTransition } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { completeAction } from "@/lib/actions/actions";
import { ACTION_PRIORITY_LABEL, ACTION_STATUS_LABEL, priorityTone } from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/utils";
import type { ActionItem } from "@/lib/types";

export function ActionsTable({ actions }: { actions: ActionItem[] }) {
  const [pending, startTransition] = useTransition();

  if (actions.length === 0) {
    return <div className="card p-10 text-center text-sm text-ocean-500">No actions match these filters.</div>;
  }

  return (
    <div className="card overflow-x-auto">
      <table className="w-full min-w-[720px] text-left text-sm">
        <thead>
          <tr className="border-b border-ocean-50 text-xs uppercase tracking-wide text-ocean-500">
            <th className="px-4 py-3 font-medium">Criterion</th>
            <th className="px-4 py-3 font-medium">Action</th>
            <th className="px-4 py-3 font-medium">Responsible</th>
            <th className="px-4 py-3 font-medium">Due</th>
            <th className="px-4 py-3 font-medium">Priority</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium" />
          </tr>
        </thead>
        <tbody className="divide-y divide-ocean-50">
          {actions.map((a) => {
            const overdue = a.status !== "completed" && isOverdue(a.due_date);
            return (
              <tr key={a.id} className="align-top">
                <td className="px-4 py-3">
                  <Link href={`/checklist/${a.criterion_code}`} className="font-medium text-ocean-700 hover:underline">
                    {a.criterion_code}
                  </Link>
                </td>
                <td className="max-w-xs px-4 py-3 text-ocean-900">{a.description}</td>
                <td className="px-4 py-3 text-ocean-700">{a.responsible_person}</td>
                <td className={overdue ? "px-4 py-3 font-medium text-status-action" : "px-4 py-3 text-ocean-700"}>
                  {formatDate(a.due_date)}
                  {overdue ? " (overdue)" : ""}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge tone={priorityTone(a.priority)}>{ACTION_PRIORITY_LABEL[a.priority]}</StatusBadge>
                </td>
                <td className="px-4 py-3 text-ocean-700">{ACTION_STATUS_LABEL[a.status]}</td>
                <td className="px-4 py-3">
                  {a.status !== "completed" && (
                    <button
                      type="button"
                      disabled={pending}
                      className="btn-ghost px-2.5 py-1 text-xs"
                      onClick={() => startTransition(() => completeAction(a.id, a.criterion_id, a.criterion_code))}
                    >
                      Complete
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

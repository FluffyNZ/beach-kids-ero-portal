"use client";

import { useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { StatusBadge } from "@/components/status-badge";
import { PlusIcon } from "@/components/icons";
import { createAction, completeAction, deleteAction } from "@/lib/actions/actions";
import { ACTION_PRIORITY_LABEL, ACTION_STATUS_LABEL, priorityTone } from "@/lib/constants";
import { formatDate, isOverdue } from "@/lib/utils";
import type { ActionItem } from "@/lib/types";
import type { ActionPriority } from "@/lib/supabase/database.types";

export function ActionsPanel({
  criterionId,
  criterionCode,
  actions,
}: {
  criterionId: string;
  criterionCode: string;
  actions: ActionItem[];
}) {
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-3">
      {actions.length === 0 ? (
        <p className="text-sm text-ocean-500">No actions raised for this criterion.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {actions.map((a) => {
            const overdue = a.status !== "completed" && isOverdue(a.due_date);
            return (
              <li key={a.id} className="rounded-xl border border-ocean-100 p-3">
                <div className="flex items-start justify-between gap-3">
                  <p className={a.status === "completed" ? "text-sm text-ocean-400 line-through" : "text-sm text-ocean-950"}>
                    {a.description}
                  </p>
                  <StatusBadge tone={priorityTone(a.priority)} className="shrink-0">
                    {ACTION_PRIORITY_LABEL[a.priority]}
                  </StatusBadge>
                </div>
                <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ocean-500">
                  <span>Responsible: {a.responsible_person}</span>
                  <span className={overdue ? "font-medium text-status-action" : undefined}>
                    Due {formatDate(a.due_date)}
                    {overdue ? " (overdue)" : ""}
                  </span>
                  <span>{ACTION_STATUS_LABEL[a.status]}</span>
                </div>
                {a.status !== "completed" && (
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      disabled={pending}
                      className="btn-ghost px-2.5 py-1 text-xs"
                      onClick={() => startTransition(() => completeAction(a.id, criterionId, criterionCode))}
                    >
                      Mark complete
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      className="btn-ghost px-2.5 py-1 text-xs text-status-action"
                      onClick={() => startTransition(() => deleteAction(a.id, criterionCode))}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <button type="button" className="btn-secondary self-start" onClick={() => setOpen(true)}>
        <PlusIcon className="h-4 w-4" />
        New action
      </button>

      <NewActionModal
        open={open}
        onClose={() => setOpen(false)}
        criterionId={criterionId}
        criterionCode={criterionCode}
      />
    </div>
  );
}

function NewActionModal({
  open,
  onClose,
  criterionId,
  criterionCode,
}: {
  open: boolean;
  onClose: () => void;
  criterionId: string;
  criterionCode: string;
}) {
  const [description, setDescription] = useState("");
  const [responsible, setResponsible] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [priority, setPriority] = useState<ActionPriority>("medium");
  const [pending, startTransition] = useTransition();

  function reset() {
    setDescription("");
    setResponsible("");
    setDueDate("");
    setPriority("medium");
  }

  return (
    <Modal open={open} onClose={onClose} title="New action">
      <form
        className="flex flex-col gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          if (!description.trim() || !responsible.trim()) return;
          startTransition(async () => {
            await createAction(criterionId, criterionCode, {
              description: description.trim(),
              responsible_person: responsible.trim(),
              due_date: dueDate || null,
              priority,
            });
            reset();
            onClose();
          });
        }}
      >
        <div>
          <label className="label">Action description</label>
          <textarea
            className="input min-h-[70px]"
            required
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="label">Responsible person</label>
            <input
              type="text"
              className="input"
              required
              value={responsible}
              onChange={(e) => setResponsible(e.target.value)}
            />
          </div>
          <div>
            <label className="label">Due date</label>
            <input type="date" className="input" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
          </div>
        </div>
        <div>
          <label className="label">Priority</label>
          <select className="input" value={priority} onChange={(e) => setPriority(e.target.value as ActionPriority)}>
            {(Object.keys(ACTION_PRIORITY_LABEL) as ActionPriority[]).map((p) => (
              <option key={p} value={p}>
                {ACTION_PRIORITY_LABEL[p]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Cancel
          </button>
          <button type="submit" disabled={pending} className="btn-primary">
            {pending ? "Saving…" : "Create action"}
          </button>
        </div>
      </form>
    </Modal>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createStaffGrowthCycle,
  updateStaffGrowthCycle,
  addStaffGrowthGoal,
  toggleStaffGrowthGoal,
  deleteStaffGrowthGoal,
} from "@/lib/actions/staff";
import { STAFF_GROWTH_CYCLE_STATUS_LABEL, staffGrowthCycleTone } from "@/lib/constants";
import { StatusBadge } from "@/components/status-badge";
import { PlusIcon, TrashIcon } from "@/components/icons";
import { formatDate } from "@/lib/utils";
import type { StaffGrowthCycle } from "@/lib/types";

function GoalRow({ staffId, goal }: { staffId: string; goal: StaffGrowthCycle["goals"][number] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  return (
    <li className="flex items-center justify-between gap-2 py-1.5">
      <label className="flex min-w-0 flex-1 cursor-pointer items-start gap-2">
        <input
          type="checkbox"
          className="mt-0.5 h-4 w-4 rounded border-charcoal/30 text-burgundy-500 focus:ring-burgundy-500"
          checked={goal.is_complete}
          disabled={pending}
          onChange={(e) =>
            startTransition(async () => {
              await toggleStaffGrowthGoal(staffId, goal.id, e.target.checked);
              router.refresh();
            })
          }
        />
        <span className={`text-sm ${goal.is_complete ? "text-charcoal/40 line-through" : "text-charcoal"}`}>
          {goal.description}
        </span>
      </label>
      <button
        type="button"
        disabled={pending}
        className="shrink-0 rounded-lg p-1.5 text-charcoal/30 hover:bg-status-actionBg hover:text-status-action"
        onClick={() =>
          startTransition(async () => {
            await deleteStaffGrowthGoal(staffId, goal.id);
            router.refresh();
          })
        }
      >
        <TrashIcon className="h-3.5 w-3.5" />
      </button>
    </li>
  );
}

function CycleCard({ staffId, cycle }: { staffId: string; cycle: StaffGrowthCycle }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reflections, setReflections] = useState(cycle.reflections ?? "");
  const [reviewDate, setReviewDate] = useState(cycle.review_date ?? "");
  const [saved, setSaved] = useState(false);
  const [newGoal, setNewGoal] = useState("");

  return (
    <div className="card flex flex-col gap-4 p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-medium text-charcoal">{cycle.title}</h3>
            <StatusBadge tone={staffGrowthCycleTone(cycle.status)}>{STAFF_GROWTH_CYCLE_STATUS_LABEL[cycle.status]}</StatusBadge>
          </div>
          <p className="mt-0.5 text-xs text-charcoal/50">
            {cycle.start_date ? `Started ${formatDate(cycle.start_date)}` : "Start date not recorded"}
          </p>
        </div>
        {cycle.status === "open" ? (
          <button
            type="button"
            disabled={pending}
            className="btn-ghost"
            onClick={() =>
              startTransition(async () => {
                await updateStaffGrowthCycle(staffId, cycle.id, { status: "closed" });
                router.refresh();
              })
            }
          >
            Close cycle
          </button>
        ) : (
          <button
            type="button"
            disabled={pending}
            className="btn-ghost"
            onClick={() =>
              startTransition(async () => {
                await updateStaffGrowthCycle(staffId, cycle.id, { status: "open" });
                router.refresh();
              })
            }
          >
            Reopen cycle
          </button>
        )}
      </div>

      <div>
        <label className="label">Review date</label>
        <input
          type="date"
          className="input max-w-xs"
          value={reviewDate}
          onChange={(e) => {
            setReviewDate(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      <div>
        <h4 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Goals</h4>
        {cycle.goals.length === 0 && <p className="mb-2 text-sm text-charcoal/40">No goals recorded yet.</p>}
        <ul className="divide-y divide-charcoal/5">
          {cycle.goals.map((g) => (
            <GoalRow key={g.id} staffId={staffId} goal={g} />
          ))}
        </ul>
        <form
          className="mt-2 flex gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newGoal.trim()) return;
            startTransition(async () => {
              await addStaffGrowthGoal(staffId, cycle.id, newGoal);
              setNewGoal("");
              router.refresh();
            });
          }}
        >
          <input
            className="input"
            placeholder="Add a goal…"
            value={newGoal}
            onChange={(e) => setNewGoal(e.target.value)}
          />
          <button type="submit" disabled={pending || !newGoal.trim()} className="btn-secondary">
            <PlusIcon className="h-4 w-4" />
            Add
          </button>
        </form>
      </div>

      <div>
        <label className="label">Goals &amp; reflections</label>
        <textarea
          className="input min-h-[90px]"
          placeholder="How this cycle is going, what's been reflected on, evidence to follow up on…"
          value={reflections}
          onChange={(e) => {
            setReflections(e.target.value);
            setSaved(false);
          }}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          className="btn-primary"
          onClick={() =>
            startTransition(async () => {
              await updateStaffGrowthCycle(staffId, cycle.id, {
                reflections: reflections || null,
                review_date: reviewDate || null,
              });
              setSaved(true);
              router.refresh();
            })
          }
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

export function StaffGrowthPanel({ staffId, cycles }: { staffId: string; cycles: StaffGrowthCycle[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [newTitle, setNewTitle] = useState("");
  const [showNewForm, setShowNewForm] = useState(cycles.length === 0);

  return (
    <div className="flex flex-col gap-4">
      {cycles.map((cycle) => (
        <CycleCard key={cycle.id} staffId={staffId} cycle={cycle} />
      ))}

      {showNewForm ? (
        <form
          className="card flex flex-col gap-3 p-5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!newTitle.trim()) return;
            startTransition(async () => {
              const result = await createStaffGrowthCycle(staffId, { title: newTitle });
              if (result.success) {
                setNewTitle("");
                setShowNewForm(false);
                router.refresh();
              }
            });
          }}
        >
          <h3 className="text-sm font-semibold text-charcoal">Start a growth cycle</h3>
          <input
            className="input"
            placeholder="e.g. 2026 growth cycle"
            value={newTitle}
            onChange={(e) => setNewTitle(e.target.value)}
            autoFocus
          />
          <div className="flex justify-end gap-2">
            {cycles.length > 0 && (
              <button type="button" className="btn-ghost" onClick={() => setShowNewForm(false)}>
                Cancel
              </button>
            )}
            <button type="submit" disabled={pending || !newTitle.trim()} className="btn-primary">
              {pending ? "Starting…" : "Start cycle"}
            </button>
          </div>
        </form>
      ) : (
        <button type="button" className="btn-secondary self-start" onClick={() => setShowNewForm(true)}>
          <PlusIcon className="h-4 w-4" />
          Start a new growth cycle
        </button>
      )}
    </div>
  );
}

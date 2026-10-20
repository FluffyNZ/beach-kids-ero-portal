"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveMarketingSettings } from "@/lib/actions/marketing";
import type { MarketingSettings } from "@/lib/types";

/** The posting-goal + Christmas closure/reopening dates editor. Christmas
 * dates are deliberately blank until Ethan types real ones in — nothing
 * here guesses or defaults them, per the brief ("let us enter our
 * Christmas closure and reopening dates"). Once both are set, the
 * suggestion engine (src/lib/marketing/post-suggestions.ts) starts
 * offering the matching closure/reopening post drafts. */
export function MarketingSettingsForm({ settings }: { settings: MarketingSettings }) {
  const router = useRouter();
  const [monthlyGoal, setMonthlyGoal] = useState(String(settings.monthlyGoal));
  const [weeklyGoalEnabled, setWeeklyGoalEnabled] = useState(settings.weeklyGoalEnabled);
  const [weeklyGoal, setWeeklyGoal] = useState(settings.weeklyGoal !== null ? String(settings.weeklyGoal) : "");
  const [closureStart, setClosureStart] = useState(settings.christmasClosureStart ?? "");
  const [reopeningDate, setReopeningDate] = useState(settings.christmasReopeningDate ?? "");
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await saveMarketingSettings({
        monthly_goal: Math.max(1, Number(monthlyGoal) || 1),
        weekly_goal_enabled: weeklyGoalEnabled,
        weekly_goal: weeklyGoalEnabled ? Number(weeklyGoal) || null : null,
        christmas_closure_start: closureStart || null,
        christmas_reopening_date: reopeningDate || null,
      });
      setSaved(true);
      router.refresh();
    });
  }

  return (
    <div className="card flex flex-col gap-4 p-5">
      <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Marketing settings</h2>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Monthly posting goal</label>
          <input
            type="number"
            min={1}
            className="input"
            value={monthlyGoal}
            onChange={(e) => {
              setMonthlyGoal(e.target.value);
              setSaved(false);
            }}
          />
        </div>
        <div>
          <label className="flex items-center gap-2 text-sm text-charcoal">
            <input
              type="checkbox"
              checked={weeklyGoalEnabled}
              onChange={(e) => {
                setWeeklyGoalEnabled(e.target.checked);
                setSaved(false);
              }}
            />
            Also track a weekly goal
          </label>
          {weeklyGoalEnabled && (
            <input
              type="number"
              min={1}
              className="input mt-1.5"
              placeholder="Posts per week"
              value={weeklyGoal}
              onChange={(e) => {
                setWeeklyGoal(e.target.value);
                setSaved(false);
              }}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="label">Christmas closure date</label>
          <input
            type="date"
            className="input"
            value={closureStart}
            onChange={(e) => {
              setClosureStart(e.target.value);
              setSaved(false);
            }}
          />
          <p className="mt-1 text-xs text-charcoal/40">Enter Beach Kids' own real last day before the break.</p>
        </div>
        <div>
          <label className="label">Reopening date</label>
          <input
            type="date"
            className="input"
            value={reopeningDate}
            onChange={(e) => {
              setReopeningDate(e.target.value);
              setSaved(false);
            }}
          />
          <p className="mt-1 text-xs text-charcoal/40">Once both dates are set, closure/reopening post ideas appear below.</p>
        </div>
      </div>

      <div className="flex justify-end">
        <button type="button" disabled={pending} className="btn-primary" onClick={handleSave}>
          {pending ? "Saving…" : saved ? "Saved" : "Save settings"}
        </button>
      </div>
    </div>
  );
}

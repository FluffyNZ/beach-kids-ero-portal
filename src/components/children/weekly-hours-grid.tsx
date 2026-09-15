"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveWeeklyHours } from "@/lib/actions/fees";
import { getRoomColorClasses } from "@/lib/constants";
import { formatCurrency, cn } from "@/lib/utils";
import type { ChildWeeklyFee, WeekdayHours } from "@/lib/types";

const DAYS: Array<{ key: keyof WeekdayHours; label: string }> = [
  { key: "mon_hours", label: "Mon" },
  { key: "tue_hours", label: "Tue" },
  { key: "wed_hours", label: "Wed" },
  { key: "thu_hours", label: "Thu" },
  { key: "fri_hours", label: "Fri" },
];

type RoomGroup = { key: string; name: string; color: string | null; children: ChildWeeklyFee[] };

/** Every active child's hours for one week, grouped by room, editable in
 * one grid with a single bulk save — one-at-a-time modals don't scale to
 * 48+ children × 5 days. Fee/parent-pays figures shown alongside each row
 * reflect the last-saved hours (they update after Save, from the server),
 * not a live-as-you-type recalculation. */
export function WeeklyHoursGrid({
  weekStartDate,
  children,
}: {
  weekStartDate: string;
  children: ChildWeeklyFee[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [hoursByChild, setHoursByChild] = useState<Record<string, WeekdayHours>>(() =>
    Object.fromEntries(children.map((c) => [c.child_id, { ...c.hours }]))
  );

  const groups = useMemo(() => {
    const byRoom = new Map<string, RoomGroup>();
    for (const c of children) {
      const key = c.room_name ?? "no-room";
      if (!byRoom.has(key)) {
        byRoom.set(key, { key, name: c.room_name ?? "No room set", color: c.room_color, children: [] });
      }
      byRoom.get(key)!.children.push(c);
    }
    return Array.from(byRoom.values());
  }, [children]);

  function setDayHours(childId: string, dayKey: keyof WeekdayHours, value: string) {
    setSaved(false);
    const parsed = value === "" ? 0 : Number(value);
    if (Number.isNaN(parsed)) return;
    setHoursByChild((prev) => ({
      ...prev,
      [childId]: { ...prev[childId], [dayKey]: Math.max(0, parsed) },
    }));
  }

  function weeklyTotal(childId: string): number {
    const h = hoursByChild[childId];
    if (!h) return 0;
    return h.mon_hours + h.tue_hours + h.wed_hours + h.thu_hours + h.fri_hours;
  }

  function handleSave() {
    setSaved(false);
    startTransition(async () => {
      await saveWeeklyHours({
        weekStartDate,
        entries: children.map((c) => ({ childId: c.child_id, hours: hoursByChild[c.child_id] })),
      });
      setSaved(true);
      router.refresh();
    });
  }

  if (children.length === 0) {
    return <div className="card p-10 text-center text-sm text-charcoal/50">No active children to show.</div>;
  }

  return (
    <div className="flex flex-col gap-8">
      {groups.map((group) => {
        const colors = getRoomColorClasses(group.color);
        return (
          <section key={group.key}>
            <div className="mb-3 flex items-center gap-2">
              <span className={cn("h-2.5 w-2.5 rounded-full", colors.chip)} />
              <h2 className="font-display text-sm font-semibold text-charcoal">{group.name}</h2>
              <span className="text-xs text-charcoal/40">
                {group.children.length} {group.children.length === 1 ? "child" : "children"}
              </span>
            </div>

            <div className="card overflow-x-auto p-0">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead>
                  <tr className="border-b border-charcoal/10 text-xs uppercase tracking-wide text-charcoal/40">
                    <th className="px-4 py-2.5 font-medium">Child</th>
                    {DAYS.map((d) => (
                      <th key={d.key} className="px-2 py-2.5 text-center font-medium">
                        {d.label}
                      </th>
                    ))}
                    <th className="px-3 py-2.5 text-center font-medium">Total hrs</th>
                    <th className="px-3 py-2.5 text-right font-medium">Fee</th>
                    <th className="px-3 py-2.5 text-right font-medium">Parent pays</th>
                  </tr>
                </thead>
                <tbody>
                  {group.children.map((c) => (
                    <tr key={c.child_id} className="border-b border-charcoal/5 last:border-0">
                      <td className="px-4 py-2 font-medium text-charcoal">
                        {c.full_name}
                        {c.is_estimated && (
                          <span
                            className="ml-2 rounded-full bg-sand-100 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-charcoal/50"
                            title="From this child's enrolled schedule — not yet confirmed for this week"
                          >
                            Estimated
                          </span>
                        )}
                      </td>
                      {DAYS.map((d) => (
                        <td key={d.key} className="px-2 py-2 text-center">
                          <input
                            type="number"
                            min={0}
                            step={0.5}
                            value={hoursByChild[c.child_id]?.[d.key] ?? 0}
                            onChange={(e) => setDayHours(c.child_id, d.key, e.target.value)}
                            className="w-14 rounded-md border border-charcoal/15 px-1.5 py-1 text-center text-sm focus:border-teal focus:outline-none"
                          />
                        </td>
                      ))}
                      <td className="px-3 py-2 text-center text-charcoal/70">{weeklyTotal(c.child_id).toFixed(1)}</td>
                      <td className="px-3 py-2 text-right text-charcoal/70">{formatCurrency(c.fee_total)}</td>
                      <td className="px-3 py-2 text-right font-medium text-charcoal">{formatCurrency(c.parent_pays)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        );
      })}

      <div className="sticky bottom-4 flex justify-end">
        <button type="button" onClick={handleSave} disabled={isPending} className="btn-primary shadow-lg">
          {isPending ? "Saving…" : saved ? "Saved ✓" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

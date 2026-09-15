"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createHazardCheck } from "@/lib/actions/hazard-checks";
import { StatusBadge } from "@/components/status-badge";
import { getRoomColorClasses } from "@/lib/constants";
import type { RoomWeekStatus } from "@/lib/data/hazard-checks";

/** One room's card in the "This week" section — starts this week's chart if
 * none exists yet, otherwise takes you straight to it. Shows whether TODAY
 * specifically has been signed off, since that's what a staff member
 * standing in the room right now actually needs to know. Because
 * createHazardCheck finds-or-creates by room + week, clicking this twice
 * (or two people clicking it back to back) never creates a duplicate chart
 * for the same room and week. */
export function TodayRoomCard({
  status,
  weekStartDate,
}: {
  status: RoomWeekStatus;
  weekStartDate: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const roomClasses = getRoomColorClasses(status.room.color);

  function handleClick() {
    if (status.weekCheckId) {
      router.push(`/records/hazards/${status.weekCheckId}`);
      return;
    }
    setError(null);
    startTransition(async () => {
      const result = await createHazardCheck(status.room.id, weekStartDate);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.push(`/records/hazards/${result.id}`);
    });
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={pending}
      className="card flex w-full items-center gap-3 p-4 text-left transition-shadow hover:shadow-cardHover disabled:opacity-60"
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${roomClasses.bg} ${roomClasses.text}`}
      >
        {status.room.name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-charcoal">{status.room.name}</p>
        {error ? (
          <p className="mt-0.5 text-xs text-status-action">{error}</p>
        ) : (
          <p className="mt-0.5 text-xs text-charcoal/50">
            {pending
              ? "Starting…"
              : status.todaySignedOff
                ? "Signed off for today"
                : status.weekCheckId
                  ? "This week's chart is started — today not signed off yet"
                  : "This week's chart hasn't been started yet"}
          </p>
        )}
      </div>
      {status.todaySignedOff ? (
        <StatusBadge tone="ready">Done</StatusBadge>
      ) : status.weekCheckId ? (
        <StatusBadge tone="attention">Continue</StatusBadge>
      ) : (
        <StatusBadge tone="neutral">Start</StatusBadge>
      )}
    </button>
  );
}

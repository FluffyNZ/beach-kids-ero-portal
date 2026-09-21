"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";
import { addMonths } from "@/lib/utils";

// How far a touch has to travel horizontally before it counts as a
// deliberate swipe rather than an accidental wobble mid-scroll.
const SWIPE_THRESHOLD_PX = 60;
// A swipe has to be mostly sideways, not mostly up/down — otherwise
// scrolling the page on mobile would keep misfiring a month change.
const MIN_HORIZONTAL_TO_VERTICAL_RATIO = 1.5;

/** Wraps the month grid so a left/right swipe on it moves to the next/
 * previous month, same destination as the MonthNav buttons above it —
 * touch-only (mouse drags on desktop don't fire touch events), so it only
 * ever does anything on a phone or tablet. */
export function CalendarSwipeNav({
  monthKey,
  basePath,
  children,
}: {
  monthKey: string;
  basePath: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const touchStart = useRef<{ x: number; y: number } | null>(null);

  function handleTouchStart(e: React.TouchEvent) {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  }

  function handleTouchEnd(e: React.TouchEvent) {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;

    const t = e.changedTouches[0];
    const deltaX = t.clientX - start.x;
    const deltaY = t.clientY - start.y;

    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    if (Math.abs(deltaX) < Math.abs(deltaY) * MIN_HORIZONTAL_TO_VERTICAL_RATIO) return;

    const delta = deltaX < 0 ? 1 : -1; // swipe left -> next month, swipe right -> previous month
    const nextMonthKey = addMonths(`${monthKey}-01`, delta).slice(0, 7);
    router.push(`${basePath}?month=${nextMonthKey}`);
  }

  return (
    <div onTouchStart={handleTouchStart} onTouchEnd={handleTouchEnd}>
      {children}
    </div>
  );
}

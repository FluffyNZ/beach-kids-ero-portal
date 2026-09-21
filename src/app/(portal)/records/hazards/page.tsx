import Link from "next/link";
import {
  getThisWeeksHazardCheckStatus,
  getHazardChecksList,
  getRoomsWithHazardTemplates,
  getHazardChecklistTemplatesByRoom,
} from "@/lib/data/hazard-checks";
import { getStaffList } from "@/lib/data/staff";
import { mondayOf } from "@/lib/utils";
import { getRoomColorClasses } from "@/lib/constants";
import { TodayRoomCard } from "@/components/hazards/today-room-card";
import { BackfillCheckForm } from "@/components/hazards/backfill-check-form";
import { HazardPhotoBatchImportPanel } from "@/components/hazards/hazard-photo-batch-import-panel";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";
import type { HazardCheckSummary, RosterRoom } from "@/lib/types";

export const dynamic = "force-dynamic";

/** One room's block in the history section — a room's whole hazard-check
 * history is a lot to scroll through as a flat list of weeks, so this links
 * straight into that room's own calendar instead, with just enough of a
 * summary (most recent week, any open hazards) to know whether it's worth
 * opening. */
function RoomHistoryBlock({ room, checks }: { room: RosterRoom; checks: HazardCheckSummary[] }) {
  const roomClasses = getRoomColorClasses(room.color);
  const mostRecent = checks[0] ?? null;
  const openHazardCount = checks.reduce((sum, c) => sum + c.openHazardCount, 0);

  return (
    <Link
      href={`/records/hazards/rooms/${room.id}`}
      className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-cardHover"
    >
      <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${roomClasses.bg} ${roomClasses.text}`}>
        {room.name.slice(0, 2).toUpperCase()}
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-charcoal">{room.name}</p>
          {mostRecent && (
            <StatusBadge tone={mostRecent.daysSignedOff === mostRecent.totalWeekdays ? "ready" : "attention"}>
              Latest week: {mostRecent.daysSignedOff}/{mostRecent.totalWeekdays} days
            </StatusBadge>
          )}
          {openHazardCount > 0 && (
            <StatusBadge tone="action">
              {openHazardCount} open hazard{openHazardCount === 1 ? "" : "s"}
            </StatusBadge>
          )}
        </div>
        <p className="mt-0.5 text-xs text-charcoal/50">
          {checks.length} week{checks.length === 1 ? "" : "s"} on record · View calendar
        </p>
      </div>
    </Link>
  );
}

export default async function HazardChecksPage() {
  const today = new Date().toISOString().slice(0, 10);
  const weekStartDate = mondayOf(new Date());

  const [weekStatus, rooms, history, templatesByRoom, staff] = await Promise.all([
    getThisWeeksHazardCheckStatus(weekStartDate, today),
    getRoomsWithHazardTemplates(),
    getHazardChecksList(),
    getHazardChecklistTemplatesByRoom(),
    // Both current and former staff — an old paper checklist might well be
    // signed by someone who's since left.
    getStaffList(),
  ]);

  const checksByRoom = new Map<string, HazardCheckSummary[]>();
  history.forEach((check) => {
    const list = checksByRoom.get(check.room_id) ?? [];
    list.push(check);
    checksByRoom.set(check.room_id, list);
  });

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/records" className="hover:text-charcoal">
          Records &amp; Compliance
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">Daily Hazard Checks</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Daily Hazard Checks</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            The Indoor / Outdoor / Allergy walk-through completed for each room — one chart per week, signed off day
            by day, matching Beach Kids&apos; real Weekly Hazard Checklist.
          </p>
        </div>
        <Link href="/records/hazards/register" className="btn-secondary">
          Hazard Register
        </Link>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Import from photos</h2>
        <HazardPhotoBatchImportPanel rooms={rooms} templatesByRoom={templatesByRoom} staff={staff} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">This week</h2>
        {weekStatus.length === 0 ? (
          <p className="card p-6 text-center text-sm text-charcoal/50">
            No rooms have a hazard checklist set up yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {weekStatus.map((status) => (
              <TodayRoomCard key={status.room.id} status={status} weekStartDate={weekStartDate} />
            ))}
          </div>
        )}
        <BackfillCheckForm rooms={rooms} today={today} />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">History, by room</h2>
        <div className="flex flex-col gap-3">
          {rooms.length === 0 && (
            <p className="card p-6 text-center text-sm text-charcoal/50">
              No rooms have a hazard checklist set up yet.
            </p>
          )}
          {rooms.map((room) => (
            <RoomHistoryBlock key={room.id} room={room} checks={checksByRoom.get(room.id) ?? []} />
          ))}
        </div>
      </section>
    </div>
  );
}

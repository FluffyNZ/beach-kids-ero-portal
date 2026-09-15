import Link from "next/link";
import { notFound } from "next/navigation";
import { getHazardRoomCalendar, getRoomsWithHazardTemplates, getHazardChecksList } from "@/lib/data/hazard-checks";
import { currentMonthKey, monthLabel } from "@/lib/data/learning-stories";
import { MonthNav } from "@/components/learning-stories/month-nav";
import { HazardRoomCalendar } from "@/components/hazards/hazard-room-calendar";
import { getRoomColorClasses } from "@/lib/constants";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function HazardRoomCalendarPage({
  params,
  searchParams,
}: {
  params: { roomId: string };
  searchParams: { month?: string };
}) {
  const monthKey = searchParams.month || currentMonthKey();

  const [rooms, weeks, roomChecks] = await Promise.all([
    getRoomsWithHazardTemplates(),
    getHazardRoomCalendar(params.roomId, monthKey),
    getHazardChecksList({ roomId: params.roomId }),
  ]);

  const room = rooms.find((r) => r.id === params.roomId);
  if (!room) notFound();

  const roomClasses = getRoomColorClasses(room.color);
  const openHazardCount = roomChecks.reduce((sum, c) => sum + c.openHazardCount, 0);

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/records/hazards" className="hover:text-charcoal">
          Daily Hazard Checks
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">{room.name}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${roomClasses.bg} ${roomClasses.text}`}>
            {room.name.slice(0, 2).toUpperCase()}
          </span>
          <div>
            <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">{room.name}</h1>
            <p className="mt-0.5 text-sm text-charcoal/60">
              {roomChecks.length} week{roomChecks.length === 1 ? "" : "s"} on record
              {openHazardCount > 0 ? ` · ${openHazardCount} open hazard${openHazardCount === 1 ? "" : "s"}` : ""}
            </p>
          </div>
        </div>
      </div>

      <MonthNav monthKey={monthKey} monthLabel={monthLabel(monthKey)} basePath={`/records/hazards/rooms/${room.id}`} />

      <div className="flex flex-wrap gap-3 text-xs text-charcoal/60">
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-ready" /> Signed off
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-status-attention" /> Not signed off yet
        </span>
        <span className="inline-flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full border border-dashed border-charcoal/30" /> No chart started
        </span>
      </div>

      <HazardRoomCalendar weeks={weeks} />
    </div>
  );
}

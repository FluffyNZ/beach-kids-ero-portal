import Link from "next/link";
import { getSunblockChecklist } from "@/lib/data/sunblock-checklist";
import { getRosterRooms } from "@/lib/data/roster";
import { SunblockChecklistTable } from "@/components/children/sunblock-checklist-table";
import { SunblockChecklistControls } from "@/components/children/sunblock-checklist-controls";
import { AutoPrint } from "@/components/attendance-roll/auto-print";
import { PrintButton } from "@/components/audit-pack/print-button";
import { DownloadJpegButton } from "@/components/attendance-roll/download-jpeg-button";
import { formatLongDate, nzTodayDateString, weekdayKeyOfDateString } from "@/lib/utils";
import { HOME_ROOM_NAMES } from "@/lib/data/home";

export const dynamic = "force-dynamic";

const CAPTURE_ID = "sunblock-checklist-capture";

export default async function SunblockChecklistPage({
  searchParams,
}: {
  searchParams: { date?: string; room?: string; autoprint?: string };
}) {
  const requested = searchParams.date ? new Date(`${searchParams.date}T00:00:00Z`) : null;
  const date = requested && !Number.isNaN(requested.getTime()) ? searchParams.date! : nzTodayDateString();

  const allRooms = (await getRosterRooms()).filter((r) => HOME_ROOM_NAMES.includes(r.name));
  const requestedRoomId = searchParams.room && allRooms.some((r) => r.id === searchParams.room) ? searchParams.room : "";

  const rooms = await getSunblockChecklist(date, requestedRoomId || undefined);
  const selectedRoomName = requestedRoomId ? allRooms.find((r) => r.id === requestedRoomId)?.name : null;
  const isWeekend = weekdayKeyOfDateString(date) === null;
  const dateLabel = formatLongDate(new Date(`${date}T00:00:00Z`));

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 print:max-w-none">
      {searchParams.autoprint === "1" && <AutoPrint />}

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Sunblock Checklist</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            One tick sheet per room for the day picked below — who&apos;s enrolled, with an AM and a PM (reapply)
            column. Print it and tick by hand; nothing here is saved back to the app.
          </p>
        </div>
        <Link href="/children" className="btn-ghost">
          ← Children
        </Link>
      </div>

      <SunblockChecklistControls date={date} roomId={requestedRoomId} rooms={allRooms} />

      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <PrintButton />
        <DownloadJpegButton targetId={CAPTURE_ID} fileName={`sunblock-checklist-${date}.jpg`} />
      </div>

      <div id={CAPTURE_ID} className="flex flex-col gap-6 bg-white p-1">
        <div className="print:hidden">
          <p className="font-display text-xl font-bold text-charcoal">Beach Kids — Sunblock Checklist</p>
          <p className="text-sm text-charcoal/60">
            {dateLabel}
            {selectedRoomName ? ` · ${selectedRoomName} only` : ""}
          </p>
        </div>

        {isWeekend ? (
          <div className="card p-6 text-sm text-charcoal/60">
            {dateLabel} is a weekend — the centre&apos;s booked sessions don&apos;t cover Saturday/Sunday, so there&apos;s
            nothing to generate a checklist from. Pick a weekday above.
          </div>
        ) : (
          rooms.map((room, i) => (
            <SunblockChecklistTable
              key={room.id}
              room={room}
              dateLabel={dateLabel}
              pageBreakAfter={i < rooms.length - 1}
            />
          ))
        )}

        <p className="text-xs text-charcoal/40 print:hidden">
          Who&apos;s enrolled reflects each child&apos;s regular booked schedule on file today, the same source the
          Weekly Booked Sessions roll uses — it won&apos;t catch a one-off absence or an extra day added just for
          today. The blank rows at the bottom of each room are for anyone not on that regular schedule (a drop-in, a
          visiting sibling) — write their name in by hand.
        </p>
      </div>
    </div>
  );
}

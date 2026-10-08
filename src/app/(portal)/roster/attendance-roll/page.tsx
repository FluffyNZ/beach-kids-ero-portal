import Link from "next/link";
import { getAttendanceRoll } from "@/lib/data/attendance-roll";
import { getRosterRooms } from "@/lib/data/roster";
import { AttendanceRollTable } from "@/components/attendance-roll/attendance-roll-table";
import { AttendanceRollControls } from "@/components/attendance-roll/attendance-roll-controls";
import { AutoPrint } from "@/components/attendance-roll/auto-print";
import { PrintButton } from "@/components/audit-pack/print-button";
import { DownloadJpegButton } from "@/components/attendance-roll/download-jpeg-button";
import { formatShortDate, mondayOf, addDays } from "@/lib/utils";
import { HOME_ROOM_NAMES } from "@/lib/data/home";

export const dynamic = "force-dynamic";

const CAPTURE_ID = "attendance-roll-capture";

/** Defaults to the Monday of *next* week — this is meant to be generated
 * and shared on a Friday for the week ahead, not for the current one.
 * `?week=` still accepts any date and snaps it to that week's Monday, in
 * case a specific week is ever needed. */
function defaultWeekStartDate(): string {
  return addDays(mondayOf(new Date()), 7);
}

export default async function AttendanceRollPage({
  searchParams,
}: {
  searchParams: { week?: string; room?: string; autoprint?: string };
}) {
  const requested = searchParams.week ? new Date(`${searchParams.week}T00:00:00Z`) : null;
  const weekStartDate = requested && !Number.isNaN(requested.getTime()) ? mondayOf(requested) : defaultWeekStartDate();

  const allRooms = (await getRosterRooms()).filter((r) => HOME_ROOM_NAMES.includes(r.name));
  const requestedRoomId = searchParams.room && allRooms.some((r) => r.id === searchParams.room) ? searchParams.room : "";

  const rooms = await getAttendanceRoll(requestedRoomId || undefined);
  const selectedRoomName = requestedRoomId ? allRooms.find((r) => r.id === requestedRoomId)?.name : null;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 print:max-w-none">
      {searchParams.autoprint === "1" && <AutoPrint />}

      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Weekly Booked Sessions</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Each room&apos;s regular booked days and times, straight from Children &amp; Fees — this is a{" "}
            <strong>booked sessions roll for staff planning</strong>, not a record of who actually attended. Real
            attendance is still recorded separately.
          </p>
        </div>
        <Link href="/roster" className="btn-ghost">
          ← Staff roster
        </Link>
      </div>

      <AttendanceRollControls weekStartDate={weekStartDate} roomId={requestedRoomId} rooms={allRooms} />

      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <PrintButton />
        <DownloadJpegButton targetId={CAPTURE_ID} fileName={`booked-sessions-${weekStartDate}.jpg`} />
      </div>

      <div id={CAPTURE_ID} className="flex flex-col gap-6 bg-white p-1">
        <div className="print:hidden">
          <p className="font-display text-xl font-bold text-charcoal">Beach Kids — Booked Sessions Roll</p>
          <p className="text-sm text-charcoal/60">
            Week starting {formatShortDate(weekStartDate)}
            {selectedRoomName ? ` · ${selectedRoomName} only` : ""}
          </p>
        </div>

        {rooms.map((room, i) => (
          <AttendanceRollTable
            key={room.id}
            room={room}
            weekStartDate={weekStartDate}
            pageBreakAfter={i < rooms.length - 1}
          />
        ))}

        <p className="text-xs text-charcoal/40 print:hidden">
          Booked sessions shown reflect each child&apos;s regular enrolled schedule on file today — this updates
          automatically whenever a schedule changes. One-off changes for this specific week (an extra day, a
          confirmed absence, a room move partway through the week) aren&apos;t tracked as data here yet, so use the
          blank Notes column on the printout for last-minute changes.
        </p>
      </div>
    </div>
  );
}

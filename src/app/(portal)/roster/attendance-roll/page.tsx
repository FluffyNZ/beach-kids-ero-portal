import Link from "next/link";
import { getAttendanceRoll } from "@/lib/data/attendance-roll";
import { getRosterRooms } from "@/lib/data/roster";
import { AttendanceRollTable } from "@/components/attendance-roll/attendance-roll-table";
import { AttendanceRollControls } from "@/components/attendance-roll/attendance-roll-controls";
import { AutoPrint } from "@/components/attendance-roll/auto-print";
import { PrintButton } from "@/components/audit-pack/print-button";
import { DownloadJpegButton } from "@/components/attendance-roll/download-jpeg-button";
import { PageHeader } from "@/components/ui/page-header";
import { addDays, mondayOfDateString, nzTodayDateString } from "@/lib/utils";
import { HOME_ROOM_NAMES } from "@/lib/data/home";

export const dynamic = "force-dynamic";

const CAPTURE_ID = "attendance-roll-capture";

const longFmt = new Intl.DateTimeFormat("en-NZ", { weekday: "short", day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const fmt = (date: string) => longFmt.format(new Date(`${date}T00:00:00Z`)).replace(",", "");

/** The printable booked sessions roll. Defaults to next week (it's usually
 * printed on a Friday for the week ahead); `?week=` takes any date and
 * snaps to that week's Monday (NZ dates), `?room=` narrows to one room. */
export default async function AttendanceRollPage({
  searchParams,
}: {
  searchParams: { week?: string; room?: string; autoprint?: string };
}) {
  const today = nzTodayDateString();
  const valid = searchParams.week && /^\d{4}-\d{2}-\d{2}$/.test(searchParams.week) && !Number.isNaN(Date.parse(searchParams.week));
  const weekStartDate = valid ? mondayOfDateString(searchParams.week!) : addDays(mondayOfDateString(today), 7);

  const allRooms = (await getRosterRooms()).filter((r) => HOME_ROOM_NAMES.includes(r.name));
  const requestedRoomId = searchParams.room && allRooms.some((r) => r.id === searchParams.room) ? searchParams.room : "";

  const rooms = await getAttendanceRoll(requestedRoomId || undefined);
  const selectedRoomName = requestedRoomId ? allRooms.find((r) => r.id === requestedRoomId)?.name : null;
  const weekLabel = `${fmt(weekStartDate)} – ${fmt(addDays(weekStartDate, 4))}`;
  const attendanceHref = `/children/hours?week=${weekStartDate}${requestedRoomId ? `&room=${requestedRoomId}` : ""}`;

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-5 print:max-w-none print:gap-3">
      {searchParams.autoprint === "1" && <AutoPrint />}

      <div className="flex flex-col gap-2 print:hidden">
        <Link href={attendanceHref} className="self-start rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline">
          ← Attendance
        </Link>
        <PageHeader
          title="Booked sessions roll"
          description="Each room's regular booked days and times, ready to print for staff. This is a plan, not a record of who attended — confirm actual hours on Attendance."
        />
      </div>

      <AttendanceRollControls weekStartDate={weekStartDate} roomId={requestedRoomId} rooms={allRooms} today={today} />

      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <PrintButton />
        <DownloadJpegButton targetId={CAPTURE_ID} fileName={`booked-sessions-${weekStartDate}.jpg`} />
      </div>

      <div id={CAPTURE_ID} className="flex flex-col gap-5 bg-white p-1 print:gap-0 print:p-0">
        {rooms.map((room, i) => (
          <AttendanceRollTable
            key={room.id}
            room={room}
            weekStartDate={weekStartDate}
            weekLabel={weekLabel}
            printedOn={fmt(today)}
            pageBreakAfter={i < rooms.length - 1}
          />
        ))}

        {rooms.length === 0 && <p className="text-sm text-charcoal/70">No rooms to show.</p>}

        <p className="text-xs text-charcoal/70 print:hidden">
          Booked times come from each child&apos;s regular schedule as it is today{selectedRoomName ? ` (${selectedRoomName} only)` : ""}.
          One-off changes for this week (an extra day, a known absence) aren&apos;t stored, so the Notes and changes column is left for
          staff to write in. A standing note from the child&apos;s schedule is printed there when one is set. Children whose times are
          to be confirmed show “TBC” and aren&apos;t counted in the booked totals.
        </p>
      </div>
    </div>
  );
}

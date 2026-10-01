import Link from "next/link";
import { getAttendanceRoll } from "@/lib/data/attendance-roll";
import { AttendanceRollTable } from "@/components/attendance-roll/attendance-roll-table";
import { PrintButton } from "@/components/audit-pack/print-button";
import { DownloadJpegButton } from "@/components/attendance-roll/download-jpeg-button";
import { formatShortDate, mondayOf, addDays } from "@/lib/utils";

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
  searchParams: { week?: string };
}) {
  const requested = searchParams.week ? new Date(`${searchParams.week}T00:00:00Z`) : null;
  const weekStartDate = requested && !Number.isNaN(requested.getTime()) ? mondayOf(requested) : defaultWeekStartDate();

  const rooms = await getAttendanceRoll();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 print:max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-3 print:hidden">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Attendance Roll</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Each room&apos;s regular booked days and times, straight from Children &amp; Fees — print it or download
            it as an image to share before the week starts.
          </p>
        </div>
        <Link href="/roster" className="btn-ghost">
          ← Staff roster
        </Link>
      </div>

      <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
        <PrintButton />
        <DownloadJpegButton targetId={CAPTURE_ID} fileName={`attendance-roll-${weekStartDate}.jpg`} />
      </div>

      <div id={CAPTURE_ID} className="flex flex-col gap-6 bg-white p-1">
        <div>
          <p className="font-display text-xl font-bold text-charcoal">Beach Kids — Attendance Roll</p>
          <p className="text-sm text-charcoal/60">Week starting {formatShortDate(weekStartDate)}</p>
        </div>

        {rooms.map((room) => (
          <AttendanceRollTable key={room.id} room={room} />
        ))}

        <p className="text-xs text-charcoal/40">
          Booked sessions shown reflect each child&apos;s regular enrolled schedule on file today — this updates
          automatically whenever a schedule changes. One-off changes for this specific week (an extra day, a
          confirmed absence) aren&apos;t tracked here yet, so check with each room for last-minute changes.
        </p>
      </div>
    </div>
  );
}

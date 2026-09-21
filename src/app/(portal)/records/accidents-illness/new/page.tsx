import Link from "next/link";
import { getChildrenList } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { getStaffList } from "@/lib/data/staff";
import { NewRecordPageClient } from "@/components/accident-illness/new-record-page-client";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function NewAccidentIllnessRecordPage() {
  const [allChildren, rooms, staff] = await Promise.all([
    // Both active and left children, and current and former staff — an old
    // paper form might well name someone who's since moved on, and they
    // still need to be findable and selectable here.
    getChildrenList(),
    getRosterRooms(),
    getStaffList(),
  ]);

  return (
    <div className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/records/accidents-illness" className="hover:text-charcoal">
          Accident &amp; Illness Records
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">New record</span>
      </nav>

      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">New Accident &amp; Illness record</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Upload a photo of a completed, signed form below — or several at once for a stack of different incidents —
          and check what comes back, or fill one in by hand.
        </p>
      </div>

      <NewRecordPageClient allChildren={allChildren} rooms={rooms} staff={staff} />
    </div>
  );
}

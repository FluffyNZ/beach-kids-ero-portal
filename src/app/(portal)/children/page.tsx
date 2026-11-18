import Link from "next/link";
import { getChildrenList, getBillPayerOptions } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { PageHeader } from "@/components/ui/page-header";
import { NewChildButton } from "@/components/children/new-child-button";
import { ChildrenDirectory, type DirectoryChild } from "@/components/children/children-directory";
import { childAgeInfo, enrolmentStatus } from "@/lib/child-format";
import { nzTodayDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ChildrenPage({
  searchParams,
}: {
  searchParams: { q?: string; status?: string; room?: string; view?: string };
}) {
  // Everyone is loaded once (active and former) and filtered in the
  // browser, so search, room and Active/Former switch instantly and the
  // counts always match. The filters still live in the URL, so a filtered
  // view can be bookmarked or shared.
  const [children, rooms, billPayerOptions] = await Promise.all([
    getChildrenList(),
    getRosterRooms(),
    getBillPayerOptions(),
  ]);

  const today = nzTodayDateString();
  const directory: DirectoryChild[] = children.map((c) => {
    const age = childAgeInfo(c, today);
    return {
      id: c.id,
      fullName: c.full_name,
      photoUrl: c.photo_url,
      roomId: c.room_id,
      roomName: c.room_name,
      roomColor: c.room_color,
      status: c.status,
      ageShort: age.short,
      ageEstimated: age.estimated,
      enrolment: enrolmentStatus(c, today),
      billPayerName: c.bill_payer_name,
      funding: [
        c.has_winz_subsidy ? "WINZ subsidy" : null,
        c.sibling_discount_eligible ? "Sibling discount" : null,
        c.special_weekly_override !== null ? "Special rate" : null,
      ].filter((x): x is string => Boolean(x)),
    };
  });

  // "status=all" was the old "Show no longer attending" switch — it now
  // opens the Former list.
  const initialStatus = searchParams.status === "former" || searchParams.status === "all" ? "former" : "active";

  return (
    <div className="mx-auto flex w-full max-w-6xl flex-col gap-6">
      <PageHeader
        title="Children"
        description="Find a child's profile, whānau contacts and booked sessions."
        actions={
          <>
            <Link href="/children/contacts" className="btn-secondary hidden sm:inline-flex">
              Contact numbers
            </Link>
            <Link href="/children/sunblock" className="btn-secondary hidden sm:inline-flex">
              Sunblock charts
            </Link>
            <NewChildButton rooms={rooms} billPayerOptions={billPayerOptions} />
          </>
        }
      />

      <nav aria-label="More children pages" className="-mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm sm:hidden">
        <Link href="/children/contacts" className="font-medium text-lilac-700 underline-offset-4 hover:underline">
          Contact numbers
        </Link>
        <Link href="/children/sunblock" className="font-medium text-lilac-700 underline-offset-4 hover:underline">
          Sunblock charts
        </Link>
      </nav>

      <ChildrenDirectory
        childList={directory}
        rooms={rooms.map((r) => ({ id: r.id, name: r.name, color: r.color }))}
        initial={{
          q: searchParams.q ?? "",
          room: searchParams.room ?? "",
          status: initialStatus,
          view: searchParams.view === "list" ? "list" : "grid",
        }}
      />

    </div>
  );
}

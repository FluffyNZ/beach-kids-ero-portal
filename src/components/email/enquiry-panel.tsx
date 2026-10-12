import Link from "next/link";
import type { FamilyEnquiry } from "@/lib/types";
import { formatShortDate } from "@/lib/utils";
import { EnquiryStatusActions } from "@/components/email/enquiry-status-actions";
import { PeopleIcon } from "@/components/icons";

/** Open ("enquiry" status) prospective families — see the "New enquiry"
 * button for how these get created, and migration 0050's comment on
 * family_enquiries for why these are kept fully separate from real
 * children. "Reply" starts a draft of the new_enquiry template addressed to
 * them; the two status actions just relabel the row (converted/dismissed)
 * and never touch the real children table. */
export function EnquiryPanel({ enquiries }: { enquiries: FamilyEnquiry[] }) {
  if (enquiries.length === 0) {
    return (
      <div className="card flex flex-col items-center gap-2 px-5 py-8 text-center">
        <PeopleIcon className="h-7 w-7 text-charcoal/20" />
        <p className="text-sm font-medium text-charcoal">No open enquiries</p>
        <p className="text-xs text-charcoal/45">New prospective families you add show up here until you reply, convert or dismiss them.</p>
      </div>
    );
  }

  return (
    <div className="card flex flex-col divide-y divide-charcoal/5 p-2">
      {enquiries.map((e) => (
        <div key={e.id} className="flex items-center justify-between gap-3 p-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-charcoal">
              {e.child_full_name} <span className="text-charcoal/40">·</span> {e.parent_full_name}
            </p>
            <p className="truncate text-xs text-charcoal/50">
              {e.parent_email}
              {e.intended_room_name ? ` · ${e.intended_room_name}` : ""}
              {e.intended_start_date ? ` · wants to start ${formatShortDate(e.intended_start_date)}` : ""}
            </p>
            <p className="text-xs text-charcoal/35">Added {formatShortDate(e.created_at.slice(0, 10))}</p>
          </div>
          <div className="flex shrink-0 items-start gap-2">
            <Link href={`/email/compose?template=new_enquiry&familyEnquiryId=${e.id}`} className="btn-secondary px-3 py-1.5 text-xs">
              Reply
            </Link>
            <EnquiryStatusActions enquiryId={e.id} />
          </div>
        </div>
      ))}
    </div>
  );
}

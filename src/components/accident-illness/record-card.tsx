import Link from "next/link";
import { ChildAvatar } from "@/components/children/child-avatar";
import { StatusBadge } from "@/components/status-badge";
import { formatShortDate, formatTime } from "@/lib/utils";
import type { AccidentIllnessRecord, ChildMember } from "@/lib/types";

export function RecordCard({ record, child }: { record: AccidentIllnessRecord; child?: ChildMember }) {
  const needsFollowUp = record.further_first_aid_required === true;

  return (
    <Link
      href={`/records/accidents-illness/${record.id}`}
      className="card flex items-center gap-3 p-4 transition-shadow hover:shadow-cardHover"
    >
      <ChildAvatar
        fullName={record.child_name}
        roomColor={child?.room_color ?? null}
        photoUrl={child?.photo_url ?? null}
        size="md"
      />
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <p className="truncate text-sm font-medium text-charcoal">{record.child_name}</p>
          {needsFollowUp && <StatusBadge tone="attention">Further first aid required</StatusBadge>}
          {!record.evidence_id && <StatusBadge tone="neutral">No signed photo yet</StatusBadge>}
        </div>
        <p className="mt-0.5 text-xs text-charcoal/50">
          {formatShortDate(record.incident_date)}
          {record.incident_time ? ` · ${formatTime(record.incident_time)}` : ""}
          {record.staff_name ? ` · ${record.staff_name}` : ""}
        </p>
        {record.description && <p className="mt-1 truncate text-xs text-charcoal/60">{record.description}</p>}
      </div>
    </Link>
  );
}

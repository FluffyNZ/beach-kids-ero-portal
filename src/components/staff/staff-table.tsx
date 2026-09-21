import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { StaffAvatar } from "./staff-avatar";
import { ChevronRightIcon } from "@/components/icons";
import { getDeadlineAlert } from "@/lib/evidence-deadline";
import {
  STAFF_STATUS_LABEL,
  STAFF_CONTRACT_TYPE_LABEL,
  STAFF_CONTRACT_TYPE_BADGE,
  STAFF_QUALIFICATION_STATUS_LABEL,
  staffQualificationTone,
} from "@/lib/constants";
import { formatDate, percentage } from "@/lib/utils";
import type { StaffMember } from "@/lib/types";

export function StaffTable({ staff }: { staff: StaffMember[] }) {
  if (staff.length === 0) {
    return (
      <div className="card p-10 text-center text-sm text-charcoal/50">
        No staff found. Try a different search, or add a staff member.
      </div>
    );
  }

  return (
    <div className="card divide-y divide-charcoal/5">
      {staff.map((s) => {
        const docAlert = getDeadlineAlert(null, s.nearest_document_expiry);
        const qualAlert = getDeadlineAlert(s.qualification.next_review_date, null);
        const checklistPercent = percentage(s.required_docs_completed, s.required_docs_total);
        return (
          <Link
            key={s.id}
            href={`/staff/${s.id}`}
            className="group flex items-center justify-between gap-4 px-5 py-3.5 transition-colors hover:bg-cream/60"
          >
            <StaffAvatar fullName={s.full_name} photoUrl={s.photo_url} />

            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <p className="truncate text-sm font-medium text-charcoal">{s.full_name}</p>
                {s.contract_type && (
                  <span
                    className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium ${STAFF_CONTRACT_TYPE_BADGE[s.contract_type]}`}
                  >
                    {STAFF_CONTRACT_TYPE_LABEL[s.contract_type]}
                  </span>
                )}
                {s.status === "former" && (
                  <span className="shrink-0 rounded-full bg-charcoal/5 px-2 py-0.5 text-[11px] font-medium text-charcoal/50">
                    {STAFF_STATUS_LABEL[s.status]}
                  </span>
                )}
              </div>
              <p className="mt-0.5 truncate text-xs text-charcoal/50">
                {s.role ?? "Role not set"} · {s.document_count} document{s.document_count === 1 ? "" : "s"}
                {s.start_date ? ` · started ${formatDate(s.start_date)}` : ""}
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-2">
              {s.required_docs_total > 0 && (
                <StatusBadge tone={checklistPercent === 100 ? "ready" : checklistPercent === 0 ? "action" : "attention"}>
                  Profile {checklistPercent}%
                </StatusBadge>
              )}
              {s.qualification.qualification_status !== "qualified" && (
                <StatusBadge tone={staffQualificationTone(s.qualification.qualification_status)}>
                  {STAFF_QUALIFICATION_STATUS_LABEL[s.qualification.qualification_status]}
                </StatusBadge>
              )}
              {docAlert && <StatusBadge tone={docAlert.tone}>Doc: {docAlert.label}</StatusBadge>}
              {qualAlert && <StatusBadge tone={qualAlert.tone}>Review: {qualAlert.label}</StatusBadge>}
              <ChevronRightIcon className="h-4 w-4 text-charcoal/20 transition-transform group-hover:translate-x-0.5 group-hover:text-charcoal/50" />
            </div>
          </Link>
        );
      })}
    </div>
  );
}

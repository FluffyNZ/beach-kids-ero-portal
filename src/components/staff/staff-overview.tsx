import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { RecordEditButton, RecordTabLink } from "@/components/ui/record-shell";
import { STAFF_CONTRACT_TYPE_LABEL } from "@/lib/constants";
import { formatHrs, type Tone } from "@/lib/staff-format";
import { formatDate, formatShortDate } from "@/lib/utils";
import type { StaffWithDetails } from "@/lib/types";

// Read-only Overview panels for a staff profile. Each value comes from the
// staff record; anything missing says "Not recorded".

function NotRecorded({ children = "Not recorded" }: { children?: React.ReactNode }) {
  return <span className="text-charcoal/70">{children}</span>;
}

function Row({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div className="grid grid-cols-[9rem_1fr] gap-3 px-5 py-2.5 sm:grid-cols-[11rem_1fr]">
      <dt className="text-sm text-charcoal/70">
        {label}
        {hint && <span className="block text-xs text-charcoal/60">{hint}</span>}
      </dt>
      <dd className="min-w-0 break-words text-sm text-charcoal">{children}</dd>
    </div>
  );
}

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

/** Employment and hours: contracted (the agreed minimum), rostered (from
 * this week's roster) and actual hours worked (not recorded in Earlydesk)
 * are shown as three separate things. */
export function StaffEmploymentPanel({
  staff,
  rosteredHours,
  rosterWeekStart,
  editable = true,
}: {
  staff: StaffWithDetails;
  /** null when this week's roster hasn't been entered. */
  rosteredHours: number | null;
  rosterWeekStart: string;
  editable?: boolean;
}) {
  return (
    <Panel
      id="panel-employment"
      title="Employment and hours"
      headerAction={editable ? <RecordEditButton variant="link">Edit</RecordEditButton> : <RecordTabLink tab="employment">View details</RecordTabLink>}
    >
      <dl className="divide-y divide-charcoal/10 border-t border-charcoal/10 pb-1">
        <Row label="Role">{staff.role ?? <NotRecorded />}</Row>
        <Row label="Room">{staff.room_name ?? <NotRecorded>{staff.is_relief ? "Relief (no fixed room)" : "No room"}</NotRecorded>}</Row>
        <Row label="Employment type">
          {staff.contract_type ? STAFF_CONTRACT_TYPE_LABEL[staff.contract_type] : <NotRecorded />}
          {staff.is_relief && staff.contract_type !== "relief" && <span className="text-charcoal/70"> · relief</span>}
        </Row>
        <Row label="Started">{staff.start_date ? formatDate(staff.start_date) : <NotRecorded />}</Row>
        {staff.end_date && <Row label="End date">{formatDate(staff.end_date)}</Row>}
        <Row label="Contracted hours" hint="Agreed minimum">
          {staff.min_hours !== null ? `${formatHrs(staff.min_hours)} a week` : <NotRecorded />}
        </Row>
        <Row label="Rostered hours" hint={`Week of ${formatShortDate(rosterWeekStart)}`}>
          {rosteredHours === null ? (
            <NotRecorded>Roster not entered for this week</NotRecorded>
          ) : rosteredHours === 0 ? (
            "No shifts this week"
          ) : (
            <>
              {formatHrs(rosteredHours)} <span className="text-charcoal/70">(shift start to finish)</span>
            </>
          )}
          <Link
            href={`/roster?week=${rosterWeekStart}`}
            className="mt-0.5 block text-sm font-medium text-lilac-700 underline-offset-4 hover:underline"
          >
            Open roster
          </Link>
        </Row>
        <Row label="Actual hours worked">
          <NotRecorded>Not recorded in Earlydesk</NotRecorded>
        </Row>
      </dl>
    </Panel>
  );
}

export function StaffContactPanel({ staff }: { staff: StaffWithDetails }) {
  const ecParts = [staff.emergency_contact_name, staff.emergency_contact_relationship].filter(Boolean).join(" · ");
  return (
    <Panel id="panel-contact" title="Contact and emergency contact" headerAction={<RecordEditButton variant="link">Edit</RecordEditButton>}>
      <dl className="divide-y divide-charcoal/10 border-t border-charcoal/10 pb-1">
        <Row label="Email">
          {staff.email ? (
            <a href={`mailto:${staff.email}`} className="break-all font-medium text-lilac-700 underline-offset-4 hover:underline">
              {staff.email}
            </a>
          ) : (
            <NotRecorded />
          )}
        </Row>
        <Row label="Mobile">
          {staff.mobile_phone ? (
            <a href={telHref(staff.mobile_phone)} className="font-medium tabular-nums text-lilac-700 underline-offset-4 hover:underline">
              {staff.mobile_phone}
            </a>
          ) : (
            <NotRecorded />
          )}
        </Row>
        <Row label="Date of birth">{staff.date_of_birth ? formatDate(staff.date_of_birth) : <NotRecorded />}</Row>
        <Row label="Emergency contact">
          {staff.emergency_contact_name || staff.emergency_contact_phone ? (
            <>
              {ecParts || <NotRecorded>Name not recorded</NotRecorded>}
              {staff.emergency_contact_phone ? (
                <a
                  href={telHref(staff.emergency_contact_phone)}
                  className="block font-medium tabular-nums text-lilac-700 underline-offset-4 hover:underline"
                >
                  {staff.emergency_contact_phone}
                </a>
              ) : (
                <span className="block text-charcoal/70">Phone not recorded</span>
              )}
            </>
          ) : (
            <NotRecorded />
          )}
        </Row>
        {staff.notes && (
          <Row label="General notes">
            <span className="whitespace-pre-line">{staff.notes}</span>
          </Row>
        )}
      </dl>
    </Panel>
  );
}

export type RenewalItem = { label: string; when: string; tone: Tone };

export function StaffRenewalsPanel({ items }: { items: RenewalItem[] }) {
  return (
    <Panel
      id="panel-renewals"
      title="Upcoming renewals"
      description="Expired or due within 90 days"
      headerAction={<RecordTabLink tab="documents">View documents</RecordTabLink>}
    >
      {items.length === 0 ? (
        <p className="border-t border-charcoal/10 px-5 py-4 text-sm text-charcoal/70">Nothing due for renewal in the next 90 days.</p>
      ) : (
        <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
          {items.map((item, i) => (
            <li key={i} className="flex flex-wrap items-center justify-between gap-2 px-5 py-2.5 text-sm">
              <span className="text-charcoal">{item.label}</span>
              <StatusPill tone={item.tone}>{item.when}</StatusPill>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}

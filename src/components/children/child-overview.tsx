import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { EditProfileButton, TabLink } from "./child-profile-shell";
import { formatDate, formatTime } from "@/lib/utils";
import { EMAIL_MESSAGE_STATUS_LABEL, getRoomColorClasses } from "@/lib/constants";
import {
  formatHours,
  formatNzDate,
  formatNzDateTime,
  scheduleSummary,
  type ChildAgeInfo,
  type EnrolmentStatus,
} from "@/lib/child-format";
import type { AccidentIllnessRecord, ChildWithDetails, EmailMessage } from "@/lib/types";
import type { ChildContactsResult } from "@/lib/data/child-profile";
import type { ManagedChildContact } from "@/lib/data/contact-directory";

// The profile's Overview tab: a read-only summary in five panels. Every
// value comes from this child's records; anything not recorded says
// "Not recorded" (rather than being left blank or shown as "none").

function NotRecorded({ children = "Not recorded" }: { children?: React.ReactNode }) {
  return <span className="text-charcoal/70">{children}</span>;
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[8.5rem_1fr] gap-3 px-5 py-2.5 sm:grid-cols-[10rem_1fr]">
      <dt className="text-sm text-charcoal/70">{label}</dt>
      <dd className="min-w-0 break-words text-sm text-charcoal">{children}</dd>
    </div>
  );
}

function telHref(phone: string) {
  return `tel:${phone.replace(/[^\d+]/g, "")}`;
}

function ContactTags({ c }: { c: ManagedChildContact }) {
  const tags = [
    c.is_primary_caregiver ? "Primary caregiver" : null,
    c.is_emergency_contact ? "Emergency contact" : null,
    c.can_pick_up ? "Can pick up" : null,
    c.conditional_access ? "Conditional access" : null,
  ].filter(Boolean);
  if (tags.length === 0) return null;
  return <p className="text-xs text-charcoal/70">{tags.join(" · ")}</p>;
}

/** Important things to know about this child, shown above the panels. */
export function ChildAlerts({
  child,
  contacts,
}: {
  child: ChildWithDetails;
  contacts: ChildContactsResult;
}) {
  const forbidden = contacts.ok ? contacts.child.contacts.filter((c) => c.forbidden_access) : [];
  const firstName = child.full_name.trim().split(/\s+/)[0];
  if (forbidden.length === 0) return null;
  return (
    <section
      aria-label="Important"
      className="flex flex-col gap-2 rounded-2xl border-2 border-status-action bg-status-actionBg px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
    >
      <div className="flex gap-3">
        <span aria-hidden="true" className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-status-action text-sm font-bold text-white">
          !
        </span>
        <div>
          <p className="font-semibold text-charcoal">
            Forbidden access — {forbidden.length === 1 ? "this person" : "these people"} must not collect {firstName}
          </p>
          <ul className="mt-1 text-sm text-charcoal">
            {forbidden.map((c) => (
              <li key={c.id}>
                <span className="font-medium">{c.full_name}</span>
                {c.relationship && <> · {c.relationship}</>}
                {c.notes && <span className="text-charcoal/80"> — {c.notes}</span>}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <TabLink tab="contacts" className="self-start sm:self-center">
        View contacts
      </TabLink>
    </section>
  );
}

export function ChildOverview({
  child,
  age,
  enrolment,
  contacts,
  accidents,
  emails,
}: {
  child: ChildWithDetails;
  age: ChildAgeInfo;
  enrolment: EnrolmentStatus;
  contacts: ChildContactsResult;
  accidents: AccidentIllnessRecord[];
  emails: EmailMessage[];
}) {
  const schedule = scheduleSummary(child.enrolled_schedule);
  const roomColors = getRoomColorClasses(child.room_color);
  const contactList = contacts.ok ? contacts.child.contacts.filter((c) => !c.forbidden_access) : [];
  const shownContacts = contactList.slice(0, 4);
  const unsignedAccidents = accidents.filter((a) => !a.parent_signed).length;
  const latestAccident = accidents[0];

  return (
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      {/* Child details */}
      <Panel
        id="panel-details"
        title="Child details"
        headerAction={<EditProfileButton variant="link">Edit</EditProfileButton>}
      >
        <dl className="divide-y divide-charcoal/10 border-t border-charcoal/10 pb-1">
          <Row label="Date of birth">{child.date_of_birth ? formatDate(child.date_of_birth) : <NotRecorded />}</Row>
          <Row label="Age">
            {age.text}
            {age.estimated && (
              <span className="mt-1 block text-xs text-charcoal/70">{age.detail}</span>
            )}
          </Row>
          <Row label="Room">
            {child.room_name ? (
              <span className="inline-flex items-center gap-2">
                <span aria-hidden="true" className={`h-2 w-2 rounded-full ${roomColors.chip}`} />
                {child.room_name}
              </span>
            ) : (
              <NotRecorded>No room</NotRecorded>
            )}
            {child.room_notes && <span className="mt-0.5 block text-xs text-charcoal/70">{child.room_notes}</span>}
          </Row>
          <Row label="Enrolment">
            <StatusPill tone={enrolment.tone}>{enrolment.label}</StatusPill>
          </Row>
          <Row label="Start date">{child.start_date ? formatDate(child.start_date) : <NotRecorded />}</Row>
          {child.leaving_date && <Row label="Leaving date">{formatDate(child.leaving_date)}</Row>}
          <Row label="Gender">{child.gender ?? <NotRecorded />}</Row>
          <Row label="Home address">{child.residential_address ?? <NotRecorded />}</Row>
          <Row label="Bill payer">
            {child.bill_payer_name ?? <NotRecorded>Not set</NotRecorded>}
            {child.bill_payer_unlisted_note && (
              <span className="mt-0.5 block text-xs text-charcoal/70">{child.bill_payer_unlisted_note}</span>
            )}
          </Row>
        </dl>
      </Panel>

      {/* Whānau and contacts */}
      <Panel
        id="panel-contacts"
        title="Whānau and contacts"
        count={contacts.ok ? contacts.child.contacts.length : undefined}
        headerAction={<TabLink tab="contacts">{contactList.length > shownContacts.length ? "View all" : "View details"}</TabLink>}
      >
        {!contacts.ok ? (
          <p className="border-t border-charcoal/10 px-5 py-4 text-sm text-charcoal">{contacts.error}</p>
        ) : contacts.child.contacts.length === 0 ? (
          <p className="border-t border-charcoal/10 px-5 py-4 text-sm text-charcoal/70">
            No contacts recorded yet. Add who can pick up and who to call in an emergency on the Contacts tab.
          </p>
        ) : (
          <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
            {shownContacts.map((c) => (
              <li key={c.id} className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1 px-5 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-charcoal">
                    {c.full_name}
                    {c.relationship && <span className="font-normal text-charcoal/70"> · {c.relationship}</span>}
                  </p>
                  <ContactTags c={c} />
                </div>
                <div className="flex flex-col items-start gap-0.5 sm:items-end">
                  {[c.phone, c.alt_phone].filter((p): p is string => Boolean(p)).map((p) => (
                    <a
                      key={p}
                      href={telHref(p)}
                      className="rounded text-sm font-medium tabular-nums text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
                    >
                      {p}
                    </a>
                  ))}
                  {!c.phone && !c.alt_phone && <span className="text-sm text-charcoal/70">No number recorded</span>}
                </div>
              </li>
            ))}
            {contactList.length > shownContacts.length && (
              <li className="px-5 py-2.5 text-sm text-charcoal/70">
                +{contactList.length - shownContacts.length} more on the Contacts tab
              </li>
            )}
          </ul>
        )}
        <dl className="divide-y divide-charcoal/10 border-t border-charcoal/10">
          <Row label="Primary email">
            {child.primary_contact_email ? (
              <a href={`mailto:${child.primary_contact_email}`} className="break-all font-medium text-lilac-700 underline-offset-4 hover:underline">
                {child.primary_contact_email}
              </a>
            ) : child.bill_payer?.email ? (
              <span>
                {child.bill_payer.email} <span className="text-charcoal/70">(bill payer)</span>
              </span>
            ) : (
              <NotRecorded />
            )}
          </Row>
          {child.siblings.length > 0 && (
            <Row label="Siblings here">
              {child.siblings.map((s, i) => (
                <span key={s.id}>
                  {i > 0 && ", "}
                  <Link href={`/children/${s.id}`} className="font-medium text-lilac-700 underline-offset-4 hover:underline">
                    {s.full_name}
                  </Link>
                </span>
              ))}
            </Row>
          )}
        </dl>
      </Panel>

      {/* Booked sessions */}
      <Panel
        id="panel-sessions"
        title="Booked sessions"
        description={
          child.enrolled_schedule
            ? `${formatHours(schedule.totalHours)} a week across ${schedule.bookedDays} ${schedule.bookedDays === 1 ? "day" : "days"}`
            : undefined
        }
        headerAction={<TabLink tab="bookings">Edit</TabLink>}
      >
        {!child.enrolled_schedule ? (
          <p className="border-t border-charcoal/10 px-5 py-4 text-sm text-charcoal/70">No booked sessions recorded.</p>
        ) : (
          <div className="border-t border-charcoal/10 px-5 py-4">
            {child.enrolled_schedule.tbc && (
              <div className="mb-3">
                <StatusPill tone="attention">Times to be confirmed</StatusPill>
                <p className="mt-1 text-xs text-charcoal/70">The booked sessions roll shows “TBC” and leaves this child out of totals.</p>
              </div>
            )}
            <ol className="grid grid-cols-5 gap-1.5">
              {schedule.days.map((d) => (
                <li
                  key={d.key}
                  className={`flex flex-col items-center rounded-xl px-1 py-2.5 text-center ${
                    d.hours > 0 ? "bg-lilac-100" : "border border-dashed border-charcoal/15"
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide text-charcoal">
                    <abbr title={d.long} className="no-underline">
                      {d.short}
                    </abbr>
                  </span>
                  {d.hours > 0 ? (
                    <>
                      <span className="mt-1 text-xs leading-tight text-charcoal">
                        {formatTime(d.start)}
                        <span className="sr-only"> to </span>
                        <span aria-hidden="true">–</span>
                        <br className="sm:hidden" />
                        {formatTime(d.end)}
                      </span>
                      <span className="mt-0.5 text-[0.6875rem] text-charcoal/70">{formatHours(d.hours)}</span>
                    </>
                  ) : (
                    <span className="mt-1 text-xs text-charcoal/70">Not booked</span>
                  )}
                </li>
              ))}
            </ol>
            {child.enrolled_schedule.updated_at && (
              <p className="mt-3 text-xs text-charcoal/70">Last updated {formatNzDate(child.enrolled_schedule.updated_at)}</p>
            )}
          </div>
        )}
      </Panel>

      {/* Health and permissions */}
      <Panel id="panel-health" title="Health and permissions" headerAction={<TabLink tab="health">View details</TabLink>}>
        <dl className="divide-y divide-charcoal/10 border-t border-charcoal/10 pb-1">
          <Row label="Photo permission">
            {child.marketing_photo_consent === true ? (
              <StatusPill tone="ready">OK to use in marketing</StatusPill>
            ) : child.marketing_photo_consent === false ? (
              <StatusPill tone="action">Not OK to use</StatusPill>
            ) : (
              <StatusPill tone="neutral">Not yet confirmed</StatusPill>
            )}
            {child.marketing_photo_consent_notes && (
              <span className="mt-1 block text-xs text-charcoal/70">{child.marketing_photo_consent_notes}</span>
            )}
          </Row>
          <Row label="Sunblock">
            {child.uses_own_sunblock ? "Uses own or special sunblock" : "Centre sunblock"}
            {child.sunblock_instructions && (
              <span className="mt-0.5 block whitespace-pre-line text-xs text-charcoal/70">{child.sunblock_instructions}</span>
            )}
          </Row>
          <Row label="Accidents & illness">
            {accidents.length === 0 ? (
              "No records"
            ) : (
              <>
                {accidents.length} {accidents.length === 1 ? "record" : "records"}
                {latestAccident && <span className="text-charcoal/70"> · latest {formatDate(latestAccident.incident_date)}</span>}
                {unsignedAccidents > 0 && (
                  <span className="mt-1 block">
                    <StatusPill tone="attention">
                      {unsignedAccidents} not signed by parent
                    </StatusPill>
                  </span>
                )}
              </>
            )}
          </Row>
          <Row label="Allergies & medical">
            <NotRecorded>No place to record these in Earlydesk yet — check notes and paper records.</NotRecorded>
          </Row>
        </dl>
      </Panel>

      {/* Recent activity */}
      <Panel
        id="panel-activity"
        title="Notes and recent emails"
        headerAction={<TabLink tab="notes">View all</TabLink>}
        className="lg:col-span-2"
      >
        <div className="grid grid-cols-1 border-t border-charcoal/10 md:grid-cols-2 md:divide-x md:divide-charcoal/10">
          <div className="px-5 py-4">
            <h3 className="text-sm font-semibold text-charcoal">Notes</h3>
            {child.notes ? (
              <p className="mt-1 whitespace-pre-line break-words text-sm text-charcoal">{child.notes}</p>
            ) : (
              <p className="mt-1 text-sm text-charcoal/70">No notes recorded.</p>
            )}
          </div>
          <div className="border-t border-charcoal/10 px-5 py-4 md:border-t-0">
            <h3 className="text-sm font-semibold text-charcoal">Recent emails</h3>
            {emails.length === 0 ? (
              <p className="mt-1 text-sm text-charcoal/70">No emails sent or drafted for this child yet.</p>
            ) : (
              <ul className="mt-1 divide-y divide-charcoal/10">
                {emails.slice(0, 3).map((e) => (
                  <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 py-2">
                    <Link
                      href={`/email/compose?draftId=${e.id}`}
                      className="min-w-0 break-words text-sm font-medium text-charcoal underline-offset-4 hover:underline"
                    >
                      {e.subject || "(No subject)"}
                    </Link>
                    <span className="text-xs text-charcoal/70">
                      {EMAIL_MESSAGE_STATUS_LABEL[e.status]} · {formatNzDateTime(e.sent_at ?? e.created_at)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </Panel>
    </div>
  );
}

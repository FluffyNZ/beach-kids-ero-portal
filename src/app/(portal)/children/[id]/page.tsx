import Link from "next/link";
import { notFound } from "next/navigation";
import { getChildById, getBillPayerOptions } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { getAccidentIllnessRecordsForChild } from "@/lib/data/accident-illness";
import { getInvoicesForChild } from "@/lib/data/invoices";
import { getEmailHistoryForChild } from "@/lib/data/email";
import { getContactsForChild } from "@/lib/data/child-profile";
import {
  updateChildDetails,
  updateChildFeeSettings,
  updateChildWinzSubsidy,
  updateChildEnrolledSchedule,
  setChildScheduleTbc,
} from "@/lib/actions/children";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import { ChildAvatar } from "@/components/children/child-avatar";
import { ChildProfileShell, ProfileTabs, EditProfileButton } from "@/components/children/child-profile-shell";
import { ChildEditDrawer } from "@/components/children/child-edit-drawer";
import { ChildActionsMenu } from "@/components/children/child-actions-menu";
import { ChildOverview, ChildAlerts } from "@/components/children/child-overview";
import { ChildContactsEditor } from "@/components/children/child-contacts-manager";
import { ChildEnrolledScheduleForm } from "@/components/children/child-enrolled-schedule-form";
import { ChildHealthPanel } from "@/components/children/child-health-panel";
import { ChildFeeSettingsForm } from "@/components/children/child-fee-settings-form";
import { ChildWinzForm } from "@/components/children/child-winz-form";
import { ChildInvoicesPanel } from "@/components/children/child-invoices-panel";
import { ChildEmailsPanel } from "@/components/children/child-emails-panel";
import { ChevronRightIcon, EditIcon, MailIcon } from "@/components/icons";
import { childAgeInfo, enrolmentStatus } from "@/lib/child-format";
import { nzTodayDateString } from "@/lib/utils";

export const dynamic = "force-dynamic";

const TAB_KEYS = ["overview", "contacts", "bookings", "health", "invoices", "notes"];

export default async function ChildDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { tab?: string };
}) {
  const [child, rooms, billPayerOptions] = await Promise.all([
    getChildById(params.id),
    getRosterRooms(),
    getBillPayerOptions(),
  ]);
  if (!child) notFound();

  const [accidents, invoices, emails, contacts] = await Promise.all([
    getAccidentIllnessRecordsForChild(child.id),
    getInvoicesForChild(child.id),
    getEmailHistoryForChild(child.id),
    getContactsForChild(child.id, child.full_name),
  ]);

  const today = nzTodayDateString();
  const age = childAgeInfo(child, today);
  const enrolment = enrolmentStatus(child, today);
  const emailHref = `/email?childId=${child.id}`;

  const tabs = [
    {
      key: "overview",
      label: "Overview",
      content: (
        <div className="flex flex-col gap-5">
          <ChildAlerts child={child} contacts={contacts} />
          <ChildOverview
            child={child}
            age={age}
            enrolment={enrolment}
            contacts={contacts}
            accidents={accidents}
            emails={emails}
          />
        </div>
      ),
    },
    {
      key: "contacts",
      label: "Contacts",
      count: contacts.ok ? contacts.child.contacts.length : undefined,
      content: (
        <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
          <Panel
            id="contacts-list"
            title="Contacts"
            description="Who can pick up, who to call in an emergency, and anyone who must not have access. Shared with the Contact numbers page and the staff-room tablet."
            bodyClassName="border-t border-charcoal/10 px-5 py-4"
          >
            {contacts.ok ? (
              <ChildContactsEditor child={contacts.child} />
            ) : (
              <p className="text-sm text-charcoal">{contacts.error}</p>
            )}
          </Panel>
          <div className="flex flex-col gap-5">
            <Panel
              id="contacts-bill-payer"
              title="Bill payer"
              headerAction={<EditProfileButton variant="link">Edit</EditProfileButton>}
              bodyClassName="border-t border-charcoal/10 px-5 py-4 text-sm"
            >
              {child.bill_payer ? (
                <div className="flex flex-col gap-1 text-charcoal">
                  <p className="font-medium">{child.bill_payer.full_name}</p>
                  <p>{child.bill_payer.phone ?? <span className="text-charcoal/70">No phone recorded</span>}</p>
                  <p className="break-all">{child.bill_payer.email ?? <span className="text-charcoal/70">No email recorded</span>}</p>
                  {child.bill_payer.address && <p>{child.bill_payer.address}</p>}
                  {child.bill_payer.notes && <p className="text-charcoal/70">{child.bill_payer.notes}</p>}
                </div>
              ) : (
                <p className="text-charcoal/70">
                  No bill payer set{child.bill_payer_unlisted_note ? ` — ${child.bill_payer_unlisted_note}` : "."}
                </p>
              )}
            </Panel>
            <Panel id="contacts-family" title="Family" bodyClassName="border-t border-charcoal/10 px-5 py-4 text-sm">
              <p className="text-charcoal/70">Primary contact email</p>
              <p className="break-all text-charcoal">
                {child.primary_contact_email ?? <span className="text-charcoal/70">Not recorded</span>}
              </p>
              <p className="mt-3 text-charcoal/70">Siblings enrolled</p>
              {child.siblings.length === 0 ? (
                <p className="text-charcoal">None billed to the same bill payer</p>
              ) : (
                <ul className="mt-1 flex flex-wrap gap-2">
                  {child.siblings.map((s) => (
                    <li key={s.id}>
                      <Link
                        href={`/children/${s.id}`}
                        className="inline-flex rounded-full bg-lilac-100 px-3 py-1 text-sm font-medium text-charcoal hover:bg-lilac-200"
                      >
                        {s.full_name}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </Panel>
          </div>
        </div>
      ),
    },
    {
      key: "bookings",
      label: "Bookings",
      content: (
        <Panel
          id="bookings"
          title="Booked sessions"
          description="Usual days and times, Monday to Friday. These feed the booked sessions roll, ratios and fee estimates."
          bodyClassName="border-t border-charcoal/10 px-5 py-5"
          className="max-w-3xl"
        >
          <ChildEnrolledScheduleForm
            schedule={child.enrolled_schedule}
            onSave={updateChildEnrolledSchedule.bind(null, child.id)}
            onToggleTbc={setChildScheduleTbc.bind(null, child.id)}
          />
        </Panel>
      ),
    },
    {
      key: "health",
      label: "Health",
      count: accidents.length,
      content: (
        <ChildHealthPanel
          records={accidents}
          childId={child.id}
          usesOwnSunblock={child.uses_own_sunblock}
          sunblockInstructions={child.sunblock_instructions}
          marketingPhotoConsent={child.marketing_photo_consent}
          marketingPhotoConsentNotes={child.marketing_photo_consent_notes}
        />
      ),
    },
    {
      key: "invoices",
      label: "Invoices",
      count: invoices.length,
      content: (
        <div className="flex flex-col gap-5">
          <p className="text-sm text-charcoal/70">
            Fees are calculated and invoiced in Finance — these settings feed that, nothing is worked out separately
            here.{" "}
            <Link href="/finances/fees" className="font-medium text-lilac-700 underline-offset-4 hover:underline">
              Open Finance → Fees
            </Link>
          </p>
          <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
            <Panel id="fee-settings" title="Fee settings" bodyClassName="border-t border-charcoal/10 px-5 py-5">
              <ChildFeeSettingsForm
                hourlyRate={child.hourly_rate}
                ageYears={child.age_years}
                specialWeeklyOverride={child.special_weekly_override}
                siblingDiscountEligible={child.sibling_discount_eligible}
                onSave={updateChildFeeSettings.bind(null, child.id)}
              />
            </Panel>
            <Panel id="winz" title="WINZ Childcare Subsidy" bodyClassName="border-t border-charcoal/10 px-5 py-5">
              <ChildWinzForm subsidy={child.winz_subsidy} onSave={updateChildWinzSubsidy.bind(null, child.id)} />
            </Panel>
          </div>
          <section aria-labelledby="invoice-history-heading" className="flex flex-col gap-3">
            <h2 id="invoice-history-heading" className="text-base font-semibold text-charcoal">
              Invoice history
            </h2>
            <ChildInvoicesPanel invoices={invoices} />
          </section>
        </div>
      ),
    },
    {
      key: "notes",
      label: "Notes",
      count: emails.length,
      content: <ChildEmailsPanel childId={child.id} notes={child.notes} history={emails} />,
    },
  ];

  return (
    <ChildProfileShell initialTab={searchParams.tab ?? "overview"} tabKeys={TAB_KEYS}>
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
        <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/70">
          <Link href="/children" className="rounded hover:text-charcoal hover:underline">
            Children
          </Link>
          <ChevronRightIcon className="h-3.5 w-3.5" />
          <span aria-current="page" className="font-medium text-charcoal">
            {child.full_name}
          </span>
        </nav>

        <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-center gap-4">
            <ChildAvatar fullName={child.full_name} roomColor={child.room_color} photoUrl={child.photo_url} size="xl" decorative />
            <div className="min-w-0">
              <h1 className="break-words text-2xl font-semibold tracking-tight text-charcoal md:text-[1.75rem]">
                {child.full_name}
              </h1>
              <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-charcoal/70">
                <span title={age.detail ?? undefined}>
                  {age.text}
                  {age.estimated && <span className="sr-only"> (estimated)</span>}
                </span>
                <span aria-hidden="true">·</span>
                <span>{child.room_name ?? "No room"}</span>
                <span aria-hidden="true">·</span>
                <StatusPill tone={enrolment.tone}>{enrolment.label}</StatusPill>
              </p>
              {age.estimated && <p className="mt-1 text-xs text-charcoal/70">Age estimated — no date of birth recorded</p>}
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <EditProfileButton>
              <EditIcon className="h-4 w-4" />
              Edit profile
            </EditProfileButton>
            <Link href={emailHref} className="btn-secondary">
              <MailIcon className="h-4 w-4" />
              Email whānau
            </Link>
            <ChildActionsMenu childId={child.id} fullName={child.full_name} status={child.status} />
          </div>
        </header>

        <ProfileTabs tabs={tabs} />
      </div>

      <ChildEditDrawer
        childId={child.id}
        childName={child.full_name}
        roomColor={child.room_color}
        photoUrl={child.photo_url}
        rooms={rooms}
        billPayerOptions={billPayerOptions}
        onSave={updateChildDetails.bind(null, child.id)}
        values={{
          fullName: child.full_name,
          gender: child.gender,
          ageYears: child.age_years,
          ageMonths: child.age_months,
          dateOfBirth: child.date_of_birth,
          residentialAddress: child.residential_address,
          primaryContactEmail: child.primary_contact_email,
          roomId: child.room_id,
          roomNotes: child.room_notes,
          billPayerName: child.bill_payer_name,
          billPayerUnlistedNote: child.bill_payer_unlisted_note,
          notes: child.notes,
          startDate: child.start_date,
          leavingDate: child.leaving_date,
        }}
      />
    </ChildProfileShell>
  );
}

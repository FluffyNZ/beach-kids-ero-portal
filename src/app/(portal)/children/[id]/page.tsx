import Link from "next/link";
import { notFound } from "next/navigation";
import { getChildById, getBillPayerOptions } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { getPublishedStoriesForChild } from "@/lib/data/learning-stories";
import { getAccidentIllnessRecordsForChild } from "@/lib/data/accident-illness";
import { getInvoicesForChild } from "@/lib/data/invoices";
import { getEmailHistoryForChild } from "@/lib/data/email";
import { ChildLearningStoriesPanel } from "@/components/learning-stories/child-learning-stories-panel";
import {
  updateChildDetails,
  updateChildFeeSettings,
  updateChildWinzSubsidy,
  updateChildEnrolledSchedule,
  setChildScheduleTbc,
  setChildStatus,
} from "@/lib/actions/children";
import { ChildDetailsForm } from "@/components/children/child-details-form";
import { ChildFeeSettingsForm } from "@/components/children/child-fee-settings-form";
import { ChildEnrolledScheduleForm } from "@/components/children/child-enrolled-schedule-form";
import { ChildWinzForm } from "@/components/children/child-winz-form";
import { ChildPhotoUpload } from "@/components/children/child-photo-upload";
import { ChildAvatar } from "@/components/children/child-avatar";
import { ChildWhanauPanel } from "@/components/children/child-whanau-panel";
import { ChildHealthPanel } from "@/components/children/child-health-panel";
import { ChildInvoicesPanel } from "@/components/children/child-invoices-panel";
import { ChildEmailsPanel } from "@/components/children/child-emails-panel";
import { DeleteChildButton } from "@/components/children/delete-child-button";
import { StatusBadge } from "@/components/status-badge";
import { Tabs, type TabItem } from "@/components/ui/tabs";
import { ChevronRightIcon, MailIcon, HomeIcon, PeopleIcon, CalendarIcon, ShieldCheckIcon, CreditCardIcon } from "@/components/icons";
import { CHILD_STATUS_LABEL, childStatusTone, formatChildAge, getRoomColorClasses } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function ChildDetailPage({ params }: { params: { id: string } }) {
  const [child, rooms, billPayerOptions] = await Promise.all([
    getChildById(params.id),
    getRosterRooms(),
    getBillPayerOptions(),
  ]);
  if (!child) notFound();

  const [learningStories, accidentIllnessRecords, invoicesForChild, emailHistory] = await Promise.all([
    getPublishedStoriesForChild(child.id),
    getAccidentIllnessRecordsForChild(child.id),
    getInvoicesForChild(child.id),
    getEmailHistoryForChild(child.id),
  ]);

  const roomColors = getRoomColorClasses(child.room_color);

  const tabs: TabItem[] = [
    {
      key: "overview",
      label: "Overview",
      icon: <HomeIcon className="h-4 w-4" />,
      content: (
        <div className="flex flex-col gap-4">
          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Photo</h2>
            <ChildPhotoUpload
              childId={child.id}
              fullName={child.full_name}
              roomColor={child.room_color}
              photoUrl={child.photo_url}
            />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Child details</h2>
            <ChildDetailsForm
              fullName={child.full_name}
              gender={child.gender}
              ageYears={child.age_years}
              ageMonths={child.age_months}
              dateOfBirth={child.date_of_birth}
              residentialAddress={child.residential_address}
              primaryContactEmail={child.primary_contact_email}
              roomId={child.room_id}
              roomNotes={child.room_notes}
              rooms={rooms}
              billPayerName={child.bill_payer_name}
              billPayerUnlistedNote={child.bill_payer_unlisted_note}
              billPayerOptions={billPayerOptions}
              notes={child.notes}
              startDate={child.start_date}
              leavingDate={child.leaving_date}
              onSave={updateChildDetails.bind(null, child.id)}
            />
          </section>

          <section id="learning-stories" className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Learning Stories</h2>
            <ChildLearningStoriesPanel stories={learningStories} />
          </section>

          <section className="card border-status-action/20 p-5">
            <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-status-action">Danger zone</h2>
            <p className="mb-3 text-sm text-charcoal/60">Permanently remove this child&apos;s profile and fee settings.</p>
            <DeleteChildButton childId={child.id} fullName={child.full_name} />
          </section>
        </div>
      ),
    },
    {
      key: "whanau",
      label: "Whānau & contacts",
      icon: <PeopleIcon className="h-4 w-4" />,
      content: (
        <ChildWhanauPanel
          billPayer={child.bill_payer}
          primaryContactEmail={child.primary_contact_email}
          siblings={child.siblings}
        />
      ),
    },
    {
      key: "sessions",
      label: "Booked sessions",
      icon: <CalendarIcon className="h-4 w-4" />,
      content: (
        <section className="card p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Enrolled days &amp; times</h2>
          <ChildEnrolledScheduleForm
            schedule={child.enrolled_schedule}
            onSave={updateChildEnrolledSchedule.bind(null, child.id)}
            onToggleTbc={setChildScheduleTbc.bind(null, child.id)}
          />
        </section>
      ),
    },
    {
      key: "health",
      label: "Health & permissions",
      icon: <ShieldCheckIcon className="h-4 w-4" />,
      count: accidentIllnessRecords.length,
      content: (
        <ChildHealthPanel
          records={accidentIllnessRecords}
          childId={child.id}
          usesOwnSunblock={child.uses_own_sunblock}
          sunblockInstructions={child.sunblock_instructions}
        />
      ),
    },
    {
      key: "invoices",
      label: "Invoices",
      icon: <CreditCardIcon className="h-4 w-4" />,
      count: invoicesForChild.length,
      content: (
        <div className="flex flex-col gap-4">
          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Fee settings</h2>
            <ChildFeeSettingsForm
              hourlyRate={child.hourly_rate}
              ageYears={child.age_years}
              specialWeeklyOverride={child.special_weekly_override}
              siblingDiscountEligible={child.sibling_discount_eligible}
              onSave={updateChildFeeSettings.bind(null, child.id)}
            />
          </section>

          <section className="card p-5">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">WINZ Child Care Subsidy</h2>
            <ChildWinzForm subsidy={child.winz_subsidy} onSave={updateChildWinzSubsidy.bind(null, child.id)} />
          </section>

          <section>
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Invoice history</h2>
            <ChildInvoicesPanel invoices={invoicesForChild} />
          </section>
        </div>
      ),
    },
    {
      key: "emails",
      label: "Emails & notes",
      icon: <MailIcon className="h-4 w-4" />,
      count: emailHistory.length,
      content: <ChildEmailsPanel childId={child.id} history={emailHistory} />,
    },
  ];

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/children" className="hover:text-charcoal">
          Children
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">{child.full_name}</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <ChildAvatar fullName={child.full_name} roomColor={child.room_color} photoUrl={child.photo_url} size="lg" />
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">{child.full_name}</h1>
              <StatusBadge tone={childStatusTone(child.status)}>{CHILD_STATUS_LABEL[child.status]}</StatusBadge>
              {child.room_name && (
                <span className={`badge ${roomColors.bg} ${roomColors.text}`}>{child.room_name}</span>
              )}
            </div>
            <p className="mt-1 text-sm text-charcoal/60">
              {child.gender ? `${child.gender} · ` : ""}
              {formatChildAge(child.age_years, child.age_months)}
              {!child.age_is_exact && child.age_as_of ? ` as of ${formatDate(child.age_as_of)}` : ""}
              {" · "}
              {child.bill_payer_name ?? "No bill payer set"}
            </p>
            {child.residential_address && <p className="mt-0.5 text-sm text-charcoal/50">{child.residential_address}</p>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Link href={`/email?childId=${child.id}`} className="btn-secondary">
            <MailIcon className="h-4 w-4" />
            Email whānau
          </Link>
          <form action={setChildStatus.bind(null, child.id, child.status === "active" ? "left" : "active")}>
            <button type="submit" className="btn-ghost">
              {child.status === "active" ? "Mark as no longer attending" : "Mark as active"}
            </button>
          </form>
        </div>
      </div>

      <Tabs tabs={tabs} />
    </div>
  );
}

import Link from "next/link";
import { notFound } from "next/navigation";
import { getChildById, getBillPayerOptions } from "@/lib/data/children";
import { getRosterRooms } from "@/lib/data/roster";
import { getPublishedStoriesForChild } from "@/lib/data/learning-stories";
import { ChildLearningStoriesPanel } from "@/components/learning-stories/child-learning-stories-panel";
import {
  updateChildDetails,
  updateChildFeeSettings,
  updateChildWinzSubsidy,
  updateChildEnrolledSchedule,
  setChildStatus,
} from "@/lib/actions/children";
import { ChildDetailsForm } from "@/components/children/child-details-form";
import { ChildFeeSettingsForm } from "@/components/children/child-fee-settings-form";
import { ChildEnrolledScheduleForm } from "@/components/children/child-enrolled-schedule-form";
import { ChildWinzForm } from "@/components/children/child-winz-form";
import { ChildPhotoUpload } from "@/components/children/child-photo-upload";
import { ChildAvatar } from "@/components/children/child-avatar";
import { DeleteChildButton } from "@/components/children/delete-child-button";
import { StatusBadge } from "@/components/status-badge";
import { ChevronRightIcon } from "@/components/icons";
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

  const learningStories = await getPublishedStoriesForChild(child.id);

  const roomColors = getRoomColorClasses(child.room_color);

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <nav className="flex items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/children" className="hover:text-charcoal">
          Children &amp; Fees
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
              {child.age_as_of ? ` as of ${formatDate(child.age_as_of)}` : ""}
              {" · "}
              {child.bill_payer_name ?? "No bill payer set"}
            </p>
            {child.residential_address && <p className="mt-0.5 text-sm text-charcoal/50">{child.residential_address}</p>}
          </div>
        </div>
        <form action={setChildStatus.bind(null, child.id, child.status === "active" ? "left" : "active")}>
          <button type="submit" className="btn-ghost">
            {child.status === "active" ? "Mark as no longer attending" : "Mark as active"}
          </button>
        </form>
      </div>

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
          residentialAddress={child.residential_address}
          primaryContactEmail={child.primary_contact_email}
          roomId={child.room_id}
          roomNotes={child.room_notes}
          rooms={rooms}
          billPayerName={child.bill_payer_name}
          billPayerUnlistedNote={child.bill_payer_unlisted_note}
          billPayerOptions={billPayerOptions}
          notes={child.notes}
          onSave={updateChildDetails.bind(null, child.id)}
        />
      </section>

      {child.bill_payer && (
        <section className="card p-5">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
            Bill payer — {child.bill_payer.full_name}
          </h2>
          <div className="flex flex-col gap-1 text-sm text-charcoal/70">
            <p>{child.bill_payer.phone ?? "No phone on file"}</p>
            <p>{child.bill_payer.email ?? "No email on file"}</p>
            {child.bill_payer.address && <p>{child.bill_payer.address}</p>}
            {child.primary_contact_email && child.primary_contact_email !== child.bill_payer.email && (
              <p className="mt-1 text-charcoal/50">
                Primary contact (PC1): {child.primary_contact_email} — different from the bill payer
              </p>
            )}
          </div>
          {child.siblings.length > 0 && (
            <div className="mt-4 border-t border-charcoal/5 pt-4">
              <p className="mb-2 text-xs font-medium text-charcoal/50">
                Also billed to {child.bill_payer.full_name} — sibling discount applies
              </p>
              <div className="flex flex-wrap gap-2">
                {child.siblings.map((s) => (
                  <Link key={s.id} href={`/children/${s.id}`} className="badge bg-sand-100 text-charcoal/70 hover:bg-sand-200">
                    {s.full_name}
                  </Link>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      <section id="learning-stories" className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Learning Stories</h2>
        <ChildLearningStoriesPanel stories={learningStories} />
      </section>

      <section className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Enrolled days &amp; times</h2>
        <ChildEnrolledScheduleForm
          schedule={child.enrolled_schedule}
          onSave={updateChildEnrolledSchedule.bind(null, child.id)}
        />
      </section>

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
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          WINZ Child Care Subsidy
        </h2>
        <ChildWinzForm subsidy={child.winz_subsidy} onSave={updateChildWinzSubsidy.bind(null, child.id)} />
      </section>

      <section className="card border-status-action/20 p-5">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-status-action">Danger zone</h2>
        <p className="mb-3 text-sm text-charcoal/60">Permanently remove this child&apos;s profile and fee settings.</p>
        <DeleteChildButton childId={child.id} fullName={child.full_name} />
      </section>
    </div>
  );
}

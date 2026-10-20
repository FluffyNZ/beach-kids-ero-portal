import Link from "next/link";
import type { AccidentIllnessRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { SunblockPreferenceForm } from "@/components/children/sunblock-preference-form";
import { MarketingPhotoConsentForm } from "@/components/children/marketing-photo-consent-form";

/** "Health & permissions" tab content. There's no allergy/medical-condition
 * or consent-form data model anywhere in this app, so this intentionally
 * doesn't invent fields for those. The real, already-functional sources of
 * per-child health/permission data are: this child's Accident & Illness
 * record history, the sunblock preference (migration 0062, also editable
 * from the Sunblock Charts page), and the marketing/social-media photo
 * permission flag (migration 0064, read by the Marketing feature). See
 * the note at the bottom for what's still missing (allergies, medical
 * conditions, a general consent-forms record). */
export function ChildHealthPanel({
  records,
  childId,
  usesOwnSunblock,
  sunblockInstructions,
  marketingPhotoConsent,
  marketingPhotoConsentNotes,
}: {
  records: AccidentIllnessRecord[];
  childId: string;
  usesOwnSunblock: boolean;
  sunblockInstructions: string | null;
  marketingPhotoConsent: boolean | null;
  marketingPhotoConsentNotes: string | null;
}) {
  return (
    <div className="flex flex-col gap-4">
      <div className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          Marketing / social media photo permission
        </h2>
        <MarketingPhotoConsentForm
          childId={childId}
          initialConsent={marketingPhotoConsent}
          initialNotes={marketingPhotoConsentNotes}
        />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Sunblock</h2>
        <SunblockPreferenceForm
          childId={childId}
          initialUsesOwn={usesOwnSunblock}
          initialInstructions={sunblockInstructions}
        />
      </div>

      <div className="card p-5">
        <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          Accident &amp; illness history
        </h2>
        {records.length === 0 ? (
          <p className="text-sm text-charcoal/50">No accident or illness records logged for this child.</p>
        ) : (
          <div className="flex flex-col divide-y divide-charcoal/5">
            {records.map((r) => (
              <Link
                key={r.id}
                href={`/records/accidents-illness/${r.id}`}
                className="flex flex-wrap items-start justify-between gap-2 py-3 hover:bg-sand-50"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-charcoal">{formatDate(r.incident_date)}</p>
                  <p className="mt-0.5 line-clamp-2 text-sm text-charcoal/60">
                    {r.description || "No description recorded"}
                  </p>
                  <p className="mt-1 text-xs text-charcoal/40">
                    {r.staff_name ? `Attended by ${r.staff_name}` : "No staff member recorded"}
                    {r.parent_signed ? " · Parent signed" : " · Not yet signed by parent"}
                  </p>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="card border-charcoal/10 bg-sand-50 p-4">
        <p className="text-sm text-charcoal/60">
          This app doesn&apos;t yet have a place to record allergies, medical conditions, medication or consent
          forms for a child — only the accident &amp; illness history above exists today. Let me know if you&apos;d
          like that added as a real feature; nothing here is a placeholder standing in for it.
        </p>
      </div>
    </div>
  );
}

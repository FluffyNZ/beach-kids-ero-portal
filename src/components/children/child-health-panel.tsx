import Link from "next/link";
import { Panel } from "@/components/ui/panel";
import { StatusPill } from "@/components/ui/status-pill";
import type { AccidentIllnessRecord } from "@/lib/types";
import { formatDate } from "@/lib/utils";
import { SunblockPreferenceForm } from "@/components/children/sunblock-preference-form";
import { MarketingPhotoConsentForm } from "@/components/children/marketing-photo-consent-form";

/** "Health" tab. Only the per-child health and permission records that
 * really exist in Earlydesk are shown: marketing photo permission
 * (migration 0064), sunblock preference (0062, also editable on the
 * Sunblock charts page) and this child's Accident & illness records.
 * There's no allergy, medical-condition, medication or consent-form record
 * yet, and this says so rather than showing empty fields for them. */
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
    <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-2">
      <Panel
        id="health-accidents"
        title="Accident and illness records"
        count={records.length}
        className="lg:col-span-2"
        headerAction={
          <Link
            href="/records/accidents-illness/new"
            className="shrink-0 rounded text-sm font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700"
          >
            Log a record
          </Link>
        }
      >
        {records.length === 0 ? (
          <p className="border-t border-charcoal/10 px-5 py-4 text-sm text-charcoal/70">
            No accident or illness records for this child.
          </p>
        ) : (
          <ul className="divide-y divide-charcoal/10 border-t border-charcoal/10">
            {records.map((r) => (
              <li key={r.id}>
                <Link
                  href={`/records/accidents-illness/${r.id}`}
                  className="flex flex-wrap items-start justify-between gap-2 px-5 py-3 transition-colors hover:bg-lilac-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-charcoal"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-charcoal">{formatDate(r.incident_date)}</p>
                    <p className="mt-0.5 line-clamp-2 text-sm text-charcoal/80">{r.description || "No description recorded"}</p>
                    <p className="mt-1 text-xs text-charcoal/70">
                      {r.staff_name ? `Attended by ${r.staff_name}` : "No staff member recorded"}
                    </p>
                  </div>
                  <StatusPill tone={r.parent_signed ? "ready" : "attention"}>
                    {r.parent_signed ? "Parent signed" : "Not signed by parent"}
                  </StatusPill>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel
        id="health-photo"
        title="Marketing photo permission"
        description="Whether this child may appear in centre marketing or social media posts."
        bodyClassName="border-t border-charcoal/10 px-5 py-4"
      >
        <MarketingPhotoConsentForm
          childId={childId}
          initialConsent={marketingPhotoConsent}
          initialNotes={marketingPhotoConsentNotes}
        />
      </Panel>

      <Panel id="health-sunblock" title="Sunblock" bodyClassName="border-t border-charcoal/10 px-5 py-4">
        <SunblockPreferenceForm childId={childId} initialUsesOwn={usesOwnSunblock} initialInstructions={sunblockInstructions} />
      </Panel>

      <p className="text-sm text-charcoal/70 lg:col-span-2">
        Allergies, medical conditions, medication and consent forms don&apos;t have a place in Earlydesk yet — keep
        using the child&apos;s notes and paper records for these.
      </p>
    </div>
  );
}

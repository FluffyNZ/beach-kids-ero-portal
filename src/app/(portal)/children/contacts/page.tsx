import Link from "next/link";
import { getContactDirectoryForManagement } from "@/lib/data/contact-directory";
import { FamilyContactsManager } from "@/components/children/family-contacts-manager";
import { StatTile } from "@/components/dashboard/stat-tile";

export const dynamic = "force-dynamic";

export default async function ContactNumbersPage() {
  const { families, unlinkedChildren, staffGaps, staffTotal } = await getContactDirectoryForManagement();

  const familiesWithoutNumber = families.filter(
    (f) => !f.billPayerPhone?.trim() && !f.contacts.some((c) => c.phone?.trim())
  ).length;
  const missingMobile = staffGaps.filter((s) => s.missingMobile).length;
  const missingEmergency = staffGaps.filter((s) => s.missingEmergencyNumber).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Contact numbers</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            The numbers shown on the staff room tablet. Fill in each family&apos;s contacts here; staff mobiles and
            emergency contacts are edited on each person&apos;s own staff profile.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/children" className="btn-ghost">
            ← Children
          </Link>
          <a href="/staffroom" target="_blank" rel="noreferrer" className="btn-secondary">
            Open staff room page ↗
          </a>
        </div>
      </div>

      <section className="card p-5 text-sm leading-relaxed text-charcoal/70">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal/50">About the staff room page</h2>
        <p>
          The tablet opens <strong className="text-charcoal">/staffroom</strong> on this site — a separate, PIN-protected
          page with no access to the rest of the portal. The PIN is the <code className="rounded bg-charcoal/5 px-1">STAFFROOM_PIN</code>{" "}
          setting in Vercel (change it there and every tablet is locked out until the new PIN is entered). It locks itself
          after 5 minutes without a touch. It only shows currently active children and staff.
        </p>
        <p className="mt-2">
          To make someone appear under <strong className="text-charcoal">Emergency contacts</strong>, include the word
          &ldquo;Emergency&rdquo; in their relationship below (for example &ldquo;Emergency contact – Nana&rdquo;).
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile label="Families" value={families.length} tone="neutral" />
        <StatTile
          label="Families with no number"
          value={familiesWithoutNumber}
          tone={familiesWithoutNumber > 0 ? "attention" : "neutral"}
        />
        <StatTile label="Staff missing a mobile" value={missingMobile} tone={missingMobile > 0 ? "attention" : "neutral"} />
        <StatTile
          label="Staff missing an emergency number"
          value={missingEmergency}
          tone={missingEmergency > 0 ? "attention" : "neutral"}
        />
      </div>

      <FamilyContactsManager families={families} />

      {unlinkedChildren.length > 0 && (
        <section className="card p-5">
          <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
            Children with no family linked
          </h2>
          <p className="mb-3 text-sm text-charcoal/60">
            Contacts hang off a family&apos;s bill payer, so these children can&apos;t have numbers added here yet. Open
            their profile and set a bill payer first.
          </p>
          <div className="flex flex-wrap gap-2">
            {unlinkedChildren.map((child) => (
              <Link key={child.id} href={`/children/${child.id}`} className="badge bg-sand-100 text-charcoal/70 hover:bg-sand-200">
                {child.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Staff still to fill in</h2>
        {staffGaps.length === 0 ? (
          <p className="text-sm text-charcoal/60">
            All {staffTotal} active staff have a mobile and an emergency contact number on file.
          </p>
        ) : (
          <>
            <p className="mb-3 text-sm text-charcoal/60">
              Open a person&apos;s profile → Overview → Personal &amp; contact → Edit to add the missing numbers.
            </p>
            <div className="flex flex-col divide-y divide-charcoal/5">
              {staffGaps.map((s) => (
                <div key={s.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <div>
                    <Link href={`/staff/${s.id}`} className="text-sm font-medium text-charcoal hover:underline">
                      {s.name}
                    </Link>
                    <p className="text-xs text-charcoal/50">
                      {[s.missingMobile ? "No mobile" : null, s.missingEmergencyNumber ? "No emergency contact number" : null]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>
                  <Link href={`/staff/${s.id}`} className="btn-ghost px-3 py-1.5 text-xs">
                    Open profile
                  </Link>
                </div>
              ))}
            </div>
          </>
        )}
      </section>
    </div>
  );
}

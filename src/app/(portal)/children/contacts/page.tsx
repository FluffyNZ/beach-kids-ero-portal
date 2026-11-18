import Link from "next/link";
import { getContactDirectoryForManagement } from "@/lib/data/contact-directory";
import { ChildContactsManager } from "@/components/children/child-contacts-manager";
import { StatTile } from "@/components/dashboard/stat-tile";

export const dynamic = "force-dynamic";

export default async function ContactNumbersPage() {
  const { children, staffGaps, staffTotal } = await getContactDirectoryForManagement();

  const childrenWithoutContacts = children.filter((child) => child.contacts.length === 0).length;
  const childrenWithForbidden = children.filter((child) => child.contacts.some((c) => c.forbidden_access)).length;
  const missingMobile = staffGaps.filter((s) => s.missingMobile).length;
  const missingEmergency = staffGaps.filter((s) => s.missingEmergencyNumber).length;

  return (
    <div className="mx-auto flex w-full max-w-4xl flex-col gap-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal md:text-3xl">Contact numbers</h1>
          <p className="mt-1 text-sm text-charcoal/60">
            Each child&apos;s contacts as shown on the staff room tablet — who can pick up, who to call in an emergency,
            and who must not be given access. Staff mobiles and emergency contacts are edited on each person&apos;s own
            staff profile.
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
          page with no access to the rest of the portal. The PIN is the{" "}
          <code className="rounded bg-charcoal/5 px-1">STAFFROOM_PIN</code> setting in Vercel. It locks itself after 5
          minutes without a touch, and only shows currently active children and staff.
        </p>
        <p className="mt-2">
          Contacts are kept <strong className="text-charcoal">per child</strong>, so siblings each have their own list.
          Anyone ticked <strong className="text-charcoal">Forbidden access</strong> appears in a red warning box on that
          child&apos;s card on the tablet, and can&apos;t also be marked as able to pick up.
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatTile
          label="Children with no contacts"
          value={childrenWithoutContacts}
          tone={childrenWithoutContacts > 0 ? "attention" : "neutral"}
        />
        <StatTile label="Children with a forbidden-access alert" value={childrenWithForbidden} tone="neutral" />
        <StatTile label="Staff missing a mobile" value={missingMobile} tone={missingMobile > 0 ? "attention" : "neutral"} />
        <StatTile
          label="Staff missing an emergency number"
          value={missingEmergency}
          tone={missingEmergency > 0 ? "attention" : "neutral"}
        />
      </div>

      <ChildContactsManager childList={children} />

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

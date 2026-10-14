import Link from "next/link";
import type { BillPayer, ChildSibling } from "@/lib/types";

/** The bill payer + siblings display that used to sit directly on the old
 * single-column child profile — unchanged, just relocated into its own
 * "Whānau & contacts" tab. Editing the bill payer link itself (and the
 * primary contact email) still happens on the Overview tab's child details
 * form, same as before — this is the read-only, quick-scan view of who's
 * already linked. */
export function ChildWhanauPanel({
  billPayer,
  primaryContactEmail,
  siblings,
}: {
  billPayer: BillPayer | null;
  primaryContactEmail: string | null;
  siblings: ChildSibling[];
}) {
  if (!billPayer) {
    return (
      <div className="card p-5">
        <p className="text-sm text-charcoal/50">
          No bill payer set yet — add one from the Overview tab&apos;s child details form.
        </p>
      </div>
    );
  }

  return (
    <div className="card p-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
        Bill payer — {billPayer.full_name}
      </h2>
      <div className="flex flex-col gap-1 text-sm text-charcoal/70">
        <p>{billPayer.phone ?? "No phone on file"}</p>
        <p>{billPayer.email ?? "No email on file"}</p>
        {billPayer.address && <p>{billPayer.address}</p>}
        {primaryContactEmail && primaryContactEmail !== billPayer.email && (
          <p className="mt-1 text-charcoal/50">
            Primary contact (PC1): {primaryContactEmail} — different from the bill payer
          </p>
        )}
        {billPayer.notes && <p className="mt-1 text-charcoal/50">Note: {billPayer.notes}</p>}
      </div>
      {siblings.length > 0 && (
        <div className="mt-4 border-t border-charcoal/5 pt-4">
          <p className="mb-2 text-xs font-medium text-charcoal/50">
            Also billed to {billPayer.full_name} — sibling discount applies
          </p>
          <div className="flex flex-wrap gap-2">
            {siblings.map((s) => (
              <Link key={s.id} href={`/children/${s.id}`} className="badge bg-sand-100 text-charcoal/70 hover:bg-sand-200">
                {s.full_name}
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

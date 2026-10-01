import type { WeeklyFeesByFamily } from "@/lib/types";
import { formatCurrency } from "@/lib/utils";

/** One row per family (bill payer), with their children and this week's
 * total underneath — the number that would actually go on an invoice.
 * Read-only: this is a review of fee numbers already calculated in
 * Children & Fees, not a place to edit them. */
export function FamilyFeesTable({ data }: { data: WeeklyFeesByFamily }) {
  if (data.families.length === 0 && data.unassignedChildren.length === 0) {
    return (
      <div className="card p-6 text-center text-sm text-charcoal/50">
        No active children with fees this week.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {data.families.map((family) => (
        <div key={family.bill_payer_id} className="card flex flex-col gap-3 p-5">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="font-display text-lg font-semibold text-charcoal">{family.bill_payer_name}</h3>
              {family.bill_payer_email && <p className="text-xs text-charcoal/50">{family.bill_payer_email}</p>}
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-charcoal/50">
                Owing this week{family.isEstimated ? " (estimated)" : ""}
              </p>
              <p className="font-display text-xl font-bold text-charcoal">{formatCurrency(family.totalParentPays)}</p>
            </div>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-sand-200 text-left text-xs uppercase tracking-wide text-charcoal/40">
                <th className="py-1.5 pr-2 font-medium">Child</th>
                <th className="py-1.5 px-2 font-medium">Room</th>
                <th className="py-1.5 px-2 text-right font-medium">Fee total</th>
                <th className="py-1.5 px-2 text-right font-medium">WINZ</th>
                <th className="py-1.5 pl-2 text-right font-medium">Parent pays</th>
              </tr>
            </thead>
            <tbody>
              {family.children.map((child) => (
                <tr key={child.child_id} className="border-b border-sand-100 last:border-0">
                  <td className="py-1.5 pr-2 text-charcoal">
                    {child.full_name}
                    {child.is_estimated && <span className="ml-1.5 text-xs text-charcoal/40">(est.)</span>}
                  </td>
                  <td className="py-1.5 px-2 text-charcoal/60">{child.room_name ?? "—"}</td>
                  <td className="py-1.5 px-2 text-right text-charcoal/80">{formatCurrency(child.fee_total)}</td>
                  <td className="py-1.5 px-2 text-right text-charcoal/80">
                    {child.winz_payment > 0 ? formatCurrency(child.winz_payment) : "—"}
                  </td>
                  <td className="py-1.5 pl-2 text-right font-medium text-charcoal">{formatCurrency(child.parent_pays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}

      {data.unassignedChildren.length > 0 && (
        <div className="card flex flex-col gap-3 border-l-4 border-l-status-attention p-5">
          <div>
            <h3 className="font-display text-lg font-semibold text-charcoal">No bill payer set</h3>
            <p className="text-xs text-charcoal/50">
              These children have fees calculated but no bill payer assigned yet, so they&apos;re not included in any
              family total above. Set a bill payer on each child&apos;s profile to include them.
            </p>
          </div>
          <table className="w-full text-sm">
            <tbody>
              {data.unassignedChildren.map((child) => (
                <tr key={child.child_id} className="border-b border-sand-100 last:border-0">
                  <td className="py-1.5 pr-2 text-charcoal">
                    {child.full_name}
                    {child.is_estimated && <span className="ml-1.5 text-xs text-charcoal/40">(est.)</span>}
                  </td>
                  <td className="py-1.5 px-2 text-charcoal/60">{child.room_name ?? "—"}</td>
                  <td className="py-1.5 pl-2 text-right font-medium text-charcoal">{formatCurrency(child.parent_pays)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

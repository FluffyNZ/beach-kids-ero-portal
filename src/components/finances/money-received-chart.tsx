import { formatCurrency } from "@/lib/utils";
import type { MoneyReceivedBucket } from "@/lib/data/finances";

/** A small bar chart of money received per week (or per month, for a
 * longer period — see buildMoneyReceivedBuckets) — hand-rolled with plain
 * CSS rather than a charting library, since this app has no chart
 * dependency installed and the brief doesn't call for adding one. */
export function MoneyReceivedChart({ buckets, total }: { buckets: MoneyReceivedBucket[]; total: number }) {
  const max = Math.max(1, ...buckets.map((b) => b.amount));

  return (
    <div className="flex h-full flex-col gap-4">
      <div>
        <p className="text-xs font-medium text-charcoal/50">Money received</p>
        <p className="mt-0.5 text-2xl font-bold tracking-tight text-charcoal">{formatCurrency(total)}</p>
      </div>

      {buckets.length === 0 ? (
        <p className="flex-1 text-sm text-charcoal/40">Nothing received yet in this period.</p>
      ) : (
        <div className="flex flex-1 items-end gap-2.5 md:gap-3">
          {buckets.map((bucket, i) => {
            const heightPercent = Math.max(2, Math.round((bucket.amount / max) * 100));
            return (
              <div key={`${bucket.label}-${i}`} className="flex flex-1 flex-col items-center gap-1.5">
                <p className="text-xs font-medium text-charcoal/70">
                  {bucket.amount > 0 ? formatCurrency(bucket.amount) : ""}
                </p>
                <div className="flex h-28 w-full items-end rounded-md bg-lilac-50">
                  <div
                    className="w-full rounded-md bg-lilac-600"
                    style={{ height: `${heightPercent}%` }}
                    title={`${bucket.label}: ${formatCurrency(bucket.amount)}`}
                  />
                </div>
                <p className="text-[11px] text-charcoal/45">{bucket.label}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

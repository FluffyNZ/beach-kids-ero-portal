export function MarketingStatCard({ label, value, sublabel, tone }: { label: string; value: string; sublabel?: string; tone?: "action" }) {
  return (
    <div className="card flex flex-col gap-1 p-4">
      <p className="text-xs font-semibold uppercase tracking-wide text-charcoal/45">{label}</p>
      <p className={`text-2xl font-bold ${tone === "action" ? "text-status-action" : "text-charcoal"}`}>{value}</p>
      {sublabel && <p className="text-xs text-charcoal/50">{sublabel}</p>}
    </div>
  );
}

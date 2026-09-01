function toneForPercent(percent: number) {
  if (percent >= 100) return "text-status-ready";
  if (percent >= 50) return "text-status-attention";
  return "text-status-action";
}

/** Same visual language as the dashboard's ReadinessRing, sized down for a
 * profile page — how many of the required documents are on file. */
export function DocumentRing({ percent, completed, total }: { percent: number; completed: number; total: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const toneClass = toneForPercent(percent);

  return (
    <div className="relative flex h-36 w-36 shrink-0 items-center justify-center">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-charcoal/10" />
        <circle
          cx="64"
          cy="64"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={toneClass}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-2xl font-bold text-charcoal">{percent}%</span>
        <span className="text-[11px] font-medium text-charcoal/50">
          {completed}/{total} docs
        </span>
      </div>
    </div>
  );
}

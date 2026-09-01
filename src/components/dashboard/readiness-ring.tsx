function toneForPercent(percent: number) {
  if (percent >= 80) return "text-status-ready";
  if (percent >= 50) return "text-status-attention";
  return "text-status-action";
}

export function ReadinessRing({ percent }: { percent: number }) {
  const radius = 72;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;
  const toneClass = toneForPercent(percent);

  return (
    <div className="relative flex h-52 w-52 items-center justify-center">
      <svg viewBox="0 0 160 160" className="h-full w-full -rotate-90">
        <circle cx="80" cy="80" r={radius} fill="none" stroke="currentColor" strokeWidth="12" className="text-charcoal/10" />
        <circle
          cx="80"
          cy="80"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          className={toneClass}
          style={{ transition: "stroke-dashoffset 0.6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="font-display text-4xl font-bold text-charcoal">{percent}%</span>
        <span className="text-xs font-medium uppercase tracking-wide text-charcoal/50">Ready</span>
      </div>
    </div>
  );
}

import Link from "next/link";
import { ChevronRightIcon } from "@/components/icons";

type Accent = "pink" | "orange" | "burgundy" | "yellow";

const ACCENT_CHIP: Record<Accent, string> = {
  pink: "bg-pink-50 text-pink-500",
  orange: "bg-orange-50 text-orange-600",
  burgundy: "bg-burgundy-50 text-burgundy-500",
  yellow: "bg-yellow-50 text-yellow-600",
};

function barTone(percent: number) {
  if (percent >= 80) return "bg-status-ready";
  if (percent >= 50) return "bg-status-attention";
  if (percent > 0) return "bg-status-action";
  return "bg-charcoal/10";
}

export function SectionCard({
  code,
  name,
  percent,
  total,
  assessed,
  accent = "burgundy",
}: {
  code: string;
  name: string;
  percent: number;
  total: number;
  assessed: number;
  accent?: Accent;
}) {
  return (
    <Link
      href={`/checklist#${code}`}
      className="card group flex flex-col gap-4 p-6 transition-all hover:-translate-y-0.5 hover:shadow-cardHover"
    >
      <div className="flex items-start justify-between">
        <span
          className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-wide ${ACCENT_CHIP[accent]}`}
        >
          {code}
        </span>
        <ChevronRightIcon className="h-4 w-4 text-charcoal/20 transition-transform group-hover:translate-x-0.5 group-hover:text-charcoal/50" />
      </div>

      <div>
        <h3 className="font-display text-lg font-semibold leading-snug text-charcoal">{name}</h3>
        <p className="mt-1 text-xs text-charcoal/50">
          {total === 0 ? "No criteria loaded yet" : `${assessed} of ${total} criteria ready`}
        </p>
      </div>

      <div className="mt-auto flex items-center gap-3">
        <div className="h-2 w-full overflow-hidden rounded-full bg-charcoal/5">
          <div className={`h-full rounded-full ${barTone(percent)}`} style={{ width: `${percent}%` }} />
        </div>
        <span className="font-display text-xl font-semibold text-charcoal">{percent}%</span>
      </div>
    </Link>
  );
}

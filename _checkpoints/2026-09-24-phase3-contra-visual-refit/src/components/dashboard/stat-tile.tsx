import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/constants";

const TONE_TEXT: Record<StatusTone, string> = {
  ready: "text-status-ready",
  attention: "text-status-attention",
  action: "text-status-action",
  neutral: "text-charcoal",
};

const TONE_DOT: Record<StatusTone, string> = {
  ready: "bg-status-ready",
  attention: "bg-status-attention",
  action: "bg-status-action",
  neutral: "bg-charcoal/25",
};

export function StatTile({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number | string;
  tone?: StatusTone;
}) {
  return (
    <div className="card flex flex-col gap-2 p-4">
      <div className="flex items-center gap-1.5">
        <span className={cn("h-1.5 w-1.5 rounded-full", TONE_DOT[tone])} />
        <p className="text-xs font-medium text-charcoal/50">{label}</p>
      </div>
      <p className={cn("text-3xl font-bold tracking-tight", TONE_TEXT[tone])}>{value}</p>
    </div>
  );
}

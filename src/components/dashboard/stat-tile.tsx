import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/constants";

const TONE_TEXT: Record<StatusTone, string> = {
  ready: "text-status-ready",
  attention: "text-status-attention",
  action: "text-status-action",
  neutral: "text-charcoal",
};

const TONE_BORDER: Record<StatusTone, string> = {
  ready: "border-l-status-ready",
  attention: "border-l-status-attention",
  action: "border-l-status-action",
  neutral: "border-l-charcoal/15",
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
    <div className={cn("card border-l-4 p-4", TONE_BORDER[tone])}>
      <p className={cn("font-display text-3xl font-bold", TONE_TEXT[tone])}>{value}</p>
      <p className="mt-1 text-xs font-medium text-charcoal/50">{label}</p>
    </div>
  );
}

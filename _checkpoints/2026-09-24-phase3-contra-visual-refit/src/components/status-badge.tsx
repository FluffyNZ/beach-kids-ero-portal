import { cn } from "@/lib/utils";
import type { StatusTone } from "@/lib/constants";

const TONE_CLASSES: Record<StatusTone, string> = {
  ready: "bg-status-readyBg text-status-ready",
  attention: "bg-status-attentionBg text-status-attention",
  action: "bg-status-actionBg text-status-action",
  neutral: "bg-status-neutralBg text-status-neutral",
};

const DOT_CLASSES: Record<StatusTone, string> = {
  ready: "bg-status-ready",
  attention: "bg-status-attention",
  action: "bg-status-action",
  neutral: "bg-status-neutral",
};

export function StatusBadge({
  tone,
  children,
  className,
}: {
  tone: StatusTone;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <span className={cn("badge", TONE_CLASSES[tone], className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT_CLASSES[tone])} />
      {children}
    </span>
  );
}

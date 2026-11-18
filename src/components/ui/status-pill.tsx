import { cn } from "@/lib/utils";

export type PillTone = "ready" | "attention" | "action" | "neutral";

const BG: Record<PillTone, string> = {
  ready: "bg-status-readyBg",
  attention: "bg-status-attentionBg",
  action: "bg-status-actionBg",
  neutral: "bg-charcoal/[0.06]",
};

const DOT: Record<PillTone, string> = {
  ready: "bg-status-ready",
  attention: "bg-status-attention",
  action: "bg-status-action",
  neutral: "bg-charcoal/40",
};

/** A small status label. The meaning is carried by the words, with the
 * coloured dot as reinforcement — text stays charcoal so it's readable on
 * every tone (green/amber/red are kept for real statuses only). */
export function StatusPill({ tone, children, className }: { tone: PillTone; children: React.ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1 text-xs font-medium text-charcoal",
        BG[tone],
        className
      )}
    >
      <span aria-hidden="true" className={cn("h-1.5 w-1.5 shrink-0 rounded-full", DOT[tone])} />
      {children}
    </span>
  );
}

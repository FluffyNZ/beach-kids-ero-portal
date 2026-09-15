import { StatusBadge } from "@/components/status-badge";
import type { EvidenceGuidance } from "@/lib/evidence-guidance";

/** A curated "what to collect" starting point for this criterion — shown
 * above the actual Evidence panel, never inside it, so it can never be
 * mistaken for evidence that's already on file. Only renders when real
 * guidance exists for this criterion's code. */
export function EvidenceGuidancePanel({ guidance }: { guidance: EvidenceGuidance }) {
  return (
    <section className="card border-ocean-100 bg-ocean-50/40 p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-ocean-500">
          What to Collect for This Criterion
        </h2>
        {guidance.requiredByC14 && <StatusBadge tone="attention">Named explicitly in C14</StatusBadge>}
      </div>

      <ul className="flex flex-col gap-2 text-sm leading-relaxed text-ocean-800">
        {guidance.whatToCollect.map((item, i) => (
          <li key={i} className="flex gap-2.5">
            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-ocean-300" />
            <span>{item}</span>
          </li>
        ))}
      </ul>

      <div className="mt-3 rounded-xl border border-ocean-100 bg-white p-3 text-sm text-ocean-700">
        <span className="font-medium text-ocean-800">Where it likely lives: </span>
        {guidance.whereItLives}
      </div>

      <p className="mt-3 text-xs text-ocean-400">
        A starting point for what to gather — not evidence itself. Attach the real document, photo or record below
        once you have it.
      </p>
    </section>
  );
}

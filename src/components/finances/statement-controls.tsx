"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { formatCurrency } from "@/lib/utils";

export type StatementFamilyOption = { id: string; name: string; email: string | null; outstanding: number };
export type StatementPreset = { key: string; label: string; from: string; to: string };

/** Choose a family account and a statement period. */
export function StatementControls({
  families,
  familyId,
  from,
  to,
  presets,
}: {
  families: StatementFamilyOption[];
  familyId: string | null;
  from: string;
  to: string;
  presets: StatementPreset[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [query, setQuery] = useState("");
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);
  const selected = families.find((f) => f.id === familyId) ?? null;
  const activePreset = presets.find((p) => p.from === from && p.to === to)?.key ?? "custom";

  const go = (next: { family?: string | null; from?: string; to?: string }) => {
    const qs = new URLSearchParams();
    const fam = next.family === undefined ? familyId : next.family;
    if (fam) qs.set("family", fam);
    qs.set("from", next.from ?? from);
    qs.set("to", next.to ?? to);
    startTransition(() => router.push(`/finances/statements?${qs.toString()}`, { scroll: false }));
  };

  const q = query.trim().toLowerCase();
  const matches = useMemo(
    () => (q ? families.filter((f) => f.name.toLowerCase().includes(q) || (f.email ?? "").toLowerCase().includes(q)).slice(0, 8) : []),
    [families, q]
  );

  return (
    <section aria-label="Statement options" className="flex flex-col gap-4 rounded-2xl border border-charcoal/10 bg-white p-4 sm:p-5 print:hidden">
      <div className="grid gap-4 lg:grid-cols-2">
        <div>
          <label htmlFor="statement-family" className="mb-1.5 block text-sm font-medium text-charcoal">
            Family account
          </label>
          {selected ? (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-charcoal/15 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-charcoal">{selected.name}</p>
                <p className="truncate text-xs text-charcoal/70">{selected.email ?? "No email on file"}</p>
              </div>
              <button type="button" className="text-sm font-medium text-lilac-700 underline-offset-4 hover:underline" onClick={() => go({ family: null })}>
                Change
              </button>
            </div>
          ) : (
            <div className="relative">
              <input
                id="statement-family"
                type="search"
                role="combobox"
                aria-expanded={matches.length > 0}
                aria-controls="statement-family-results"
                className="input"
                placeholder="Search by name or email"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {q && (
                <ul id="statement-family-results" role="listbox" className="absolute z-10 mt-1 max-h-72 w-full overflow-auto rounded-xl border border-charcoal/15 bg-white py-1 shadow-cardHover">
                  {matches.length === 0 ? (
                    <li className="px-3 py-2 text-sm text-charcoal/70">No family accounts match.</li>
                  ) : (
                    matches.map((f) => (
                      <li key={f.id} role="option" aria-selected="false">
                        <button type="button" className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-lilac-50" onClick={() => go({ family: f.id })}>
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium text-charcoal">{f.name}</span>
                            <span className="block truncate text-xs text-charcoal/70">{f.email ?? "No email on file"}</span>
                          </span>
                          {f.outstanding > 0 && <span className="shrink-0 text-xs tabular-nums text-charcoal">{formatCurrency(f.outstanding)} owing</span>}
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
            </div>
          )}
        </div>

        <div>
          <label htmlFor="statement-period" className="mb-1.5 block text-sm font-medium text-charcoal">
            Period
          </label>
          <select
            id="statement-period"
            className="input"
            value={activePreset}
            onChange={(e) => {
              const p = presets.find((x) => x.key === e.target.value);
              if (p) go({ from: p.from, to: p.to });
            }}
          >
            {presets.map((p) => (
              <option key={p.key} value={p.key}>
                {p.label}
              </option>
            ))}
            <option value="custom">Custom dates</option>
          </select>
          <div className="mt-2 flex flex-wrap items-end gap-2">
            <div>
              <label htmlFor="statement-from" className="mb-1 block text-xs text-charcoal/70">
                From
              </label>
              <input id="statement-from" type="date" className="input w-40 py-1.5" value={customFrom} max={customTo} onChange={(e) => setCustomFrom(e.target.value)} />
            </div>
            <div>
              <label htmlFor="statement-to" className="mb-1 block text-xs text-charcoal/70">
                To
              </label>
              <input id="statement-to" type="date" className="input w-40 py-1.5" value={customTo} min={customFrom} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
            <button
              type="button"
              className="btn-secondary py-1.5"
              disabled={!customFrom || !customTo || customFrom > customTo || (customFrom === from && customTo === to)}
              onClick={() => go({ from: customFrom, to: customTo })}
            >
              Apply dates
            </button>
          </div>
        </div>
      </div>
      {pending && <p className="text-sm text-charcoal/70" aria-live="polite">Updating preview…</p>}
    </section>
  );
}

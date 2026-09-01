"use client";

import { useMemo, useState, useTransition } from "react";
import { Modal } from "@/components/ui/modal";
import { linkEvidenceToCriterion } from "@/lib/actions/evidence";
import { SearchIcon } from "@/components/icons";
import { formatDate } from "@/lib/utils";
import type { EvidenceItem } from "@/lib/types";

export function LinkEvidenceModal({
  open,
  onClose,
  criterionId,
  criterionCode,
  libraryEvidence,
  alreadyLinkedIds,
  onLinked,
}: {
  open: boolean;
  onClose: () => void;
  criterionId: string;
  criterionCode: string;
  libraryEvidence: EvidenceItem[];
  alreadyLinkedIds: Set<string>;
  onLinked?: () => void;
}) {
  const [query, setQuery] = useState("");
  const [pending, startTransition] = useTransition();
  const [linkingId, setLinkingId] = useState<string | null>(null);

  const results = useMemo(() => {
    const term = query.trim().toLowerCase();
    return libraryEvidence
      .filter((e) => !alreadyLinkedIds.has(e.id))
      .filter(
        (e) =>
          term.length === 0 ||
          e.title.toLowerCase().includes(term) ||
          (e.category ?? "").toLowerCase().includes(term)
      )
      .slice(0, 30);
  }, [query, libraryEvidence, alreadyLinkedIds]);

  return (
    <Modal open={open} onClose={onClose} title="Link existing evidence">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ocean-400" />
          <input
            type="text"
            className="input pl-9"
            placeholder="Search the evidence library…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>

        <div className="max-h-80 divide-y divide-ocean-50 overflow-y-auto rounded-xl border border-ocean-100">
          {results.length === 0 ? (
            <p className="p-4 text-sm text-ocean-500">No matching evidence found.</p>
          ) : (
            results.map((e) => (
              <div key={e.id} className="flex items-center justify-between gap-3 px-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-ocean-950">{e.title}</p>
                  <p className="truncate text-xs text-ocean-500">
                    {e.category ?? "Uncategorised"} · uploaded {formatDate(e.uploaded_at)}
                  </p>
                </div>
                <button
                  type="button"
                  disabled={pending}
                  className="btn-secondary shrink-0 px-3 py-1.5 text-xs"
                  onClick={() => {
                    setLinkingId(e.id);
                    startTransition(async () => {
                      await linkEvidenceToCriterion(e.id, criterionId, criterionCode);
                      setLinkingId(null);
                      onLinked?.();
                    });
                  }}
                >
                  {linkingId === e.id && pending ? "Linking…" : "Link"}
                </button>
              </div>
            ))
          )}
        </div>

        <div className="flex justify-end pt-1">
          <button type="button" onClick={onClose} className="btn-ghost">
            Done
          </button>
        </div>
      </div>
    </Modal>
  );
}

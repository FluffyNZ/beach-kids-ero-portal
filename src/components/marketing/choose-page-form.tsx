"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { selectMetaPage } from "@/lib/actions/marketing";

export function ChoosePageForm({ state, pages }: { state: string; pages: { id: string; name: string; instagramAccountName: string | null }[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="card flex flex-col gap-3 border-lilac-600/30 bg-lilac-50 p-5">
      <p className="text-sm font-semibold text-charcoal">Which Facebook Page is Beach Kids?</p>
      <p className="text-xs text-charcoal/55">
        Meta returned {pages.length} Page{pages.length === 1 ? "" : "s"} for that login. Pick the real Beach Kids Page —
        its linked Instagram Business account (if any) connects automatically with it.
      </p>
      <div className="flex flex-col gap-2">
        {pages.map((page) => (
          <button
            key={page.id}
            type="button"
            disabled={pending}
            className="flex items-center justify-between rounded-lg border border-charcoal/10 bg-white px-4 py-3 text-left text-sm transition hover:border-burgundy-500"
            onClick={() =>
              startTransition(async () => {
                setError(null);
                try {
                  await selectMetaPage(state, page.id);
                  router.push("/marketing/connections");
                  router.refresh();
                } catch (err) {
                  setError(err instanceof Error ? err.message : "Could not connect this Page.");
                }
              })
            }
          >
            <span>
              <span className="font-medium text-charcoal">{page.name}</span>
              <span className="block text-xs text-charcoal/45">
                {page.instagramAccountName ? `Instagram: @${page.instagramAccountName}` : "No Instagram account linked"}
              </span>
            </span>
            <span className="text-xs font-semibold text-burgundy-500">{pending ? "Connecting…" : "Use this Page"}</span>
          </button>
        ))}
      </div>
      {error && <p className="text-xs text-status-action">{error}</p>}
    </div>
  );
}

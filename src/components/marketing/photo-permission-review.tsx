"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { searchMarketingChildren, tagChildOnMedia, untagChildFromMedia, setMediaChildConsentConfirmed } from "@/lib/actions/marketing";
import type { MarketingPostMedia } from "@/lib/types";

const CONSENT_SOURCE_LABEL: Record<string, string> = {
  on_file: "Marked OK to use on their profile",
  declined: "Marked NOT OK to use on their profile",
  unknown: "No permission confirmed on their profile yet",
};

/** The photo-permission review step for one piece of media — tag which
 * real children appear in it, see what's actually on file for each (never
 * assumed), and explicitly confirm permission per child before this post
 * can be scheduled. See migration 0064 / children.marketing_photo_consent
 * for where that real per-child flag lives. */
export function PhotoPermissionReview({ postId, media }: { postId: string; media: MarketingPostMedia }) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ id: string; full_name: string; marketing_photo_consent: boolean | null }[]>([]);
  const [searching, setSearching] = useState(false);
  const [pending, startTransition] = useTransition();

  async function runSearch() {
    setSearching(true);
    const found = await searchMarketingChildren(query);
    setResults(found.filter((c) => !media.taggedChildren.some((t) => t.childId === c.id)));
    setSearching(false);
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-charcoal/10 p-4">
      <p className="text-sm font-semibold text-charcoal">Who's in this photo/video?</p>
      <p className="text-xs text-charcoal/55">
        Tag any real child shown, then confirm permission for each before this post can be scheduled. Uploading a
        photo never implies permission — only the actual flag on a child's profile (Health &amp; permissions tab)
        does.
      </p>

      <div className="flex gap-2">
        <input
          className="input"
          placeholder="Search children by name…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && runSearch()}
        />
        <button type="button" className="btn-ghost shrink-0" onClick={runSearch} disabled={searching}>
          {searching ? "Searching…" : "Search"}
        </button>
      </div>

      {results.length > 0 && (
        <div className="flex flex-col gap-1 rounded-lg border border-charcoal/10 bg-sand-50 p-2">
          {results.map((child) => (
            <button
              key={child.id}
              type="button"
              disabled={pending}
              className="flex items-center justify-between rounded px-2 py-1.5 text-left text-sm hover:bg-white"
              onClick={() =>
                startTransition(async () => {
                  await tagChildOnMedia(media.id, postId, child.id);
                  setResults((r) => r.filter((c) => c.id !== child.id));
                  setQuery("");
                  router.refresh();
                })
              }
            >
              <span>{child.full_name}</span>
              <span className="text-xs font-medium text-burgundy-500">+ Tag</span>
            </button>
          ))}
        </div>
      )}

      {media.taggedChildren.length > 0 && (
        <div className="flex flex-col gap-2">
          {media.taggedChildren.map((tag) => (
            <div key={tag.childId ?? "unknown"} className="flex items-center justify-between gap-3 rounded-lg border border-charcoal/10 px-3 py-2">
              <div>
                <p className="text-sm font-medium text-charcoal">{tag.childName ?? "Unknown child"}</p>
                <p
                  className={`text-xs ${
                    tag.consentSource === "declined" ? "text-status-action" : tag.consentSource === "on_file" ? "text-kelp-600" : "text-charcoal/45"
                  }`}
                >
                  {CONSENT_SOURCE_LABEL[tag.consentSource]}
                </p>
              </div>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-1.5 text-xs text-charcoal">
                  <input
                    type="checkbox"
                    disabled={pending}
                    checked={tag.consentConfirmed}
                    onChange={(e) =>
                      startTransition(async () => {
                        if (!tag.childId) return;
                        await setMediaChildConsentConfirmed(media.id, tag.childId, postId, e.target.checked);
                        router.refresh();
                      })
                    }
                  />
                  Confirmed OK for this post
                </label>
                <button
                  type="button"
                  disabled={pending}
                  className="text-xs text-charcoal/40 hover:text-status-action"
                  onClick={() =>
                    startTransition(async () => {
                      if (!tag.childId) return;
                      await untagChildFromMedia(media.id, tag.childId, postId);
                      router.refresh();
                    })
                  }
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

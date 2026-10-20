"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  updatePostContent,
  uploadPostMedia,
  removePostMedia,
  setPhotoPermissionReviewed,
  schedulePost,
  publishPostNow,
  cancelScheduledPost,
  retryFailedPlatform,
  deleteDraftPost,
} from "@/lib/actions/marketing";
import { PhotoPermissionReview } from "@/components/marketing/photo-permission-review";
import { MarketingPostStatusBadge, MarketingPlatformResultBadge } from "@/components/marketing/post-status-badge";
import { nzWallTimeToUtcIso, utcIsoToNzWallTime, formatNzDateTime } from "@/lib/marketing/timezone";
import type { MarketingPost, MarketingPlatform, MarketingConnection } from "@/lib/types";

const PLATFORM_OPTIONS: { value: MarketingPlatform; label: string }[] = [
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
];

export function CreatePostForm({ post, connections }: { post: MarketingPost; connections: MarketingConnection[] }) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [saveError, setSaveError] = useState<string | null>(null);
  const [uploadMessages, setUploadMessages] = useState<string[]>([]);

  const [caption, setCaption] = useState(post.caption);
  const [adjustPerPlatform, setAdjustPerPlatform] = useState(Boolean(post.captionFacebook || post.captionInstagram));
  const [captionFacebook, setCaptionFacebook] = useState(post.captionFacebook ?? "");
  const [captionInstagram, setCaptionInstagram] = useState(post.captionInstagram ?? "");
  const [platforms, setPlatforms] = useState<Set<MarketingPlatform>>(new Set(post.platforms));
  const [dirty, setDirty] = useState(false);

  const existing = post.scheduledAt ? utcIsoToNzWallTime(post.scheduledAt) : null;
  const [scheduleDate, setScheduleDate] = useState(existing?.date ?? "");
  const [scheduleTime, setScheduleTime] = useState(existing?.time ?? "10:00");

  const media = post.media[0] ?? null;
  const isEditable = post.status === "draft" || post.status === "failed";
  const facebookConnected = connections.find((c) => c.platform === "facebook_page")?.status === "connected";
  const instagramConnected = connections.find((c) => c.platform === "instagram_business")?.status === "connected";

  function togglePlatform(p: MarketingPlatform) {
    setPlatforms((prev) => {
      const next = new Set(prev);
      if (next.has(p)) {
        if (next.size === 1) return next; // always at least one platform
        next.delete(p);
      } else {
        next.add(p);
      }
      return next;
    });
    setDirty(true);
  }

  async function saveContent() {
    setSaveError(null);
    await updatePostContent(post.id, {
      caption,
      caption_facebook: adjustPerPlatform ? captionFacebook || null : null,
      caption_instagram: adjustPerPlatform ? captionInstagram || null : null,
      platforms: Array.from(platforms),
    });
    setDirty(false);
    router.refresh();
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadMessages([]);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      if (media) await removePostMedia(media.id, post.id); // v1 supports one attachment — a new upload replaces it
      const result = await uploadPostMedia(post.id, formData, Array.from(platforms));
      if (fileInputRef.current) fileInputRef.current.value = "";
      if (!result.success) {
        setUploadMessages(result.errors);
        return;
      }
      setUploadMessages(result.warnings);
      router.refresh();
    });
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1.3fr_1fr]">
      <div className="flex flex-col gap-5">
        <div className="card flex flex-col gap-4 p-5">
          <div>
            <label className="label">Caption</label>
            <textarea
              className="input min-h-[120px]"
              disabled={!isEditable}
              value={caption}
              onChange={(e) => {
                setCaption(e.target.value);
                setDirty(true);
              }}
            />
          </div>

          <label className="flex items-center gap-2 text-xs text-charcoal/60">
            <input
              type="checkbox"
              disabled={!isEditable}
              checked={adjustPerPlatform}
              onChange={(e) => {
                setAdjustPerPlatform(e.target.checked);
                setDirty(true);
              }}
            />
            Adjust caption for each platform
          </label>

          {adjustPerPlatform && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label">Facebook caption override</label>
                <textarea
                  className="input min-h-[90px]"
                  disabled={!isEditable}
                  placeholder="Leave blank to use the caption above"
                  value={captionFacebook}
                  onChange={(e) => {
                    setCaptionFacebook(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
              <div>
                <label className="label">Instagram caption override</label>
                <textarea
                  className="input min-h-[90px]"
                  disabled={!isEditable}
                  placeholder="Leave blank to use the caption above"
                  value={captionInstagram}
                  onChange={(e) => {
                    setCaptionInstagram(e.target.value);
                    setDirty(true);
                  }}
                />
              </div>
            </div>
          )}

          <div>
            <label className="label">Platforms</label>
            <div className="flex gap-3">
              {PLATFORM_OPTIONS.map((opt) => (
                <label key={opt.value} className="flex items-center gap-2 text-sm text-charcoal">
                  <input type="checkbox" disabled={!isEditable} checked={platforms.has(opt.value)} onChange={() => togglePlatform(opt.value)} />
                  {opt.label}
                  {opt.value === "facebook" && !facebookConnected && <span className="text-xs text-charcoal/40">(not connected)</span>}
                  {opt.value === "instagram" && !instagramConnected && <span className="text-xs text-charcoal/40">(not connected)</span>}
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="label">Photo or video</label>
            {media ? (
              <div className="flex items-start gap-3">
                {media.mediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media.url} alt={media.altText ?? ""} className="h-28 w-28 rounded-lg object-cover" />
                ) : (
                  <video src={media.url} className="h-28 w-28 rounded-lg object-cover" controls />
                )}
                <div className="flex flex-col gap-2">
                  {isEditable && (
                    <button type="button" className="btn-ghost text-xs" onClick={() => fileInputRef.current?.click()}>
                      Replace
                    </button>
                  )}
                  {isEditable && (
                    <button
                      type="button"
                      className="btn-ghost text-xs text-status-action"
                      onClick={() =>
                        startTransition(async () => {
                          await removePostMedia(media.id, post.id);
                          router.refresh();
                        })
                      }
                    >
                      Remove
                    </button>
                  )}
                </div>
              </div>
            ) : (
              isEditable && (
                <button type="button" className="btn-ghost" onClick={() => fileInputRef.current?.click()}>
                  {pending ? "Uploading…" : "Add a photo or video"}
                </button>
              )
            )}
            <input ref={fileInputRef} type="file" accept="image/png,image/jpeg,image/webp,video/mp4,video/quicktime" className="hidden" onChange={handleFileChange} />
            <p className="mt-1 text-xs text-charcoal/40">One photo or video per post for now — carousels aren&apos;t supported yet.</p>
            {uploadMessages.length > 0 && (
              <ul className="mt-1 list-inside list-disc text-xs text-status-action">
                {uploadMessages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            )}
          </div>

          {media && <PhotoPermissionReview postId={post.id} media={media} />}

          {media && media.taggedChildren.length > 0 && (
            <label className="flex items-start gap-2 text-sm text-charcoal">
              <input
                type="checkbox"
                className="mt-0.5"
                checked={post.photoPermissionReviewed}
                disabled={media.taggedChildren.some((t) => !t.consentConfirmed)}
                onChange={(e) =>
                  startTransition(async () => {
                    try {
                      await setPhotoPermissionReviewed(post.id, e.target.checked);
                      router.refresh();
                    } catch (err) {
                      setSaveError(err instanceof Error ? err.message : "Could not save.");
                    }
                  })
                }
              />
              <span>
                Photo permissions checked
                <span className="block text-xs font-normal text-charcoal/50">
                  Confirm every tagged child above before ticking this — required before scheduling.
                </span>
              </span>
            </label>
          )}

          {saveError && <p className="text-xs text-status-action">{saveError}</p>}

          <div className="flex justify-end gap-2">
            {isEditable && (
              <button type="button" className="btn-ghost text-status-action" onClick={() => startTransition(async () => { await deleteDraftPost(post.id); router.push("/marketing/drafts"); })}>
                Delete
              </button>
            )}
            {isEditable && (
              <button type="button" disabled={!dirty || pending} className="btn-primary" onClick={() => startTransition(saveContent)}>
                {pending ? "Saving…" : "Save draft"}
              </button>
            )}
          </div>
        </div>

        {post.platformResults.length > 0 && (
          <div className="card flex flex-col gap-3 p-5">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Publish status</h2>
            {post.platformResults.map((r) => (
              <div key={r.platform} className="flex items-center justify-between gap-3 rounded-lg border border-charcoal/10 px-3 py-2">
                <div>
                  <p className="text-sm font-medium text-charcoal">{r.platform === "facebook" ? "Facebook" : "Instagram"}</p>
                  {r.errorMessage && <p className="text-xs text-status-action">{r.errorMessage}</p>}
                  {r.externalPermalink && (
                    <a href={r.externalPermalink} target="_blank" rel="noreferrer" className="text-xs text-ocean-600 hover:underline">
                      View post ↗
                    </a>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <MarketingPlatformResultBadge status={r.status} />
                  {r.status === "failed" && (
                    <button
                      type="button"
                      disabled={pending}
                      className="btn-ghost text-xs"
                      onClick={() => startTransition(async () => { await retryFailedPlatform(post.id, r.platform); router.refresh(); })}
                    >
                      Retry
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex flex-col gap-5">
        <div className="card flex flex-col gap-3 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Preview</h2>
          {platforms.has("facebook") && (
            <div className="rounded-lg border border-charcoal/10 p-3">
              <p className="mb-1 text-xs font-semibold text-ocean-600">Facebook</p>
              {media && (media.mediaType === "image" ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={media.url} alt="" className="mb-2 max-h-48 w-full rounded object-cover" />
              ) : (
                <video src={media.url} className="mb-2 max-h-48 w-full rounded object-cover" controls />
              ))}
              <p className="whitespace-pre-wrap text-sm text-charcoal/80">{(adjustPerPlatform && captionFacebook) || caption || "(no caption yet)"}</p>
            </div>
          )}
          {platforms.has("instagram") && (
            <div className="rounded-lg border border-charcoal/10 p-3">
              <p className="mb-1 text-xs font-semibold text-burgundy-500">Instagram</p>
              {media ? (
                media.mediaType === "image" ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={media.url} alt="" className="mb-2 max-h-48 w-full rounded object-cover" />
                ) : (
                  <video src={media.url} className="mb-2 max-h-48 w-full rounded object-cover" controls />
                )
              ) : (
                <p className="mb-2 text-xs text-status-action">Instagram needs a photo or video.</p>
              )}
              <p className="whitespace-pre-wrap text-sm text-charcoal/80">{(adjustPerPlatform && captionInstagram) || caption || "(no caption yet)"}</p>
            </div>
          )}
        </div>

        <div className="card flex flex-col gap-3 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Status</h2>
          <MarketingPostStatusBadge status={post.status} />

          {isEditable && (
            <>
              <div>
                <label className="label">Schedule for</label>
                <div className="flex gap-2">
                  <input type="date" className="input" value={scheduleDate} onChange={(e) => setScheduleDate(e.target.value)} />
                  <input type="time" className="input" value={scheduleTime} onChange={(e) => setScheduleTime(e.target.value)} />
                </div>
                <p className="mt-1 text-xs text-charcoal/40">Pacific/Auckland time.</p>
              </div>

              <button
                type="button"
                disabled={pending || !scheduleDate}
                className="btn-primary"
                onClick={() =>
                  startTransition(async () => {
                    setSaveError(null);
                    try {
                      if (dirty) await saveContent();
                      await schedulePost(post.id, nzWallTimeToUtcIso(scheduleDate, scheduleTime));
                      router.refresh();
                    } catch (err) {
                      setSaveError(err instanceof Error ? err.message : "Could not schedule this post.");
                    }
                  })
                }
              >
                Schedule
              </button>
              <button
                type="button"
                disabled={pending}
                className="btn-ghost"
                onClick={() =>
                  startTransition(async () => {
                    setSaveError(null);
                    try {
                      if (dirty) await saveContent();
                      await publishPostNow(post.id);
                      router.refresh();
                    } catch (err) {
                      setSaveError(err instanceof Error ? err.message : "Could not publish this post.");
                    }
                  })
                }
              >
                Publish now
              </button>
            </>
          )}

          {post.status === "scheduled" && (
            <>
              <p className="text-sm text-charcoal/70">Scheduled for {post.scheduledAt ? formatNzDateTime(post.scheduledAt) : "—"}.</p>
              <button
                type="button"
                disabled={pending}
                className="btn-ghost"
                onClick={() => startTransition(async () => { await cancelScheduledPost(post.id); router.refresh(); })}
              >
                Cancel schedule
              </button>
            </>
          )}

          {post.status === "published" && post.publishedAt && (
            <p className="text-sm text-charcoal/70">Published {formatNzDateTime(post.publishedAt)}.</p>
          )}
        </div>
      </div>
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import {
  uploadStoryMedia,
  updateMediaCaption,
  reorderStoryMedia,
  removeStoryMedia,
} from "@/lib/actions/learning-stories";
import { UploadIcon, TrashIcon } from "@/components/icons";
import { formatFileSize } from "@/lib/utils";
import type { LearningStoryMedia } from "@/lib/types";

/** Photos, video and PDFs live here as one pool for the story — upload,
 * caption, reorder and remove all happen here, independently of where (or
 * whether) each item is actually placed in the story layout below. Up/down
 * buttons rather than drag-and-drop: fewer moving parts, works the same on
 * a tablet as a desktop. */
export function MediaManager({
  storyId,
  media,
  onChange,
}: {
  storyId: string;
  media: LearningStoryMedia[];
  onChange: (media: LearningStoryMedia[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setError(null);
    Array.from(files).forEach((file) => {
      const formData = new FormData();
      formData.set("file", file);
      startTransition(async () => {
        const result = await uploadStoryMedia(storyId, formData);
        if (!result.success) {
          setError(result.error);
          return;
        }
        onChange([
          ...media,
          {
            id: result.mediaId,
            story_id: storyId,
            storage_path: "",
            original_filename: file.name,
            mime_type: file.type || null,
            file_size_bytes: file.size,
            kind: file.type.startsWith("image/") ? "image" : file.type.startsWith("video/") ? "video" : "pdf",
            caption: null,
            sort_order: media.length,
            uploaded_by_name: null,
            uploaded_at: new Date().toISOString(),
            url: result.url,
          },
        ]);
      });
    });
    if (inputRef.current) inputRef.current.value = "";
  }

  function move(index: number, direction: -1 | 1) {
    const next = [...media];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
    startTransition(async () => {
      await reorderStoryMedia(storyId, next.map((m) => m.id));
    });
  }

  function updateCaption(mediaId: string, caption: string) {
    onChange(media.map((m) => (m.id === mediaId ? { ...m, caption } : m)));
  }

  function saveCaption(mediaId: string, caption: string) {
    startTransition(async () => {
      await updateMediaCaption(mediaId, storyId, caption);
    });
  }

  function remove(mediaId: string) {
    onChange(media.filter((m) => m.id !== mediaId));
    startTransition(async () => {
      await removeStoryMedia(mediaId, storyId);
    });
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" className="btn-secondary" disabled={pending} onClick={() => inputRef.current?.click()}>
          <UploadIcon className="h-4 w-4" />
          {pending ? "Uploading…" : "Add photos, video or PDF"}
        </button>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/png,image/jpeg,image/jpg,image/webp,image/heic,image/heif,video/mp4,video/webm,video/quicktime,application/pdf"
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
        <p className="text-xs text-charcoal/40">Photos, video (from a computer or a mobile camera roll) and PDFs.</p>
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

      {media.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {media.map((m, index) => (
            <div key={m.id} className="flex gap-3 rounded-xl border border-charcoal/10 p-2.5">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-sand-100">
                {m.kind === "image" && m.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={m.url} alt="" className="h-full w-full object-cover" />
                ) : (
                  <span className="text-[10px] uppercase text-charcoal/40">{m.kind}</span>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col gap-1">
                <p className="truncate text-xs text-charcoal/50">
                  {m.original_filename} · {formatFileSize(m.file_size_bytes)}
                </p>
                <input
                  type="text"
                  className="input px-2 py-1 text-xs"
                  placeholder="Optional caption"
                  value={m.caption ?? ""}
                  onChange={(e) => updateCaption(m.id, e.target.value)}
                  onBlur={(e) => saveCaption(m.id, e.target.value)}
                />
              </div>
              <div className="flex shrink-0 flex-col items-center gap-1">
                <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-xs text-charcoal/40 hover:text-charcoal disabled:opacity-30">
                  ↑
                </button>
                <button type="button" onClick={() => move(index, 1)} disabled={index === media.length - 1} className="text-xs text-charcoal/40 hover:text-charcoal disabled:opacity-30">
                  ↓
                </button>
                <button type="button" onClick={() => remove(m.id)} className="text-status-action hover:opacity-70">
                  <TrashIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

"use client";

import { randomId } from "@/lib/utils";
import { RichTextBlock } from "./rich-text-block";
import { TrashIcon } from "@/components/icons";
import type { LearningStoryBlock, LearningStoryMedia } from "@/lib/types";

const BLOCK_LABELS: Record<LearningStoryBlock["type"], string> = {
  heading: "Heading",
  paragraph: "Text",
  image: "Large image",
  image_pair: "Two images side by side",
  video: "Video",
  pdf: "PDF",
};

function newBlock(type: LearningStoryBlock["type"]): LearningStoryBlock {
  const id = randomId();
  switch (type) {
    case "heading":
      return { id, type, text: "", level: 2 };
    case "paragraph":
      return { id, type, html: "" };
    case "image":
      return { id, type, mediaId: null };
    case "image_pair":
      return { id, type, mediaIds: [null, null] };
    case "video":
      return { id, type, mediaId: null };
    case "pdf":
      return { id, type, mediaId: null };
  }
}

function MediaPicker({
  media,
  kind,
  value,
  onChange,
}: {
  media: LearningStoryMedia[];
  kind: "image" | "video" | "pdf";
  value: string | null;
  onChange: (mediaId: string | null) => void;
}) {
  const options = media.filter((m) => m.kind === kind);
  const selected = options.find((m) => m.id === value);

  return (
    <div className="flex flex-col gap-2">
      <select className="input" value={value ?? ""} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">
          {options.length === 0 ? `No ${kind}s uploaded yet — add some above first` : `Choose a ${kind}…`}
        </option>
        {options.map((m) => (
          <option key={m.id} value={m.id}>
            {m.caption || m.original_filename}
          </option>
        ))}
      </select>
      {selected && kind === "image" && selected.url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={selected.url} alt={selected.caption ?? ""} className="max-h-56 w-full rounded-lg object-cover" />
      )}
      {selected && kind === "video" && selected.url && (
        <video src={selected.url} controls className="max-h-56 w-full rounded-lg" />
      )}
      {selected && kind === "pdf" && (
        <p className="rounded-lg bg-sand-50 px-3 py-2 text-xs text-charcoal/60">📄 {selected.original_filename}</p>
      )}
      {selected?.caption && <p className="text-xs italic text-charcoal/50">{selected.caption}</p>}
    </div>
  );
}

export function BlockEditor({
  blocks,
  media,
  onChange,
}: {
  blocks: LearningStoryBlock[];
  media: LearningStoryMedia[];
  onChange: (blocks: LearningStoryBlock[]) => void;
}) {
  function updateBlock(id: string, next: LearningStoryBlock) {
    onChange(blocks.map((b) => (b.id === id ? next : b)));
  }

  function removeBlock(id: string) {
    onChange(blocks.filter((b) => b.id !== id));
  }

  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= blocks.length) return;
    const next = [...blocks];
    [next[index], next[target]] = [next[target], next[index]];
    onChange(next);
  }

  function addBlock(type: LearningStoryBlock["type"]) {
    onChange([...blocks, newBlock(type)]);
  }

  return (
    <div className="flex flex-col gap-4">
      {blocks.length === 0 && (
        <p className="rounded-lg bg-sand-50 px-3 py-3 text-sm text-charcoal/50">
          Nothing here yet — add a block below to start telling the story. Large image, then text, then two images,
          then more text is a nice rhythm, but there's no fixed layout to follow.
        </p>
      )}

      {blocks.map((block, index) => (
        <div key={block.id} className="rounded-xl border border-charcoal/10 p-4">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-charcoal/40">
              {BLOCK_LABELS[block.type]}
            </span>
            <div className="flex items-center gap-2">
              <button type="button" onClick={() => move(index, -1)} disabled={index === 0} className="text-xs text-charcoal/40 hover:text-charcoal disabled:opacity-30">
                ↑
              </button>
              <button type="button" onClick={() => move(index, 1)} disabled={index === blocks.length - 1} className="text-xs text-charcoal/40 hover:text-charcoal disabled:opacity-30">
                ↓
              </button>
              <button type="button" onClick={() => removeBlock(block.id)} className="text-status-action hover:opacity-70">
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>

          {block.type === "heading" && (
            <div className="flex gap-2">
              <select
                className="input w-24"
                value={block.level}
                onChange={(e) => updateBlock(block.id, { ...block, level: Number(e.target.value) as 2 | 3 })}
              >
                <option value={2}>Large</option>
                <option value={3}>Small</option>
              </select>
              <input
                type="text"
                className="input flex-1"
                placeholder="Heading text"
                value={block.text}
                onChange={(e) => updateBlock(block.id, { ...block, text: e.target.value })}
              />
            </div>
          )}

          {block.type === "paragraph" && (
            <RichTextBlock html={block.html} onChange={(html) => updateBlock(block.id, { ...block, html })} />
          )}

          {block.type === "image" && (
            <MediaPicker media={media} kind="image" value={block.mediaId} onChange={(mediaId) => updateBlock(block.id, { ...block, mediaId })} />
          )}

          {block.type === "image_pair" && (
            <div className="grid grid-cols-2 gap-3">
              {[0, 1].map((slot) => (
                <MediaPicker
                  key={slot}
                  media={media}
                  kind="image"
                  value={block.mediaIds[slot] ?? null}
                  onChange={(mediaId) => {
                    const nextIds = [...block.mediaIds];
                    nextIds[slot] = mediaId;
                    updateBlock(block.id, { ...block, mediaIds: nextIds });
                  }}
                />
              ))}
            </div>
          )}

          {block.type === "video" && (
            <MediaPicker media={media} kind="video" value={block.mediaId} onChange={(mediaId) => updateBlock(block.id, { ...block, mediaId })} />
          )}

          {block.type === "pdf" && (
            <MediaPicker media={media} kind="pdf" value={block.mediaId} onChange={(mediaId) => updateBlock(block.id, { ...block, mediaId })} />
          )}
        </div>
      ))}

      <div className="flex flex-wrap gap-2 border-t border-charcoal/10 pt-4">
        {(Object.keys(BLOCK_LABELS) as LearningStoryBlock["type"][]).map((type) => (
          <button key={type} type="button" onClick={() => addBlock(type)} className="btn-ghost text-xs">
            + {BLOCK_LABELS[type]}
          </button>
        ))}
      </div>
    </div>
  );
}

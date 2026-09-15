"use client";

import { useEffect, useRef, useState } from "react";
import { extractHazardCheckFromPhoto } from "@/lib/actions/hazard-checks";
import { BatchHazardCheckCard } from "./batch-hazard-check-card";
import { randomId } from "@/lib/utils";
import type { HazardCheckDraft, HazardChecklistTemplateItem, RosterRoom, StaffMember } from "@/lib/types";

type QueueItem = {
  id: string;
  file: File;
  previewUrl: string;
  status: "pending" | "extracting" | "ready" | "error";
  draft?: HazardCheckDraft;
  error?: string;
  notConfigured?: boolean;
};

/** Upload photos of several completed, signed Daily Hazard Checklists at
 * once — each becomes its own card below with its own draft (room, date,
 * ticked items and hazard log) to review, confirm and save independently.
 * Mirrors Accident & Illness's PhotoBatchImportPanel exactly, including
 * reading photos one at a time rather than in parallel. */
export function HazardPhotoBatchImportPanel({
  rooms,
  templatesByRoom,
  staff,
}: {
  rooms: RosterRoom[];
  templatesByRoom: Record<string, HazardChecklistTemplateItem[]>;
  staff: StaffMember[];
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [items, setItems] = useState<QueueItem[]>([]);
  const processingRef = useRef(false);

  function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    const newItems: QueueItem[] = files.map((file) => ({
      id: randomId(),
      file,
      previewUrl: URL.createObjectURL(file),
      status: "pending",
    }));
    setItems((prev) => [...prev, ...newItems]);
    e.target.value = ""; // allow choosing the same file(s) again later
  }

  // Processes one pending item at a time, in the order they were added.
  useEffect(() => {
    if (processingRef.current) return;
    const next = items.find((i) => i.status === "pending");
    if (!next) return;

    processingRef.current = true;
    setItems((prev) => prev.map((i) => (i.id === next.id ? { ...i, status: "extracting" } : i)));

    const formData = new FormData();
    formData.set("file", next.file);

    extractHazardCheckFromPhoto(formData).then((result) => {
      setItems((prev) =>
        prev.map((i) =>
          i.id === next.id
            ? result.success
              ? { ...i, status: "ready", draft: result.draft }
              : { ...i, status: "error", error: result.error, notConfigured: result.notConfigured }
            : i
        )
      );
      processingRef.current = false;
    });
  }, [items]);

  function removeItem(id: string) {
    setItems((prev) => prev.filter((i) => i.id !== id));
  }

  const pendingOrExtracting = items.filter((i) => i.status === "pending" || i.status === "extracting");

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3 border-burgundy-100 bg-burgundy-50/40 p-4">
        <div className="flex items-center justify-between gap-2">
          <h2 className="font-display text-sm font-semibold text-charcoal">✨ Fill from photos</h2>
          <button type="button" className="btn-ghost" onClick={() => inputRef.current?.click()}>
            Choose photo{items.length > 0 ? "s" : ""}
          </button>
        </div>
        <p className="text-xs text-charcoal/50">
          Take photos of completed, signed Daily Hazard Checklists — one photo per room's checklist. Choose several
          at once for a stack of different rooms/days; each one gets read into its own draft below, including which
          room and date it&apos;s for, for you to check, confirm and save separately. Each photo is kept as that
          check&apos;s evidence automatically once saved.
        </p>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          multiple
          className="hidden"
          onChange={handleFilesSelected}
        />
        {pendingOrExtracting.length > 0 && (
          <p className="text-xs text-charcoal/50">
            Reading {pendingOrExtracting.length} photo{pendingOrExtracting.length > 1 ? "s" : ""}…
          </p>
        )}
      </div>

      {items.map((item) => {
        if (item.status === "pending" || item.status === "extracting") {
          return (
            <div key={item.id} className="card flex items-center gap-3 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-charcoal/10 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal">{item.file.name}</p>
                <p className="text-xs text-charcoal/50">{item.status === "extracting" ? "Reading…" : "Waiting…"}</p>
              </div>
              <button type="button" onClick={() => removeItem(item.id)} className="btn-ghost text-xs text-charcoal/50">
                Remove
              </button>
            </div>
          );
        }

        if (item.status === "error") {
          return (
            <div key={item.id} className="card flex items-center gap-3 border-status-action/20 p-3">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.previewUrl} alt="" className="h-12 w-12 shrink-0 rounded-lg border border-charcoal/10 object-cover" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-charcoal">{item.file.name}</p>
                <p className="text-xs text-status-action">
                  {item.error}
                  {!item.notConfigured && " You can still fill this one in by hand below."}
                </p>
              </div>
              <button type="button" onClick={() => removeItem(item.id)} className="btn-ghost text-xs text-charcoal/50">
                Remove
              </button>
            </div>
          );
        }

        return (
          <BatchHazardCheckCard
            key={item.id}
            file={item.file}
            previewUrl={item.previewUrl}
            draft={item.draft!}
            rooms={rooms}
            templatesByRoom={templatesByRoom}
            staff={staff}
            onRemove={() => removeItem(item.id)}
          />
        );
      })}
    </div>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChildAvatar } from "./child-avatar";
import { uploadChildPhoto, removeChildPhoto } from "@/lib/actions/children";

export function ChildPhotoUpload({
  childId,
  fullName,
  roomColor,
  photoUrl,
}: {
  childId: string;
  fullName: string;
  roomColor: string | null;
  photoUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadChildPhoto(childId, formData);
      if (inputRef.current) inputRef.current.value = "";
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleRemove() {
    setError(null);
    startTransition(async () => {
      await removeChildPhoto(childId);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <ChildAvatar fullName={fullName} roomColor={roomColor} photoUrl={photoUrl} size="lg" />

      <div className="flex flex-col gap-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" className="btn-ghost" disabled={pending} onClick={() => inputRef.current?.click()}>
            {pending ? "Saving…" : photoUrl ? "Change photo" : "Upload photo"}
          </button>
          {photoUrl && (
            <button
              type="button"
              className="btn-ghost text-status-action hover:bg-status-actionBg"
              disabled={pending}
              onClick={handleRemove}
            >
              Remove photo
            </button>
          )}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleFileChange}
        />

        {error && <p className="text-xs text-status-action">{error}</p>}

        <p className="text-xs text-charcoal/40">
          JPG, PNG or WEBP. Only upload a real photo of this child, with parental/caregiver consent on file — it
          also appears on the Children &amp; Fees dashboard.
        </p>
      </div>
    </div>
  );
}

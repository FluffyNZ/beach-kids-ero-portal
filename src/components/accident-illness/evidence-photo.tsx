"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { attachAccidentIllnessEvidence } from "@/lib/actions/accident-illness";

/** Upload (or replace) the photo of the completed, signed paper form. This
 * photo — not any field in this app — is the actual legal record; the
 * digital fields are a searchable, filterable copy of what's on it. */
export function EvidencePhoto({ recordId, photoUrl }: { recordId: string; photoUrl: string | null }) {
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
      const result = await attachAccidentIllnessEvidence(recordId, formData);
      if (inputRef.current) inputRef.current.value = "";
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-3">
      {photoUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={photoUrl} alt="Signed accident & illness form" className="max-h-96 w-full rounded-lg border border-charcoal/10 object-contain" />
      ) : (
        <p className="text-sm text-charcoal/50">No photo of the signed paper form has been attached yet.</p>
      )}

      <div>
        <button type="button" className="btn-ghost" disabled={pending} onClick={() => inputRef.current?.click()}>
          {pending ? "Saving…" : photoUrl ? "Replace photo" : "Upload photo of signed form"}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/heic,application/pdf"
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {error && <p className="text-xs text-status-action">{error}</p>}

      <p className="text-xs text-charcoal/40">
        This is filed in the same private Evidence Library as everything else — take a photo of the completed,
        signed paper form once both signatures are on it.
      </p>
    </div>
  );
}

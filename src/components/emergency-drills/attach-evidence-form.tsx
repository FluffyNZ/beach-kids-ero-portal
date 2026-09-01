"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { attachDrillEvidence } from "@/lib/actions/emergency-drills";

/** The one manual step in the "auto-file as evidence" flow: browsers give a
 * page no way to reach into a print-to-PDF save the user just made, so once
 * they've saved the PDF from the Print button above, they pick that same
 * file here and it's filed as evidence and linked to HS8 automatically. */
export function AttachEvidenceForm({ drillId }: { drillId: string }) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await attachDrillEvidence(drillId, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.refresh();
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-3">
      <div>
        <label className="label" htmlFor="file">
          The PDF you just saved
        </label>
        <input
          id="file"
          name="file"
          type="file"
          required
          accept=".pdf"
          className="input file:mr-3 file:rounded-lg file:border-0 file:bg-ocean-100 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-ocean-700"
        />
      </div>
      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}
      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Filing…" : "File as evidence"}
        </button>
      </div>
    </form>
  );
}

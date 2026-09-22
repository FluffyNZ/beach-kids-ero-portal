"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { SignaturePad, type SignaturePadHandle } from "./signature-pad";
import { signInduction, clearInductionSignature } from "@/lib/actions/induction";
import { formatDateTime } from "@/lib/utils";

export function InductionSignBlock({
  staffId,
  who,
  label,
  helpText,
  signature,
}: {
  staffId: string;
  who: "staff" | "manager";
  label: string;
  helpText: string;
  signature: { name: string | null; url: string | null; signedAt: string | null };
}) {
  const router = useRouter();
  const padRef = useRef<SignaturePadHandle>(null);
  const [name, setName] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleSave() {
    setError(null);
    if (!name.trim()) {
      setError("Enter the name of the person signing.");
      return;
    }
    if (padRef.current?.isEmpty()) {
      setError("Please draw a signature before saving.");
      return;
    }
    startTransition(async () => {
      const blob = await padRef.current?.toBlob();
      if (!blob) {
        setError("Please draw a signature before saving.");
        return;
      }
      const formData = new FormData();
      formData.set("name", name.trim());
      formData.set("signature", blob, "signature.png");
      const result = await signInduction(staffId, who, formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  function handleClear() {
    setError(null);
    startTransition(async () => {
      await clearInductionSignature(staffId, who);
      router.refresh();
    });
  }

  if (signature.signedAt) {
    return (
      <div className="flex flex-col gap-2 rounded-xl border border-status-ready/30 bg-status-readyBg p-4">
        <p className="text-sm font-medium text-charcoal">{label} — signed</p>
        {signature.url && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={signature.url} alt={`${label} signature`} className="h-20 w-auto rounded-lg border border-charcoal/10 bg-white" />
        )}
        <p className="text-xs text-charcoal/60">
          {signature.name} · {formatDateTime(signature.signedAt)}
        </p>
        <button
          type="button"
          onClick={handleClear}
          disabled={pending}
          className="self-start text-xs font-medium text-charcoal/50 hover:text-charcoal disabled:opacity-50"
        >
          Clear and re-sign
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 rounded-xl border border-charcoal/10 p-4">
      <div>
        <p className="text-sm font-medium text-charcoal">{label}</p>
        <p className="text-xs text-charcoal/50">{helpText}</p>
      </div>
      <div>
        <label className="label" htmlFor={`${who}-signature-name`}>
          Full name
        </label>
        <input
          id={`${who}-signature-name`}
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Print name"
        />
      </div>
      <SignaturePad ref={padRef} />
      {error && <p className="text-xs text-status-action">{error}</p>}
      <button type="button" onClick={handleSave} disabled={pending} className="btn-primary self-start">
        {pending ? "Saving…" : "Sign"}
      </button>
    </div>
  );
}

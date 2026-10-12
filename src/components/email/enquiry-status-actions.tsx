"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { updateFamilyEnquiryStatus } from "@/lib/actions/email";

/** "Mark converted" / "Dismiss" for one open enquiry — purely a status
 * change on the family_enquiries row (see migration 0050's comment on that
 * table). Marking one "converted" is just a label for Ethan's own tracking;
 * it does NOT create a real child record — he still adds the actual
 * enrolment the normal way via "Add child" once they're genuinely signed up,
 * same as the brief describes. */
export function EnquiryStatusActions({ enquiryId }: { enquiryId: string }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function setStatus(status: "converted" | "dismissed") {
    setError(null);
    startTransition(async () => {
      const result = await updateFamilyEnquiryStatus(enquiryId, status);
      if (!result.success) {
        setError(result.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex shrink-0 gap-1.5">
        <button type="button" disabled={pending} className="btn-ghost px-2.5 py-1 text-xs" onClick={() => setStatus("dismissed")}>
          Dismiss
        </button>
        <button type="button" disabled={pending} className="btn-secondary px-2.5 py-1 text-xs" onClick={() => setStatus("converted")}>
          Mark converted
        </button>
      </div>
      {error && <p className="max-w-[14rem] text-right text-xs text-status-action">{error}</p>}
    </div>
  );
}

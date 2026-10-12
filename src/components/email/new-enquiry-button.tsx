"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { createFamilyEnquiry, type CreateEnquiryResult } from "@/lib/actions/email";
import type { PotentialDuplicateFamily, RosterRoom } from "@/lib/types";
import { PlusIcon } from "@/components/icons";

type Duplicates = PotentialDuplicateFamily[];

/** "New enquiry" — the entry point for a prospective family who isn't in
 * the system at all yet (see migration 0050's comment on family_enquiries
 * for why this is its own table rather than a real `children` row). Checks
 * for a likely-existing family first (createFamilyEnquiry's built-in
 * findPotentialDuplicateFamilies check) and shows what it found before
 * creating anything — "Create anyway" re-submits with force so a genuinely
 * new family with a common name is never blocked, just double-checked. */
export function NewEnquiryButton({ rooms }: { rooms: RosterRoom[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [duplicates, setDuplicates] = useState<Duplicates | null>(null);

  const [childFullName, setChildFullName] = useState("");
  const [parentFullName, setParentFullName] = useState("");
  const [parentEmail, setParentEmail] = useState("");
  const [parentPhone, setParentPhone] = useState("");
  const [intendedRoomId, setIntendedRoomId] = useState("");
  const [intendedStartDate, setIntendedStartDate] = useState("");
  const [notes, setNotes] = useState("");

  function reset() {
    setChildFullName("");
    setParentFullName("");
    setParentEmail("");
    setParentPhone("");
    setIntendedRoomId("");
    setIntendedStartDate("");
    setNotes("");
    setError(null);
    setDuplicates(null);
  }

  function submit(force: boolean) {
    setError(null);
    startTransition(async () => {
      const result: CreateEnquiryResult = await createFamilyEnquiry(
        {
          childFullName,
          parentFullName,
          parentEmail,
          parentPhone: parentPhone || null,
          intendedRoomId: intendedRoomId || null,
          intendedStartDate: intendedStartDate || null,
          notes: notes || null,
        },
        { force }
      );

      if (result.success) {
        setOpen(false);
        reset();
        router.refresh();
        return;
      }
      if ("duplicates" in result) {
        setDuplicates(result.duplicates);
        return;
      }
      setError(result.error);
    });
  }

  return (
    <>
      <button
        type="button"
        className="btn-secondary"
        onClick={() => {
          reset();
          setOpen(true);
        }}
      >
        <PlusIcon className="h-4 w-4" />
        New enquiry
      </button>

      <Modal
        open={open}
        onClose={() => {
          setOpen(false);
          reset();
        }}
        title="New enquiry"
      >
        {duplicates && duplicates.length > 0 ? (
          <div className="flex flex-col gap-4">
            <p className="text-sm text-charcoal/70">
              This looks like it might already be a family on file — have a look before creating a new one:
            </p>
            <div className="flex flex-col gap-2 rounded-lg border border-status-attention/30 bg-status-attentionBg p-3">
              {duplicates.map((d) => (
                <div key={`${d.kind}-${d.id}`} className="text-sm text-charcoal">
                  <span className="font-medium">{d.parent_name}</span>
                  {d.email ? ` · ${d.email}` : ""}
                  {d.childNames.length > 0 ? ` · ${d.childNames.join(", ")}` : ""}
                  <span className="ml-1 text-xs text-charcoal/50">
                    {d.kind === "bill_payer" ? "(existing family)" : "(existing enquiry)"}
                  </span>
                </div>
              ))}
            </div>
            {error && <p className="text-sm text-status-action">{error}</p>}
            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setDuplicates(null)}>
                Go back
              </button>
              <button type="button" disabled={pending} className="btn-primary" onClick={() => submit(true)}>
                {pending ? "Creating…" : "Create anyway"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div>
              <label className="label">Child&apos;s name</label>
              <input className="input" value={childFullName} onChange={(e) => setChildFullName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Parent/guardian name</label>
                <input className="input" value={parentFullName} onChange={(e) => setParentFullName(e.target.value)} />
              </div>
              <div>
                <label className="label">Parent/guardian email</label>
                <input type="email" className="input" value={parentEmail} onChange={(e) => setParentEmail(e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Phone (optional)</label>
                <input className="input" value={parentPhone} onChange={(e) => setParentPhone(e.target.value)} />
              </div>
              <div>
                <label className="label">Intended start date (optional)</label>
                <input
                  type="date"
                  className="input"
                  value={intendedStartDate}
                  onChange={(e) => setIntendedStartDate(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="label">Intended room (optional)</label>
              <select className="input" value={intendedRoomId} onChange={(e) => setIntendedRoomId(e.target.value)}>
                <option value="">Not set</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Notes (optional)</label>
              <textarea className="input" rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>

            {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

            <div className="flex justify-end gap-2">
              <button type="button" className="btn-ghost" onClick={() => setOpen(false)}>
                Cancel
              </button>
              <button
                type="button"
                disabled={pending || !childFullName.trim() || !parentFullName.trim() || !parentEmail.trim()}
                className="btn-primary"
                onClick={() => submit(false)}
              >
                {pending ? "Checking…" : "Add enquiry"}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

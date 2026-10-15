"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { StaffContactForm } from "./staff-contact-form";
import { StaffProfileForm } from "./staff-profile-form";
import { EditIcon } from "@/components/icons";
import { formatDate } from "@/lib/utils";
import type { UpdateStaffDetailsFields } from "@/lib/actions/staff";

function Row({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">{label}</p>
      <p className="mt-0.5 text-sm text-charcoal">
        {value || <span className="text-charcoal/40">Not recorded</span>}
      </p>
    </div>
  );
}

/** Overview's read-only "Personal & contact" card, with a small Edit button
 * that swaps in the real StaffContactForm in place (no permanent textboxes
 * sitting open on the page) — and, underneath, the legacy free-text "notes"
 * field with its own independent edit toggle, since it saves via the same
 * action but isn't part of the contact fields themselves. Both toggles
 * refresh the page's server data on save so the view mode they fall back to
 * is never stale. */
export function StaffContactSection({
  staffId,
  email,
  mobilePhone,
  dateOfBirth,
  emergencyContactName,
  emergencyContactPhone,
  emergencyContactRelationship,
  notes,
  onSave,
}: {
  staffId: string;
  email: string | null;
  mobilePhone: string | null;
  dateOfBirth: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  notes: string | null;
  onSave: (fields: UpdateStaffDetailsFields) => Promise<void>;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const [editingContact, setEditingContact] = useState(false);
  const [editingNotes, setEditingNotes] = useState(false);

  async function handleSaveContact(fields: Parameters<typeof onSave>[0]) {
    await onSave(fields);
    startTransition(() => router.refresh());
    setEditingContact(false);
  }

  async function handleSaveNotes(fields: { notes?: string | null }) {
    await onSave(fields);
    startTransition(() => router.refresh());
    setEditingNotes(false);
  }

  const emergencyContact = emergencyContactName
    ? [emergencyContactName, emergencyContactPhone, emergencyContactRelationship].filter(Boolean).join(" · ")
    : null;

  return (
    <section className="card p-5">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">Personal &amp; contact</h2>
        {!editingContact && (
          <button
            type="button"
            className="flex items-center gap-1 text-xs font-medium text-burgundy-600 hover:underline"
            onClick={() => setEditingContact(true)}
          >
            <EditIcon className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      {editingContact ? (
        <div className="flex flex-col gap-3">
          <StaffContactForm
            email={email}
            mobilePhone={mobilePhone}
            dateOfBirth={dateOfBirth}
            emergencyContactName={emergencyContactName}
            emergencyContactPhone={emergencyContactPhone}
            emergencyContactRelationship={emergencyContactRelationship}
            onSave={handleSaveContact}
          />
          <button type="button" className="self-start text-xs text-charcoal/50 hover:underline" onClick={() => setEditingContact(false)}>
            Cancel
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-x-4 gap-y-3 sm:grid-cols-2">
          <Row label="Email" value={email} />
          <Row label="Mobile" value={mobilePhone} />
          <Row label="Date of birth" value={dateOfBirth ? formatDate(dateOfBirth) : null} />
          <Row label="Emergency contact" value={emergencyContact} />
        </div>
      )}

      <div className="mt-4 border-t border-charcoal/5 pt-4">
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-medium uppercase tracking-wide text-charcoal/40">Other notes</p>
          {!editingNotes && (
            <button
              type="button"
              className="flex items-center gap-1 text-xs font-medium text-burgundy-600 hover:underline"
              onClick={() => setEditingNotes(true)}
            >
              <EditIcon className="h-3.5 w-3.5" />
              Edit
            </button>
          )}
        </div>
        {editingNotes ? (
          <div className="flex flex-col gap-3">
            <StaffProfileForm notes={notes} onSave={handleSaveNotes} />
            <button type="button" className="self-start text-xs text-charcoal/50 hover:underline" onClick={() => setEditingNotes(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <p className="whitespace-pre-wrap text-sm text-charcoal">
            {notes || <span className="text-charcoal/40">Not recorded</span>}
          </p>
        )}
      </div>
    </section>
  );
}

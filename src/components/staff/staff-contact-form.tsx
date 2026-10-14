"use client";

import { useState, useTransition } from "react";

export function StaffContactForm({
  email: initialEmail,
  mobilePhone: initialMobilePhone,
  dateOfBirth: initialDateOfBirth,
  emergencyContactName: initialEmergencyContactName,
  emergencyContactPhone: initialEmergencyContactPhone,
  emergencyContactRelationship: initialEmergencyContactRelationship,
  onSave,
}: {
  email: string | null;
  mobilePhone: string | null;
  dateOfBirth: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelationship: string | null;
  onSave: (fields: {
    email?: string | null;
    mobile_phone?: string | null;
    date_of_birth?: string | null;
    emergency_contact_name?: string | null;
    emergency_contact_phone?: string | null;
    emergency_contact_relationship?: string | null;
  }) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [email, setEmail] = useState(initialEmail ?? "");
  const [mobilePhone, setMobilePhone] = useState(initialMobilePhone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(initialDateOfBirth ?? "");
  const [emergencyName, setEmergencyName] = useState(initialEmergencyContactName ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(initialEmergencyContactPhone ?? "");
  const [emergencyRelationship, setEmergencyRelationship] = useState(initialEmergencyContactRelationship ?? "");

  function markDirty() {
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Personal &amp; contact</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div>
            <label className="label">Mobile</label>
            <input
              type="tel"
              className="input"
              placeholder="e.g. 021 123 4567"
              value={mobilePhone}
              onChange={(e) => {
                setMobilePhone(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div>
            <label className="label">Date of birth</label>
            <input
              type="date"
              className="input"
              value={dateOfBirth}
              onChange={(e) => {
                setDateOfBirth(e.target.value);
                markDirty();
              }}
            />
            <p className="mt-1 text-xs text-charcoal/40">Used to show birthdays on the centre calendar.</p>
          </div>
        </div>
      </div>

      <div>
        <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Emergency contact</h3>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div>
            <label className="label">Name</label>
            <input
              className="input"
              value={emergencyName}
              onChange={(e) => {
                setEmergencyName(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div>
            <label className="label">Phone</label>
            <input
              type="tel"
              className="input"
              value={emergencyPhone}
              onChange={(e) => {
                setEmergencyPhone(e.target.value);
                markDirty();
              }}
            />
          </div>
          <div>
            <label className="label">Relationship</label>
            <input
              className="input"
              placeholder="e.g. Partner, Parent"
              value={emergencyRelationship}
              onChange={(e) => {
                setEmergencyRelationship(e.target.value);
                markDirty();
              }}
            />
          </div>
        </div>
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          className="btn-primary"
          onClick={() =>
            startTransition(async () => {
              setError(null);
              try {
                await onSave({
                  email: email || null,
                  mobile_phone: mobilePhone || null,
                  date_of_birth: dateOfBirth || null,
                  emergency_contact_name: emergencyName || null,
                  emergency_contact_phone: emergencyPhone || null,
                  emergency_contact_relationship: emergencyRelationship || null,
                });
                setSaved(true);
              } catch (err) {
                setSaved(false);
                setError(err instanceof Error ? err.message : "Something went wrong saving these details.");
              }
            })
          }
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

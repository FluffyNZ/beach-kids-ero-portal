"use client";

import { useState, useTransition } from "react";
import type { RosterRoom } from "@/lib/types";

export function ChildDetailsForm({
  fullName: initialFullName,
  gender: initialGender,
  ageYears: initialAgeYears,
  ageMonths: initialAgeMonths,
  residentialAddress: initialResidentialAddress,
  primaryContactEmail: initialPrimaryContactEmail,
  roomId: initialRoomId,
  roomNotes: initialRoomNotes,
  rooms,
  billPayerName: initialBillPayerName,
  billPayerUnlistedNote: initialBillPayerUnlistedNote,
  billPayerOptions,
  notes: initialNotes,
  onSave,
}: {
  fullName: string;
  gender: string | null;
  ageYears: number | null;
  ageMonths: number | null;
  residentialAddress: string | null;
  primaryContactEmail: string | null;
  roomId: string | null;
  roomNotes: string | null;
  rooms: RosterRoom[];
  billPayerName: string | null;
  billPayerUnlistedNote: string | null;
  billPayerOptions: Array<{ id: string; full_name: string }>;
  notes: string | null;
  onSave: (fields: {
    full_name?: string;
    gender?: string | null;
    age_years?: number | null;
    age_months?: number | null;
    residential_address?: string | null;
    primary_contact_email?: string | null;
    room_id?: string | null;
    room_notes?: string | null;
    bill_payer_name?: string | null;
    bill_payer_unlisted_note?: string | null;
    notes?: string | null;
  }) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(initialFullName);
  const [gender, setGender] = useState(initialGender ?? "");
  const [ageYears, setAgeYears] = useState(initialAgeYears !== null ? String(initialAgeYears) : "");
  const [ageMonths, setAgeMonths] = useState(initialAgeMonths !== null ? String(initialAgeMonths) : "");
  const [residentialAddress, setResidentialAddress] = useState(initialResidentialAddress ?? "");
  const [primaryContactEmail, setPrimaryContactEmail] = useState(initialPrimaryContactEmail ?? "");
  const [roomId, setRoomId] = useState(initialRoomId ?? "");
  const [roomNotes, setRoomNotes] = useState(initialRoomNotes ?? "");
  const [billPayerName, setBillPayerName] = useState(initialBillPayerName ?? "");
  const [billPayerUnlistedNote, setBillPayerUnlistedNote] = useState(initialBillPayerUnlistedNote ?? "");
  const [notes, setNotes] = useState(initialNotes ?? "");

  function markDirty() {
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label">Full name</label>
        <input
          className="input"
          value={fullName}
          onChange={(e) => {
            setFullName(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div>
        <label className="label">Gender</label>
        <select
          className="input"
          value={gender}
          onChange={(e) => {
            setGender(e.target.value);
            markDirty();
          }}
        >
          <option value="">Not set</option>
          <option value="Female">Female</option>
          <option value="Male">Male</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="label">Age — years</label>
          <input
            type="number"
            min={0}
            className="input"
            value={ageYears}
            onChange={(e) => {
              setAgeYears(e.target.value);
              markDirty();
            }}
          />
        </div>
        <div>
          <label className="label">Age — months</label>
          <input
            type="number"
            min={0}
            max={11}
            className="input"
            value={ageMonths}
            onChange={(e) => {
              setAgeMonths(e.target.value);
              markDirty();
            }}
          />
        </div>
      </div>

      <div>
        <label className="label">Residential address</label>
        <input
          className="input"
          value={residentialAddress}
          onChange={(e) => {
            setResidentialAddress(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div>
        <label className="label">Primary contact email (PC1)</label>
        <input
          type="email"
          className="input"
          placeholder="If different from the bill payer"
          value={primaryContactEmail}
          onChange={(e) => {
            setPrimaryContactEmail(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div>
        <label className="label">Room</label>
        <select
          className="input"
          value={roomId}
          onChange={(e) => {
            setRoomId(e.target.value);
            markDirty();
          }}
        >
          <option value="">Not set</option>
          {rooms.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="label">Room notes</label>
        <input
          className="input"
          placeholder="e.g. shared between two rooms — leave blank if not needed"
          value={roomNotes}
          onChange={(e) => {
            setRoomNotes(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div>
        <label className="label">Bill payer</label>
        <input
          className="input"
          list="bill-payer-options-edit"
          value={billPayerName}
          onChange={(e) => {
            setBillPayerName(e.target.value);
            markDirty();
          }}
        />
        <datalist id="bill-payer-options-edit">
          {billPayerOptions.map((b) => (
            <option key={b.id} value={b.full_name} />
          ))}
        </datalist>
        <p className="mt-1 text-xs text-charcoal/40">
          Typing a name that matches an existing bill payer links to them — anything else creates a new one.
        </p>
      </div>

      <div>
        <label className="label">Bill payer note (e.g. if not confirmed yet)</label>
        <input
          className="input"
          placeholder="Leave blank once a bill payer is set"
          value={billPayerUnlistedNote}
          onChange={(e) => {
            setBillPayerUnlistedNote(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea
          className="input"
          rows={2}
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            markDirty();
          }}
        />
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
                  full_name: fullName,
                  gender: gender || null,
                  age_years: ageYears !== "" ? Number(ageYears) : null,
                  age_months: ageMonths !== "" ? Number(ageMonths) : null,
                  residential_address: residentialAddress || null,
                  primary_contact_email: primaryContactEmail || null,
                  room_id: roomId || null,
                  room_notes: roomNotes || null,
                  bill_payer_name: billPayerName,
                  bill_payer_unlisted_note: billPayerUnlistedNote || null,
                  notes: notes || null,
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

"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import { SaveStatus, FormError, useSaveState } from "@/components/ui/save-status";
import { ChildPhotoUpload } from "./child-photo-upload";
import { useProfileEdit } from "./child-profile-shell";
import { getCurrentAge } from "@/lib/age";
import { nzTodayDateString } from "@/lib/utils";
import type { RosterRoom } from "@/lib/types";

type DetailFields = {
  full_name?: string;
  gender?: string | null;
  age_years?: number | null;
  age_months?: number | null;
  date_of_birth?: string | null;
  residential_address?: string | null;
  primary_contact_email?: string | null;
  room_id?: string | null;
  room_notes?: string | null;
  bill_payer_name?: string | null;
  bill_payer_unlisted_note?: string | null;
  notes?: string | null;
  start_date?: string | null;
  leaving_date?: string | null;
};

export type ChildEditValues = {
  fullName: string;
  gender: string | null;
  /** The stored age snapshot (only meaningful when there's no date of birth). */
  ageYears: number | null;
  ageMonths: number | null;
  dateOfBirth: string | null;
  residentialAddress: string | null;
  primaryContactEmail: string | null;
  roomId: string | null;
  roomNotes: string | null;
  billPayerName: string | null;
  billPayerUnlistedNote: string | null;
  notes: string | null;
  startDate: string | null;
  leavingDate: string | null;
};

type FormState = {
  fullName: string;
  gender: string;
  ageYears: string;
  ageMonths: string;
  dateOfBirth: string;
  residentialAddress: string;
  primaryContactEmail: string;
  roomId: string;
  roomNotes: string;
  billPayerName: string;
  billPayerUnlistedNote: string;
  notes: string;
  startDate: string;
  leavingDate: string;
};

function toForm(v: ChildEditValues): FormState {
  return {
    fullName: v.fullName,
    gender: v.gender ?? "",
    ageYears: v.ageYears !== null ? String(v.ageYears) : "",
    ageMonths: v.ageMonths !== null ? String(v.ageMonths) : "",
    dateOfBirth: v.dateOfBirth ?? "",
    residentialAddress: v.residentialAddress ?? "",
    primaryContactEmail: v.primaryContactEmail ?? "",
    roomId: v.roomId ?? "",
    roomNotes: v.roomNotes ?? "",
    billPayerName: v.billPayerName ?? "",
    billPayerUnlistedNote: v.billPayerUnlistedNote ?? "",
    notes: v.notes ?? "",
    startDate: v.startDate ?? "",
    leavingDate: v.leavingDate ?? "",
  };
}

function same(a: FormState, b: FormState) {
  return (Object.keys(a) as (keyof FormState)[]).every((k) => a[k] === b[k]);
}

const fieldLabel = "mb-1.5 block text-sm font-medium text-charcoal";
const hint = "mt-1 text-xs text-charcoal/70";

function Section({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 border-b border-charcoal/10 pb-6 last:border-b-0 last:pb-0">
      <legend className="mb-1 text-base font-semibold text-charcoal">{title}</legend>
      {description && <p className="-mt-2 text-sm text-charcoal/70">{description}</p>}
      {children}
    </fieldset>
  );
}

/** The Edit profile drawer: the same fields (and the same save action) as
 * the old Overview form, grouped into sections. The photo saves on its own
 * as soon as it's chosen; everything else saves with "Save changes". */
export function ChildEditDrawer({
  childId,
  childName,
  roomColor,
  photoUrl,
  values,
  rooms,
  billPayerOptions,
  onSave,
}: {
  childId: string;
  childName: string;
  roomColor: string | null;
  photoUrl: string | null;
  values: ChildEditValues;
  rooms: RosterRoom[];
  billPayerOptions: Array<{ id: string; full_name: string }>;
  onSave: (fields: DetailFields) => Promise<void>;
}) {
  const router = useRouter();
  const { editOpen, closeEdit } = useProfileEdit();
  const saveState = useSaveState();
  const initialForm = useMemo(() => toForm(values), [values]);
  const [baseline, setBaseline] = useState<FormState>(initialForm);
  const [form, setForm] = useState<FormState>(initialForm);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  const dirty = !same(form, baseline);

  // Fresh values each time the drawer opens (e.g. after another tab saved).
  useEffect(() => {
    if (editOpen) {
      setBaseline(initialForm);
      setForm(initialForm);
      setConfirmDiscard(false);
      setValidation(null);
      saveState.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setConfirmDiscard(false);
    saveState.markDirty();
  }

  function requestClose() {
    if (dirty && saveState.state !== "saving") {
      setConfirmDiscard(true);
      return;
    }
    closeEdit();
  }

  const genderOptions = ["Female", "Male"];
  if (form.gender && !genderOptions.includes(form.gender)) genderOptions.push(form.gender);

  const dobAge = form.dateOfBirth ? getCurrentAge(form.dateOfBirth, new Date(`${nzTodayDateString()}T12:00:00Z`)) : null;

  function validate(): string | null {
    if (!form.fullName.trim()) return "Enter the child's full name.";
    if (form.dateOfBirth && form.dateOfBirth > nzTodayDateString()) return "The date of birth can't be in the future.";
    if (!form.dateOfBirth) {
      const y = form.ageYears === "" ? null : Number(form.ageYears);
      const m = form.ageMonths === "" ? null : Number(form.ageMonths);
      if (y !== null && (!Number.isInteger(y) || y < 0 || y > 18)) return "Estimated age (years) should be a whole number from 0 to 18.";
      if (m !== null && (!Number.isInteger(m) || m < 0 || m > 11)) return "Estimated age (months) should be a whole number from 0 to 11.";
    }
    if (form.startDate && form.leavingDate && form.leavingDate < form.startDate)
      return "The leaving date is before the start date.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = validate();
    setValidation(problem);
    if (problem) {
      saveState.setState("error");
      return;
    }

    const fields: DetailFields = {
      full_name: form.fullName.trim(),
      gender: form.gender || null,
      date_of_birth: form.dateOfBirth || null,
      residential_address: form.residentialAddress.trim() || null,
      primary_contact_email: form.primaryContactEmail.trim() || null,
      room_id: form.roomId || null,
      room_notes: form.roomNotes.trim() || null,
      // Same as before: the bill payer name is always sent — a matching
      // name links to that bill payer, a new one creates one, blank unlinks.
      bill_payer_name: form.billPayerName,
      bill_payer_unlisted_note: form.billPayerUnlistedNote.trim() || null,
      notes: form.notes.trim() || null,
      start_date: form.startDate || null,
      leaving_date: form.leavingDate || null,
    };

    // Age: with a date of birth, store the age worked out from it (this also
    // keeps 20 Hours ECE eligibility in step, as before). Without one, only
    // send the estimate when it has actually been changed — otherwise
    // saving any other field would re-date the old estimate to today.
    if (dobAge) {
      fields.age_years = dobAge.years;
      fields.age_months = dobAge.months;
    } else if (
      form.ageYears !== baseline.ageYears ||
      form.ageMonths !== baseline.ageMonths ||
      (baseline.dateOfBirth && !form.dateOfBirth)
    ) {
      fields.age_years = form.ageYears !== "" ? Number(form.ageYears) : null;
      fields.age_months = form.ageMonths !== "" ? Number(form.ageMonths) : null;
    }

    const ok = await saveState.run(() => onSave(fields), "Something went wrong saving these details.");
    if (ok) {
      setBaseline(form);
      router.refresh();
    }
  }

  return (
    <Drawer
      open={editOpen}
      onRequestClose={requestClose}
      title="Edit profile"
      description={childName}
      footer={
        confirmDiscard ? (
          <div className="flex flex-wrap items-center justify-between gap-3" role="alertdialog" aria-label="Unsaved changes">
            <p className="text-sm font-medium text-charcoal">Discard your unsaved changes?</p>
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={() => setConfirmDiscard(false)}>
                Keep editing
              </button>
              <button
                type="button"
                className="btn-primary"
                onClick={() => {
                  setConfirmDiscard(false);
                  closeEdit();
                }}
              >
                Discard
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3">
            <SaveStatus
              state={
                saveState.state === "saving"
                  ? "saving"
                  : saveState.state === "error"
                    ? "error"
                    : dirty
                      ? "dirty"
                      : saveState.state === "saved"
                        ? "saved"
                        : "idle"
              }
            />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={requestClose}>
                {dirty ? "Cancel" : "Close"}
              </button>
              <button type="submit" form="child-edit-form" className="btn-primary" disabled={saveState.state === "saving" || !dirty}>
                {saveState.state === "saving" ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <Section title="Photo" description="Photo changes save straight away.">
          <ChildPhotoUpload childId={childId} fullName={childName} roomColor={roomColor} photoUrl={photoUrl} />
        </Section>

        <form id="child-edit-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Section title="Child">
            <div>
              <label className={fieldLabel} htmlFor="edit-full-name">
                Full name <span className="font-normal text-charcoal/70">(required)</span>
              </label>
              <input
                id="edit-full-name"
                className="input"
                required
                maxLength={120}
                value={form.fullName}
                onChange={(e) => set("fullName", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="edit-dob">
                  Date of birth
                </label>
                <input
                  id="edit-dob"
                  type="date"
                  className="input"
                  max={nzTodayDateString()}
                  value={form.dateOfBirth}
                  onChange={(e) => set("dateOfBirth", e.target.value)}
                />
                <p className={hint}>
                  {dobAge
                    ? `Age today: ${dobAge.years}y ${dobAge.months}m. Also shows their birthday on the calendar.`
                    : "Used for their age, ratios and birthday reminders."}
                </p>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="edit-gender">
                  Gender
                </label>
                <select id="edit-gender" className="input" value={form.gender} onChange={(e) => set("gender", e.target.value)}>
                  <option value="">Not recorded</option>
                  {genderOptions.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {!form.dateOfBirth && (
              <div className="rounded-xl border border-charcoal/10 bg-canvas p-4">
                <p className="text-sm font-medium text-charcoal">Estimated age</p>
                <p className="mt-0.5 text-sm text-charcoal/70">
                  Only used while there&apos;s no date of birth. It&apos;s saved as an estimate dated today and shown as
                  “About …” on the profile.
                </p>
                <div className="mt-3 grid grid-cols-2 gap-3">
                  <div>
                    <label className={fieldLabel} htmlFor="edit-age-years">
                      Years
                    </label>
                    <input
                      id="edit-age-years"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={18}
                      className="input"
                      value={form.ageYears}
                      onChange={(e) => set("ageYears", e.target.value)}
                    />
                  </div>
                  <div>
                    <label className={fieldLabel} htmlFor="edit-age-months">
                      Months
                    </label>
                    <input
                      id="edit-age-months"
                      type="number"
                      inputMode="numeric"
                      min={0}
                      max={11}
                      className="input"
                      value={form.ageMonths}
                      onChange={(e) => set("ageMonths", e.target.value)}
                    />
                  </div>
                </div>
              </div>
            )}
          </Section>

          <Section title="Enrolment">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="edit-room">
                  Room
                </label>
                <select id="edit-room" className="input" value={form.roomId} onChange={(e) => set("roomId", e.target.value)}>
                  <option value="">No room</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="edit-room-notes">
                  Room notes
                </label>
                <input
                  id="edit-room-notes"
                  className="input"
                  placeholder="e.g. shared between two rooms"
                  value={form.roomNotes}
                  onChange={(e) => set("roomNotes", e.target.value)}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="edit-start">
                  Start date
                </label>
                <input id="edit-start" type="date" className="input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="edit-leaving">
                  Leaving date
                </label>
                <input
                  id="edit-leaving"
                  type="date"
                  className="input"
                  min={form.startDate || undefined}
                  value={form.leavingDate}
                  onChange={(e) => set("leavingDate", e.target.value)}
                />
              </div>
            </div>
            <p className="-mt-2 text-xs text-charcoal/70">
              Start and leaving dates drive the welcome and farewell email reminders. They don&apos;t change whether the
              child is marked as attending.
            </p>
          </Section>

          <Section title="Family">
            <div>
              <label className={fieldLabel} htmlFor="edit-address">
                Home address
              </label>
              <input
                id="edit-address"
                className="input"
                autoComplete="off"
                value={form.residentialAddress}
                onChange={(e) => set("residentialAddress", e.target.value)}
              />
            </div>
            <div>
              <label className={fieldLabel} htmlFor="edit-email">
                Primary contact email
              </label>
              <input
                id="edit-email"
                type="email"
                className="input"
                autoComplete="off"
                placeholder="If different from the bill payer"
                value={form.primaryContactEmail}
                onChange={(e) => set("primaryContactEmail", e.target.value)}
              />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="edit-bill-payer">
                  Bill payer
                </label>
                <input
                  id="edit-bill-payer"
                  className="input"
                  list="edit-bill-payer-options"
                  autoComplete="off"
                  value={form.billPayerName}
                  onChange={(e) => set("billPayerName", e.target.value)}
                />
                <datalist id="edit-bill-payer-options">
                  {billPayerOptions.map((b) => (
                    <option key={b.id} value={b.full_name} />
                  ))}
                </datalist>
                <p className={hint}>An existing name links to that bill payer; a new name creates one.</p>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="edit-bill-payer-note">
                  Bill payer note
                </label>
                <input
                  id="edit-bill-payer-note"
                  className="input"
                  placeholder="e.g. not confirmed yet"
                  value={form.billPayerUnlistedNote}
                  onChange={(e) => set("billPayerUnlistedNote", e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section title="Notes" description="General notes about this child. Contacts and pick-up permissions are kept on the Contacts tab.">
            <div>
              <label className="sr-only" htmlFor="edit-notes">
                Notes
              </label>
              <textarea id="edit-notes" className="input" rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </Section>

          <FormError message={validation ?? saveState.error} />
        </form>
      </div>
    </Drawer>
  );
}

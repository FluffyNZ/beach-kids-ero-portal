"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Drawer } from "@/components/ui/drawer";
import { SaveStatus, FormError, useSaveState } from "@/components/ui/save-status";
import { useRecordEdit } from "@/components/ui/record-shell";
import { StaffPhotoUpload } from "./staff-photo-upload";
import { STAFF_CONTRACT_TYPES, STAFF_CONTRACT_TYPE_LABEL } from "@/lib/constants";
import type { UpdateStaffDetailsFields } from "@/lib/actions/staff";
import type { StaffContractType } from "@/lib/supabase/database.types";
import type { RosterRoom, StaffAccessLevel } from "@/lib/types";

export type StaffEditValues = {
  fullName: string;
  role: string | null;
  roomId: string | null;
  isRelief: boolean;
  contractType: StaffContractType | null;
  startDate: string | null;
  endDate: string | null;
  minHours: number | null;
  payRate: number | null;
  taxCode: string | null;
  email: string | null;
  mobilePhone: string | null;
  dateOfBirth: string | null;
  emergencyName: string | null;
  emergencyPhone: string | null;
  emergencyRelationship: string | null;
  notes: string | null;
};

type FormState = { [K in keyof StaffEditValues]: K extends "isRelief" ? boolean : string };

function toForm(v: StaffEditValues): FormState {
  const s = (x: string | number | null) => (x === null || x === undefined ? "" : String(x));
  return {
    fullName: v.fullName,
    role: s(v.role),
    roomId: s(v.roomId),
    isRelief: v.isRelief,
    contractType: s(v.contractType),
    startDate: s(v.startDate),
    endDate: s(v.endDate),
    minHours: s(v.minHours),
    payRate: s(v.payRate),
    taxCode: s(v.taxCode),
    email: s(v.email),
    mobilePhone: s(v.mobilePhone),
    dateOfBirth: s(v.dateOfBirth),
    emergencyName: s(v.emergencyName),
    emergencyPhone: s(v.emergencyPhone),
    emergencyRelationship: s(v.emergencyRelationship),
    notes: s(v.notes),
  };
}

const fieldLabel = "mb-1.5 block text-sm font-medium text-charcoal";
const hint = "mt-1 text-xs text-charcoal/70";

function Section({ title, description, children }: { title: string; description?: React.ReactNode; children: React.ReactNode }) {
  return (
    <fieldset className="flex flex-col gap-4 border-b border-charcoal/10 pb-6 last:border-b-0 last:pb-0">
      <legend className="mb-1 text-base font-semibold text-charcoal">{title}</legend>
      {description && <p className="-mt-2 text-sm text-charcoal/70">{description}</p>}
      {children}
    </fieldset>
  );
}

/** Edit profile drawer for a staff member: the same fields the old
 * Employment form and "Personal & contact" editor saved, through the same
 * updateStaffDetails action, in one place. Pay rate is only part of the
 * form (and only ever sent) for authorised management — the server action
 * refuses it from anyone else regardless of what the browser sends. */
export function StaffEditDrawer({
  staffId,
  staffName,
  photoUrl,
  values,
  rooms,
  accessLevel,
  onSave,
}: {
  staffId: string;
  staffName: string;
  photoUrl: string | null;
  values: StaffEditValues;
  rooms: RosterRoom[];
  accessLevel: StaffAccessLevel;
  onSave: (fields: UpdateStaffDetailsFields) => Promise<void>;
}) {
  const router = useRouter();
  const { editOpen, closeEdit } = useRecordEdit();
  const save = useSaveState();
  const initial = useMemo(() => toForm(values), [values]);
  const [baseline, setBaseline] = useState<FormState>(initial);
  const [form, setForm] = useState<FormState>(initial);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [validation, setValidation] = useState<string | null>(null);

  const dirty = (Object.keys(form) as (keyof FormState)[]).some((k) => form[k] !== baseline[k]);

  useEffect(() => {
    if (editOpen) {
      setBaseline(initial);
      setForm(initial);
      setConfirmDiscard(false);
      setValidation(null);
      save.reset();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editOpen]);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
    setConfirmDiscard(false);
    save.markDirty();
  }

  function requestClose() {
    if (dirty && save.state !== "saving") {
      setConfirmDiscard(true);
      return;
    }
    closeEdit();
  }

  function validate(): string | null {
    if (!form.fullName.trim()) return "Enter this person's full name.";
    if (form.minHours !== "" && (Number.isNaN(Number(form.minHours)) || Number(form.minHours) < 0))
      return "Contracted hours must be 0 or more.";
    if (accessLevel === "full" && form.payRate !== "" && (Number.isNaN(Number(form.payRate)) || Number(form.payRate) < 0))
      return "Pay rate must be 0 or more.";
    if (form.startDate && form.endDate && form.endDate < form.startDate) return "The end date is before the start date.";
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const problem = validate();
    setValidation(problem);
    if (problem) {
      save.setState("error");
      return;
    }
    const text = (v: string) => v.trim() || null;
    const fields: UpdateStaffDetailsFields = {
      full_name: form.fullName.trim(),
      role: text(form.role),
      room_id: form.roomId || null,
      is_relief: form.isRelief,
      contract_type: (form.contractType || null) as StaffContractType | null,
      start_date: form.startDate || null,
      end_date: form.endDate || null,
      min_hours: form.minHours !== "" ? Number(form.minHours) : null,
      tax_code: text(form.taxCode),
      email: text(form.email),
      mobile_phone: text(form.mobilePhone),
      date_of_birth: form.dateOfBirth || null,
      emergency_contact_name: text(form.emergencyName),
      emergency_contact_phone: text(form.emergencyPhone),
      emergency_contact_relationship: text(form.emergencyRelationship),
      notes: text(form.notes),
      ...(accessLevel === "full" ? { pay_rate: form.payRate !== "" ? Number(form.payRate) : null } : {}),
    };
    const ok = await save.run(() => onSave(fields), "Something went wrong saving these details.");
    if (ok) {
      setBaseline(form);
      router.refresh();
    }
  }

  const status = save.state === "saving" ? "saving" : save.state === "error" ? "error" : dirty ? "dirty" : save.state === "saved" ? "saved" : "idle";

  return (
    <Drawer
      open={editOpen}
      onRequestClose={requestClose}
      title="Edit profile"
      description={staffName}
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
            <SaveStatus state={status} />
            <div className="flex gap-2">
              <button type="button" className="btn-secondary" onClick={requestClose}>
                {dirty ? "Cancel" : "Close"}
              </button>
              <button type="submit" form="staff-edit-form" className="btn-primary" disabled={save.state === "saving" || !dirty}>
                {save.state === "saving" ? "Saving…" : "Save changes"}
              </button>
            </div>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-6">
        <Section title="Photo" description="Photo changes save straight away.">
          <StaffPhotoUpload staffId={staffId} fullName={staffName} photoUrl={photoUrl} />
        </Section>

        <form id="staff-edit-form" onSubmit={handleSubmit} className="flex flex-col gap-6">
          <Section title="Role and room">
            <div>
              <label className={fieldLabel} htmlFor="staff-edit-name">
                Full name <span className="font-normal text-charcoal/70">(required)</span>
              </label>
              <input id="staff-edit-name" className="input" required maxLength={120} value={form.fullName} onChange={(e) => set("fullName", e.target.value)} />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-role">
                  Role
                </label>
                <input id="staff-edit-role" className="input" placeholder="e.g. Qualified Teacher" value={form.role} onChange={(e) => set("role", e.target.value)} />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-room">
                  Room
                </label>
                <select id="staff-edit-room" className="input" value={form.roomId} onChange={(e) => set("roomId", e.target.value)}>
                  <option value="">No room</option>
                  {rooms.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <label htmlFor="staff-edit-relief" className="flex items-start gap-2.5 text-sm text-charcoal">
              <input
                id="staff-edit-relief"
                type="checkbox"
                className="mt-0.5 h-4 w-4 rounded border-charcoal/40 accent-charcoal"
                checked={form.isRelief}
                onChange={(e) => set("isRelief", e.target.checked)}
              />
              <span>
                Relief or casual
                <span className="block text-xs text-charcoal/70">
                  Shows under “Relief” instead of “Float” on the weekly roster when no room is set. Doesn&apos;t change
                  which room they&apos;re rostered to on any shift.
                </span>
              </span>
            </label>
          </Section>

          <Section title="Employment">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-contract">
                  Employment type
                </label>
                <select id="staff-edit-contract" className="input" value={form.contractType} onChange={(e) => set("contractType", e.target.value)}>
                  <option value="">Not recorded</option>
                  {STAFF_CONTRACT_TYPES.map((c) => (
                    <option key={c} value={c}>
                      {STAFF_CONTRACT_TYPE_LABEL[c]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-hours">
                  Contracted hours a week
                </label>
                <input
                  id="staff-edit-hours"
                  type="number"
                  inputMode="decimal"
                  min={0}
                  step="0.5"
                  className="input"
                  value={form.minHours}
                  onChange={(e) => set("minHours", e.target.value)}
                />
                <p className={hint}>The agreed minimum — separate from rostered and actual hours.</p>
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-start">
                  Start date
                </label>
                <input id="staff-edit-start" type="date" className="input" value={form.startDate} onChange={(e) => set("startDate", e.target.value)} />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-end">
                  End date
                </label>
                <input
                  id="staff-edit-end"
                  type="date"
                  className="input"
                  min={form.startDate || undefined}
                  value={form.endDate}
                  onChange={(e) => set("endDate", e.target.value)}
                />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-tax">
                  Tax code
                </label>
                <input id="staff-edit-tax" className="input" placeholder="e.g. M, S, SL" value={form.taxCode} onChange={(e) => set("taxCode", e.target.value)} />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-pay">
                  Pay rate ($ an hour) <span className="font-normal text-charcoal/70">· restricted</span>
                </label>
                {accessLevel === "full" ? (
                  <input
                    id="staff-edit-pay"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    step="0.01"
                    className="input"
                    value={form.payRate}
                    onChange={(e) => set("payRate", e.target.value)}
                  />
                ) : (
                  <p id="staff-edit-pay" className="rounded-xl border border-charcoal/10 bg-canvas px-3 py-2 text-sm text-charcoal/70">
                    Only authorised management can see or change pay.
                  </p>
                )}
              </div>
            </div>
          </Section>

          <Section title="Contact">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-email">
                  Email
                </label>
                <input id="staff-edit-email" type="email" autoComplete="off" className="input" value={form.email} onChange={(e) => set("email", e.target.value)} />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-mobile">
                  Mobile
                </label>
                <input id="staff-edit-mobile" type="tel" autoComplete="off" className="input" value={form.mobilePhone} onChange={(e) => set("mobilePhone", e.target.value)} />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-dob">
                  Date of birth
                </label>
                <input id="staff-edit-dob" type="date" className="input" value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} />
                <p className={hint}>Shows their birthday on the centre calendar.</p>
              </div>
            </div>
          </Section>

          <Section title="Emergency contact">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-ec-name">
                  Name
                </label>
                <input id="staff-edit-ec-name" className="input" value={form.emergencyName} onChange={(e) => set("emergencyName", e.target.value)} />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-ec-phone">
                  Phone
                </label>
                <input id="staff-edit-ec-phone" type="tel" className="input" value={form.emergencyPhone} onChange={(e) => set("emergencyPhone", e.target.value)} />
              </div>
              <div>
                <label className={fieldLabel} htmlFor="staff-edit-ec-rel">
                  Relationship
                </label>
                <input
                  id="staff-edit-ec-rel"
                  className="input"
                  placeholder="e.g. Partner"
                  value={form.emergencyRelationship}
                  onChange={(e) => set("emergencyRelationship", e.target.value)}
                />
              </div>
            </div>
          </Section>

          <Section
            title="General notes"
            description="Everyday notes anyone with access can read. Confidential notes are kept separately on the Notes tab."
          >
            <div>
              <label className="sr-only" htmlFor="staff-edit-notes">
                General notes
              </label>
              <textarea id="staff-edit-notes" className="input" rows={4} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
            </div>
          </Section>

          <FormError message={validation ?? save.error} />
        </form>
      </div>
    </Drawer>
  );
}

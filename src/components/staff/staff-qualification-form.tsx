"use client";

import { useState, useTransition } from "react";
import { STAFF_QUALIFICATION_STATUSES, STAFF_QUALIFICATION_STATUS_LABEL } from "@/lib/constants";
import type { StaffQualification } from "@/lib/types";
import type { StaffQualificationStatus } from "@/lib/supabase/database.types";

export function StaffQualificationForm({
  qualification,
  onSave,
}: {
  qualification: StaffQualification;
  onSave: (fields: {
    qualification_status: StaffQualificationStatus;
    qualification_level?: string | null;
    registration_status?: string | null;
    pay_parity_step?: string | null;
    next_review_date?: string | null;
    studying_qualification?: string | null;
    expected_completion_date?: string | null;
    notes?: string | null;
  }) => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  const [status, setStatus] = useState<StaffQualificationStatus>(qualification.qualification_status);
  const [qualificationLevel, setQualificationLevel] = useState(qualification.qualification_level ?? "");
  const [registrationStatus, setRegistrationStatus] = useState(qualification.registration_status ?? "");
  const [payParityStep, setPayParityStep] = useState(qualification.pay_parity_step ?? "");
  const [nextReviewDate, setNextReviewDate] = useState(qualification.next_review_date ?? "");
  const [studyingQualification, setStudyingQualification] = useState(qualification.studying_qualification ?? "");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    qualification.expected_completion_date ?? ""
  );
  const [notes, setNotes] = useState(qualification.notes ?? "");

  function markDirty() {
    setSaved(false);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <label className="label">Qualification status</label>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STAFF_QUALIFICATION_STATUSES.map((value) => (
            <label
              key={value}
              className={`flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium transition-colors ${
                status === value
                  ? "border-burgundy-400 bg-burgundy-50 text-burgundy-700"
                  : "border-charcoal/15 text-charcoal hover:bg-sand-100"
              }`}
            >
              <input
                type="radio"
                name="qualification_status"
                className="h-4 w-4 border-charcoal/30 text-burgundy-500 focus:ring-burgundy-500"
                checked={status === value}
                onChange={() => {
                  setStatus(value);
                  markDirty();
                }}
              />
              {STAFF_QUALIFICATION_STATUS_LABEL[value]}
            </label>
          ))}
        </div>
      </div>

      {status === "qualified" && (
        <div className="rounded-xl border border-charcoal/10 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Qualification level</label>
              <input
                className="input"
                placeholder="e.g. ECE Level 7 (Bachelor)"
                value={qualificationLevel}
                onChange={(e) => {
                  setQualificationLevel(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div>
              <label className="label">Registration status</label>
              <input
                className="input"
                placeholder="e.g. Fully registered"
                value={registrationStatus}
                onChange={(e) => {
                  setRegistrationStatus(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Pay parity step</label>
              <input
                className="input"
                placeholder="e.g. Step 8"
                value={payParityStep}
                onChange={(e) => {
                  setPayParityStep(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div>
              <label className="label">Next review date</label>
              <input
                type="date"
                className="input"
                value={nextReviewDate}
                onChange={(e) => {
                  setNextReviewDate(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>
        </div>
      )}

      {status === "studying" && (
        <div className="rounded-xl border border-charcoal/10 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label">Qualification being studied</label>
              <input
                className="input"
                placeholder="e.g. Postgraduate Diploma in ECE"
                value={studyingQualification}
                onChange={(e) => {
                  setStudyingQualification(e.target.value);
                  markDirty();
                }}
              />
            </div>
            <div>
              <label className="label">Expected completion date</label>
              <input
                type="date"
                className="input"
                value={expectedCompletionDate}
                onChange={(e) => {
                  setExpectedCompletionDate(e.target.value);
                  markDirty();
                }}
              />
            </div>
          </div>
        </div>
      )}

      <div>
        <label className="label">Notes</label>
        <textarea
          className="input min-h-[60px]"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            markDirty();
          }}
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          disabled={pending}
          className="btn-primary"
          onClick={() =>
            startTransition(async () => {
              await onSave({
                qualification_status: status,
                qualification_level: status === "qualified" ? qualificationLevel || null : null,
                registration_status: status === "qualified" ? registrationStatus || null : null,
                pay_parity_step: status === "qualified" ? payParityStep || null : null,
                next_review_date: status === "qualified" ? nextReviewDate || null : null,
                studying_qualification: status === "studying" ? studyingQualification || null : null,
                expected_completion_date: status === "studying" ? expectedCompletionDate || null : null,
                notes: notes || null,
              });
              setSaved(true);
            })
          }
        >
          {pending ? "Saving…" : saved ? "Saved" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

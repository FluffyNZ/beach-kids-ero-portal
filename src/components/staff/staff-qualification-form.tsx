"use client";

import { useId, useState } from "react";
import { SaveStatus, FormError, useSaveState } from "@/components/ui/save-status";
import { cn } from "@/lib/utils";
import { STAFF_QUALIFICATION_STATUSES, STAFF_QUALIFICATION_STATUS_LABEL } from "@/lib/constants";
import type { StaffQualification, StaffAccessLevel } from "@/lib/types";
import type { StaffQualificationStatus } from "@/lib/supabase/database.types";

export function StaffQualificationForm({
  qualification,
  accessLevel,
  onSave,
}: {
  qualification: StaffQualification;
  accessLevel: StaffAccessLevel;
  onSave: (fields: {
    qualification_status: StaffQualificationStatus;
    qualification_level?: string | null;
    registration_status?: string | null;
    pay_parity_step?: string | null;
    recognised_service?: string | null;
    next_review_date?: string | null;
    studying_qualification?: string | null;
    expected_completion_date?: string | null;
    notes?: string | null;
  }) => Promise<void>;
}) {
  const id = useId();
  const save = useSaveState();

  const [status, setStatus] = useState<StaffQualificationStatus>(qualification.qualification_status);
  const [qualificationLevel, setQualificationLevel] = useState(qualification.qualification_level ?? "");
  const [registrationStatus, setRegistrationStatus] = useState(qualification.registration_status ?? "");
  const [payParityStep, setPayParityStep] = useState(qualification.pay_parity_step ?? "");
  const [recognisedService, setRecognisedService] = useState(qualification.recognised_service ?? "");
  const [nextReviewDate, setNextReviewDate] = useState(qualification.next_review_date ?? "");
  const [studyingQualification, setStudyingQualification] = useState(qualification.studying_qualification ?? "");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState(
    qualification.expected_completion_date ?? ""
  );
  const [notes, setNotes] = useState(qualification.notes ?? "");

  function markDirty() {
    save.markDirty();
  }

  return (
    <div className="flex flex-col gap-4">
      <fieldset>
        <legend className="mb-1.5 block text-sm font-medium text-charcoal">Qualification status</legend>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {STAFF_QUALIFICATION_STATUSES.map((value) => (
            <label
              key={value}
              className={cn(
                "flex cursor-pointer items-center gap-2 rounded-xl border px-3 py-2.5 text-sm font-medium text-charcoal transition-colors focus-within:ring-2 focus-within:ring-charcoal",
                status === value ? "border-charcoal bg-lilac-100" : "border-charcoal/15 hover:bg-charcoal/5"
              )}
            >
              <input
                type="radio"
                name="qualification_status"
                className="h-4 w-4 border-charcoal/40 accent-charcoal"
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
      </fieldset>

      {status === "qualified" && (
        <div className="rounded-xl border border-charcoal/10 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-f1`} className="mb-1.5 block text-sm font-medium text-charcoal">Qualification level</label>
              <input id={`${id}-f1`}
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
              <label htmlFor={`${id}-f2`} className="mb-1.5 block text-sm font-medium text-charcoal">Registration status</label>
              <input id={`${id}-f2`}
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
              <label htmlFor={`${id}-f3`} className="mb-1.5 block text-sm font-medium text-charcoal">
                Pay parity step <span className="font-normal text-charcoal/70">· restricted</span>
              </label>
              {accessLevel === "full" ? (
                <input id={`${id}-f3`}
                  className="input"
                  placeholder="e.g. Step 8"
                  value={payParityStep}
                  onChange={(e) => {
                    setPayParityStep(e.target.value);
                    markDirty();
                  }}
                />
              ) : (
                <p className="flex items-center rounded-xl border border-charcoal/10 bg-canvas px-3 py-2 text-sm text-charcoal/70">
                  Only authorised management can see this
                </p>
              )}
            </div>
            <div>
              <label htmlFor={`${id}-f4`} className="mb-1.5 block text-sm font-medium text-charcoal">
                Recognised service <span className="font-normal text-charcoal/70">· restricted</span>
              </label>
              {accessLevel === "full" ? (
                <input id={`${id}-f4`}
                  className="input"
                  placeholder="e.g. 4 years recognised"
                  value={recognisedService}
                  onChange={(e) => {
                    setRecognisedService(e.target.value);
                    markDirty();
                  }}
                />
              ) : (
                <p className="flex items-center rounded-xl border border-charcoal/10 bg-canvas px-3 py-2 text-sm text-charcoal/70">
                  Only authorised management can see this
                </p>
              )}
            </div>
          </div>
          <div className="mt-3">
            <label htmlFor={`${id}-f5`} className="mb-1.5 block text-sm font-medium text-charcoal">Next review date</label>
            <input id={`${id}-f5`}
              type="date"
              className="input max-w-xs"
              value={nextReviewDate}
              onChange={(e) => {
                setNextReviewDate(e.target.value);
                markDirty();
              }}
            />
          </div>
        </div>
      )}

      {status === "studying" && (
        <div className="rounded-xl border border-charcoal/10 p-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label htmlFor={`${id}-f6`} className="mb-1.5 block text-sm font-medium text-charcoal">Qualification being studied</label>
              <input id={`${id}-f6`}
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
              <label htmlFor={`${id}-f7`} className="mb-1.5 block text-sm font-medium text-charcoal">Expected completion date</label>
              <input id={`${id}-f7`}
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
        <label htmlFor={`${id}-f8`} className="mb-1.5 block text-sm font-medium text-charcoal">Notes</label>
        <textarea id={`${id}-f8`}
          className="input min-h-[60px]"
          value={notes}
          onChange={(e) => {
            setNotes(e.target.value);
            markDirty();
          }}
        />
      </div>

      <FormError message={save.error} />

      <div className="flex flex-wrap items-center justify-end gap-3">
        <SaveStatus state={save.state} />
        <button
          type="button"
          disabled={save.state === "saving"}
          className="btn-primary"
          onClick={() =>
            save.run(
              () =>
                onSave({
                  qualification_status: status,
                  qualification_level: status === "qualified" ? qualificationLevel || null : null,
                  registration_status: status === "qualified" ? registrationStatus || null : null,
                  next_review_date: status === "qualified" ? nextReviewDate || null : null,
                  studying_qualification: status === "studying" ? studyingQualification || null : null,
                  expected_completion_date: status === "studying" ? expectedCompletionDate || null : null,
                  notes: notes || null,
                  ...(accessLevel === "full"
                    ? {
                        pay_parity_step: status === "qualified" ? payParityStep || null : null,
                        recognised_service: status === "qualified" ? recognisedService || null : null,
                      }
                    : {}),
                }),
              "Something went wrong saving the qualification."
            )
          }
        >
          {save.state === "saving" ? "Saving…" : "Save changes"}
        </button>
      </div>
    </div>
  );
}

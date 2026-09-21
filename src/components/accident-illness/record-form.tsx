"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  createAccidentIllnessRecord,
  updateAccidentIllnessRecord,
  attachAccidentIllnessEvidence,
} from "@/lib/actions/accident-illness";
import { createMinimalChildProfile } from "@/lib/actions/children";
import { createMinimalStaffProfile } from "@/lib/actions/staff";
import { ChildSelect } from "./child-select";
import { YesNoField } from "./yes-no-field";
import { DEFAULT_STAFF_QUALIFICATION } from "@/lib/types";
import type { AccidentIllnessDraft, AccidentIllnessRecord, ChildMember, RosterRoom, StaffMember } from "@/lib/types";

const LOW_CONFIDENCE_LABELS: Record<string, string> = {
  incident_date: "Date",
  incident_time: "Time",
  time_parent_contacted: "Time parent contacted",
  description: "Description",
  equipment_involved: "Equipment involved",
  another_child_involved: "Another child involved",
  first_aid_provided: "First aid provided",
  further_first_aid_required: "Further first aid required",
  first_aid_supplies_used: "First aid supplies used",
  child_name_guess: "Child's name",
  staff_name_guess: "Staff name",
  parent_signed_guess: "Parent signature",
};

function yesNoGuessToBool(v: "yes" | "no" | "unclear" | undefined): boolean | null {
  if (v === "yes") return true;
  if (v === "no") return false;
  return null;
}

/** Every real record whose name matches a photo's guess, exact matches
 * first. A single exact match is confident enough to auto-select; more than
 * one (or only partial matches) is treated as ambiguous rather than guessed
 * at — the point isn't to never auto-fill, it's to never silently pick
 * between two real people who could each be right. */
function findNameMatches<T extends { id: string; full_name: string }>(guess: string | null, list: T[]): T[] {
  if (!guess) return [];
  const normalized = guess.trim().toLowerCase();
  if (!normalized) return [];
  const exact = list.filter((item) => item.full_name.toLowerCase() === normalized);
  if (exact.length > 0) return exact;
  return list.filter(
    (item) => item.full_name.toLowerCase().includes(normalized) || normalized.includes(item.full_name.toLowerCase())
  );
}

/** Create/edit form mirroring the exact fields on Beach Kids' real paper
 * Accident & Illness Form. Nothing here is invented beyond what's on that
 * form — Child and Staff are pickers into the real, existing records rather
 * than free text. When `prefill` comes from a photo read by AI: a single
 * confident name match is auto-selected (shown plainly, and changeable in
 * one click); an ambiguous match offers quick picks instead of guessing
 * between them; no match at all offers to create a minimal profile — never
 * a duplicate, and never silent, since it's still a real new record. */
export function RecordForm({
  record,
  allChildren,
  rooms,
  staff,
  prefill,
  photoFile,
  onSaved,
}: {
  record?: AccidentIllnessRecord;
  allChildren: ChildMember[];
  rooms: RosterRoom[];
  staff: StaffMember[];
  prefill?: AccidentIllnessDraft;
  photoFile?: File | null;
  /** Called after a new record (and its photo) is saved, instead of the
   * default navigate-to-the-record behaviour — used when this form is one
   * card in a batch of several, so saving one doesn't navigate away from
   * the rest of the queue. */
  onSaved?: (recordId: string) => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Children created via "Create a profile for…" below get appended here
  // so they're immediately selectable without waiting on a page refresh.
  const [localChildren, setLocalChildren] = useState<ChildMember[]>(allChildren);
  const [creatingChild, setCreatingChild] = useState(false);
  const [createChildError, setCreateChildError] = useState<string | null>(null);

  // Staff created via "Create a profile for…" below get appended here so
  // they're immediately selectable without waiting on a page refresh — same
  // pattern as localChildren above, since a staff signature on an old form
  // is just as likely to name someone who's since left.
  const [localStaff, setLocalStaff] = useState<StaffMember[]>(staff);
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [createStaffError, setCreateStaffError] = useState<string | null>(null);

  // What actually gets used to create a new profile — starts out as the
  // photo's guess, but the AI can misread handwriting, so both are
  // editable right up until the moment "Create profile" is clicked.
  const [childNameInput, setChildNameInput] = useState(prefill?.child_name_guess ?? "");
  const [staffNameInput, setStaffNameInput] = useState(prefill?.staff_name_guess ?? "");

  const childMatches = !record ? findNameMatches(prefill?.child_name_guess ?? null, localChildren) : [];
  const staffMatches = !record ? findNameMatches(prefill?.staff_name_guess ?? null, localStaff) : [];
  const autoMatchedChildId = childMatches.length === 1 ? childMatches[0].id : null;
  const autoMatchedStaffId = staffMatches.length === 1 ? staffMatches[0].id : null;

  // Computed once, at mount — a single confident name match is pre-filled
  // straight away rather than requiring an extra click, but it's plain
  // state from here on, exactly as changeable as anything typed by hand.
  const [childId, setChildId] = useState<string | null>(record?.child_id ?? autoMatchedChildId);
  const [staffId, setStaffId] = useState<string>(record?.staff_id ?? autoMatchedStaffId ?? "");

  async function handleCreateChild() {
    const name = childNameInput.trim();
    if (!name) return;
    setCreatingChild(true);
    setCreateChildError(null);
    const result = await createMinimalChildProfile(name);
    setCreatingChild(false);
    if (!result.success) {
      setCreateChildError(result.error);
      return;
    }
    const created: ChildMember = {
      id: result.childId,
      full_name: name.trim(),
      gender: null,
      age_years: null,
      age_months: null,
      age_as_of: null,
      residential_address: null,
      primary_contact_email: null,
      room_id: null,
      room_name: null,
      room_color: null,
      room_notes: null,
      bill_payer_id: null,
      bill_payer_name: null,
      bill_payer_unlisted_note: null,
      status: "left",
      photo_url: null,
      hourly_rate: null,
      twenty_hours_ece: false,
      special_weekly_override: null,
      notes: "Profile created automatically from an Accident & Illness photo import — no other details were supplied.",
    } as ChildMember;
    setLocalChildren((prev) => [...prev, created]);
    setChildId(result.childId);
  }

  async function handleCreateStaff() {
    const name = staffNameInput.trim();
    if (!name) return;
    setCreatingStaff(true);
    setCreateStaffError(null);
    const result = await createMinimalStaffProfile(name);
    setCreatingStaff(false);
    if (!result.success) {
      setCreateStaffError(result.error);
      return;
    }
    const created: StaffMember = {
      id: result.staffId,
      full_name: name.trim(),
      role: null,
      start_date: null,
      end_date: null,
      date_of_birth: null,
      photo_storage_path: null,
      photo_url: null,
      status: "former",
      contract_type: null,
      pay_rate: null,
      min_hours: null,
      notes: "Profile created automatically from an Accident & Illness photo import — no other details were supplied.",
      can_publish_learning_stories: false,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      document_count: 0,
      nearest_document_expiry: null,
      qualification: DEFAULT_STAFF_QUALIFICATION,
      required_docs_completed: 0,
      required_docs_total: 0,
    };
    setLocalStaff((prev) => [...prev, created]);
    setStaffId(result.staffId);
  }

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!childId) {
      setError("Choose which child this record is for.");
      return;
    }

    const formData = new FormData(e.currentTarget);
    formData.set("child_id", childId);
    formData.set("staff_id", staffId);

    startTransition(async () => {
      const result = record
        ? await updateAccidentIllnessRecord(record.id, formData)
        : await createAccidentIllnessRecord(formData);

      if (!result.success) {
        setError(result.error);
        return;
      }

      if (!record) {
        // The photo that was read to pre-fill this form is the actual
        // signed paper — attach it as this record's evidence automatically
        // so nothing needs re-uploading.
        if (photoFile) {
          const evidenceFormData = new FormData();
          evidenceFormData.set("file", photoFile);
          await attachAccidentIllnessEvidence(result.id, evidenceFormData);
        }
        if (onSaved) onSaved(result.id);
        else router.push(`/records/accidents-illness/${result.id}`);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {prefill && prefill.low_confidence_fields.length > 0 && (
        <p className="rounded-lg border border-status-attention/30 bg-status-attentionBg px-3 py-2 text-xs text-charcoal/70">
          The photo wasn&apos;t fully clear on:{" "}
          {prefill.low_confidence_fields.map((f) => LOW_CONFIDENCE_LABELS[f] ?? f).join(", ")}. Double-check these
          against the photo above.
        </p>
      )}

      <div>
        <label className="label">Child</label>
        {record ? (
          <input className="input bg-sand-50" value={record.child_name} disabled />
        ) : (
          <>
            {prefill?.child_name_guess && (
              <div className="mb-2 text-xs text-charcoal/50">
                {autoMatchedChildId && childId === autoMatchedChildId ? (
                  <p>
                    Matched from photo:{" "}
                    <span className="font-medium text-charcoal">{childMatches[0].full_name}</span>
                    {childMatches[0].status === "left" && " (left)"} — not right? pick someone else below.
                  </p>
                ) : childMatches.length > 1 ? (
                  <div>
                    <p>
                      The form appears to name:{" "}
                      <span className="font-medium text-charcoal">{prefill.child_name_guess}</span> — did you mean:
                    </p>
                    <div className="mt-1 flex flex-wrap gap-1.5">
                      {childMatches.map((m) => (
                        <button
                          key={m.id}
                          type="button"
                          className="badge bg-sand-100 hover:bg-sand-200"
                          onClick={() => setChildId(m.id)}
                        >
                          {m.full_name}
                          {m.room_name ? ` — ${m.room_name}` : ""}
                          {m.status === "left" ? " (left)" : ""}
                        </button>
                      ))}
                    </div>
                  </div>
                ) : childMatches.length === 0 ? (
                  <div>
                    <p>
                      No match found for: <span className="font-medium text-charcoal">{prefill.child_name_guess}</span>{" "}
                      — misread the name? correct it below before creating a profile.
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-2">
                      <input
                        type="text"
                        value={childNameInput}
                        onChange={(e) => setChildNameInput(e.target.value)}
                        placeholder="Child's name"
                        className="input h-8 w-auto max-w-[14rem] py-1 text-xs"
                      />
                      <button
                        type="button"
                        disabled={creatingChild || !childNameInput.trim()}
                        className="font-medium text-burgundy-600 hover:underline disabled:opacity-50"
                        onClick={handleCreateChild}
                      >
                        {creatingChild ? "Creating…" : `Create a profile for "${childNameInput.trim() || "…"}"?`}
                      </button>
                    </div>
                    {createChildError && <p className="mt-1 text-status-action">{createChildError}</p>}
                  </div>
                ) : null}
              </div>
            )}
            <ChildSelect allChildren={localChildren} rooms={rooms} selectedId={childId} onChange={setChildId} />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="incident_date">
            Date
          </label>
          <input
            id="incident_date"
            name="incident_date"
            type="date"
            required
            defaultValue={record?.incident_date ?? prefill?.incident_date ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="incident_time">
            Time
          </label>
          <input
            id="incident_time"
            name="incident_time"
            type="time"
            defaultValue={record?.incident_time ?? prefill?.incident_time ?? ""}
            className="input"
          />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="time_parent_contacted">
          Time parent contacted
        </label>
        <input
          id="time_parent_contacted"
          name="time_parent_contacted"
          type="time"
          defaultValue={record?.time_parent_contacted ?? prefill?.time_parent_contacted ?? ""}
          className="input max-w-[10rem]"
        />
      </div>

      <div>
        <label className="label" htmlFor="description">
          Description of incident/accident
        </label>
        <textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={record?.description ?? prefill?.description ?? ""}
          className="input"
          placeholder="What happened…"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <YesNoField
          name="equipment_involved"
          label="Equipment involved"
          defaultValue={record ? record.equipment_involved : yesNoGuessToBool(prefill?.equipment_involved)}
        />
        <YesNoField
          name="another_child_involved"
          label="Another child involved"
          defaultValue={record ? record.another_child_involved : yesNoGuessToBool(prefill?.another_child_involved)}
        />
      </div>

      <div>
        <label className="label" htmlFor="first_aid_provided">
          First aid provided
        </label>
        <textarea
          id="first_aid_provided"
          name="first_aid_provided"
          rows={3}
          defaultValue={record?.first_aid_provided ?? prefill?.first_aid_provided ?? ""}
          className="input"
        />
      </div>

      <YesNoField
        name="further_first_aid_required"
        label="Further first aid required"
        defaultValue={record ? record.further_first_aid_required : yesNoGuessToBool(prefill?.further_first_aid_required)}
      />

      <div>
        <label className="label" htmlFor="first_aid_supplies_used">
          First aid supplies used
        </label>
        <textarea
          id="first_aid_supplies_used"
          name="first_aid_supplies_used"
          rows={2}
          defaultValue={record?.first_aid_supplies_used ?? prefill?.first_aid_supplies_used ?? ""}
          className="input"
        />
      </div>

      <div>
        <label className="label" htmlFor="staff_id">
          Staff signature
        </label>
        {prefill?.staff_name_guess && (
          <div className="mb-2 text-xs text-charcoal/50">
            {autoMatchedStaffId && staffId === autoMatchedStaffId ? (
              <p>
                Matched from photo: <span className="font-medium text-charcoal">{staffMatches[0].full_name}</span> —
                not right? pick someone else below.
              </p>
            ) : staffMatches.length > 1 ? (
              <div>
                <p>
                  The form appears to name:{" "}
                  <span className="font-medium text-charcoal">{prefill.staff_name_guess}</span> — did you mean:
                </p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {staffMatches.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      className="badge bg-sand-100 hover:bg-sand-200"
                      onClick={() => setStaffId(m.id)}
                    >
                      {m.full_name}
                      {m.status === "former" ? " (former)" : ""}
                    </button>
                  ))}
                </div>
              </div>
            ) : staffMatches.length === 0 ? (
              <div>
                <p>
                  No match found for: <span className="font-medium text-charcoal">{prefill.staff_name_guess}</span> —
                  misread the name? correct it below before creating a profile.
                </p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  <input
                    type="text"
                    value={staffNameInput}
                    onChange={(e) => setStaffNameInput(e.target.value)}
                    placeholder="Staff member's name"
                    className="input h-8 w-auto max-w-[14rem] py-1 text-xs"
                  />
                  <button
                    type="button"
                    disabled={creatingStaff || !staffNameInput.trim()}
                    className="font-medium text-burgundy-600 hover:underline disabled:opacity-50"
                    onClick={handleCreateStaff}
                  >
                    {creatingStaff ? "Creating…" : `Create a profile for "${staffNameInput.trim() || "…"}"?`}
                  </button>
                </div>
                {createStaffError && <p className="mt-1 text-status-action">{createStaffError}</p>}
              </div>
            ) : null}
          </div>
        )}
        <select id="staff_id" className="input" value={staffId} onChange={(e) => setStaffId(e.target.value)}>
          <option value="">Select the staff member who completed this…</option>
          {localStaff.map((s) => (
            <option key={s.id} value={s.id}>
              {s.full_name}
              {s.status === "former" ? " (former)" : ""}
            </option>
          ))}
        </select>
        <p className="mt-1 text-xs text-charcoal/40">
          This records who filled the form in — it isn&apos;t a captured digital signature. The signed paper itself
          is filed as a photo on this record.
        </p>
      </div>

      <label className="flex items-center gap-2 text-sm text-charcoal/70">
        <input
          type="checkbox"
          name="parent_signed"
          defaultChecked={record?.parent_signed ?? prefill?.parent_signed_guess ?? false}
          className="h-4 w-4 rounded"
        />
        Parent has signed the paper form
        {prefill && prefill.parent_signed_guess === null && (
          <span className="text-xs text-charcoal/40">(unclear from the photo — please check)</span>
        )}
      </label>

      {error && <p className="text-sm text-status-action">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : record ? "Save changes" : "Save record"}
        </button>
      </div>
    </form>
  );
}

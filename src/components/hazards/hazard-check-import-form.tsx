"use client";

import { useMemo, useState, useTransition } from "react";
import {
  createHazardCheckFromImport,
  attachHazardCheckEvidence,
} from "@/lib/actions/hazard-checks";
import { createMinimalStaffProfile } from "@/lib/actions/staff";
import { HAZARD_CATEGORY_LABEL } from "@/lib/constants";
import { randomId } from "@/lib/utils";
import { DEFAULT_STAFF_QUALIFICATION } from "@/lib/types";
import type {
  HazardCheckCategory,
  HazardCheckDraft,
  HazardChecklistTemplateItem,
  HazardRiskLevel,
  RosterRoom,
  StaffMember,
} from "@/lib/types";

const CATEGORY_ORDER: HazardCheckCategory[] = ["indoor", "outdoor", "allergy"];

const LOW_CONFIDENCE_LABELS: Record<string, string> = {
  room_name_guess: "Room",
  check_date: "Date",
  items: "Checklist ticks",
  hazard_log_entries: "Hazard log",
  notes: "Notes",
  staff_name_guess: "Completed by",
  completed_time: "Time",
  signed_off_guess: "Sign-off",
};

/** Single exact (case-insensitive) name match — same "never guess between
 * two real people" rule as the Accident & Illness photo import, though with
 * only a handful of rooms an ambiguous match is unlikely in practice. */
function findStaffMatches(guess: string | null, list: StaffMember[]): StaffMember[] {
  if (!guess) return [];
  const normalized = guess.trim().toLowerCase();
  if (!normalized) return [];
  const exact = list.filter((s) => s.full_name.toLowerCase() === normalized);
  if (exact.length > 0) return exact;
  return list.filter(
    (s) => s.full_name.toLowerCase().includes(normalized) || normalized.includes(s.full_name.toLowerCase())
  );
}

function findRoomMatch(guess: string | null, rooms: RosterRoom[]): RosterRoom | null {
  if (!guess) return null;
  const normalized = guess.trim().toLowerCase();
  if (!normalized) return null;
  return rooms.find((r) => r.name.toLowerCase() === normalized) ?? null;
}

/** Which of a room's template items should start ticked, based on the
 * draft's item guesses — matched by exact item_text only, since that's the
 * only thing tying an AI guess back to a real, known checklist item. */
function computeInitialChecked(template: HazardChecklistTemplateItem[], draftItems: HazardCheckDraft["items"]): Set<string> {
  const checkedFromDraft = new Set(draftItems.filter((i) => i.checked === "yes").map((i) => i.item_text));
  return new Set(template.filter((t) => checkedFromDraft.has(t.item_text)).map((t) => t.item_text));
}

/** One photo's worth of the Daily Hazard Checklist photo-import flow — the
 * room the AI guessed (always confirmable/changeable via a plain dropdown,
 * never silently trusted), that room's real checklist ticked according to
 * the draft, the hazard log rows transcribed from the form, and the same
 * staff name-matching/create-profile UX as Accident & Illness. Nothing is
 * saved until this form's Save button is clicked. */
export function HazardCheckImportForm({
  rooms,
  templatesByRoom,
  staff,
  draft,
  photoFile,
  onSaved,
}: {
  rooms: RosterRoom[];
  templatesByRoom: Record<string, HazardChecklistTemplateItem[]>;
  staff: StaffMember[];
  draft: HazardCheckDraft;
  photoFile: File;
  onSaved: (checkId: string) => void;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const matchedRoom = useMemo(() => findRoomMatch(draft.room_name_guess, rooms), [draft.room_name_guess, rooms]);
  const [roomId, setRoomId] = useState<string>(matchedRoom?.id ?? "");
  const template = templatesByRoom[roomId] ?? [];

  const [checkedTexts, setCheckedTexts] = useState<Set<string>>(() => computeInitialChecked(template, draft.items));
  const [checklistRoomId, setChecklistRoomId] = useState(roomId);
  // Recompute which items start ticked whenever the reviewer changes the
  // room — a different room means a different (and possibly totally
  // different-length) template.
  if (roomId !== checklistRoomId) {
    setChecklistRoomId(roomId);
    setCheckedTexts(computeInitialChecked(templatesByRoom[roomId] ?? [], draft.items));
  }

  const unclearItemCount = draft.items.filter((i) => i.checked === "unclear").length;

  const [checkDate, setCheckDate] = useState(draft.check_date ?? "");
  const [notes, setNotes] = useState(draft.notes ?? "");
  const [completedTime, setCompletedTime] = useState(draft.completed_time ?? "");
  const [signedOff, setSignedOff] = useState(draft.signed_off_guess ?? false);

  const [logEntries, setLogEntries] = useState<Array<{ id: string; hazard_description: string; risk_level: HazardRiskLevel }>>(
    () => draft.hazard_log_entries.map((h) => ({ id: randomId(), ...h }))
  );

  // Staff matching/creation — same pattern as Accident & Illness's
  // RecordForm: a single confident match is pre-filled but changeable, an
  // ambiguous match offers quick-picks, no match offers an editable name
  // and a one-click "create profile" (never silently guessed).
  const [localStaff, setLocalStaff] = useState<StaffMember[]>(staff);
  const staffMatches = findStaffMatches(draft.staff_name_guess, localStaff);
  const autoMatchedStaffId = staffMatches.length === 1 ? staffMatches[0].id : null;
  const [staffId, setStaffId] = useState<string>(autoMatchedStaffId ?? "");
  const [staffNameInput, setStaffNameInput] = useState(draft.staff_name_guess ?? "");
  const [creatingStaff, setCreatingStaff] = useState(false);
  const [createStaffError, setCreateStaffError] = useState<string | null>(null);

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
      status: "former",
      contract_type: null,
      pay_rate: null,
      min_hours: null,
      notes: "Profile created automatically from a Daily Hazard Checklist photo import — no other details were supplied.",
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

  function toggleItem(itemText: string) {
    setCheckedTexts((prev) => {
      const next = new Set(prev);
      if (next.has(itemText)) next.delete(itemText);
      else next.add(itemText);
      return next;
    });
  }

  function setAllChecked(checked: boolean) {
    setCheckedTexts(checked ? new Set(template.map((t) => t.item_text)) : new Set());
  }

  function updateLogEntry(id: string, patch: Partial<{ hazard_description: string; risk_level: HazardRiskLevel }>) {
    setLogEntries((prev) => prev.map((e) => (e.id === id ? { ...e, ...patch } : e)));
  }

  function removeLogEntry(id: string) {
    setLogEntries((prev) => prev.filter((e) => e.id !== id));
  }

  function addLogEntry() {
    setLogEntries((prev) => [...prev, { id: randomId(), hazard_description: "", risk_level: "low" }]);
  }

  const itemsByCategory = new Map<HazardCheckCategory, HazardChecklistTemplateItem[]>();
  template.forEach((item) => {
    const list = itemsByCategory.get(item.category) ?? [];
    list.push(item);
    itemsByCategory.set(item.category, list);
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!roomId) {
      setError("Choose which room this checklist is for.");
      return;
    }
    if (!checkDate) {
      setError("Enter the date of this check.");
      return;
    }

    const validLogEntries = logEntries.filter((e) => e.hazard_description.trim());

    startTransition(async () => {
      const result = await createHazardCheckFromImport({
        roomId,
        checkDate,
        notes: notes.trim() || null,
        staffId: staffId || null,
        completedTime: completedTime || null,
        signedOff,
        checkedItemTexts: Array.from(checkedTexts),
        hazardLogEntries: validLogEntries.map(({ hazard_description, risk_level }) => ({ hazard_description, risk_level })),
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // The photo that was read to pre-fill this form is the actual signed
      // paper — attach it as this check's evidence automatically so nothing
      // needs re-uploading.
      const evidenceFormData = new FormData();
      evidenceFormData.set("file", photoFile);
      await attachHazardCheckEvidence(result.id, evidenceFormData);

      onSaved(result.id);
    });
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-5">
      {draft.low_confidence_fields.length > 0 && (
        <p className="rounded-lg border border-status-attention/30 bg-status-attentionBg px-3 py-2 text-xs text-charcoal/70">
          The photo wasn&apos;t fully clear on:{" "}
          {draft.low_confidence_fields.map((f) => LOW_CONFIDENCE_LABELS[f] ?? f).join(", ")}. Double-check these
          against the photo above.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="room_id">
            Room
          </label>
          {draft.room_name_guess && !matchedRoom && (
            <p className="mb-1.5 text-xs text-charcoal/50">
              The form appears to say: <span className="font-medium text-charcoal">{draft.room_name_guess}</span> —
              no exact match, please pick the room below.
            </p>
          )}
          {matchedRoom && (
            <p className="mb-1.5 text-xs text-charcoal/50">
              Matched from photo: <span className="font-medium text-charcoal">{matchedRoom.name}</span> — not right?
              pick another below.
            </p>
          )}
          <select id="room_id" className="input" value={roomId} onChange={(e) => setRoomId(e.target.value)}>
            <option value="">Select the room…</option>
            {rooms.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="check_date">
            Date
          </label>
          <input
            id="check_date"
            type="date"
            required
            value={checkDate}
            onChange={(e) => setCheckDate(e.target.value)}
            className="input"
          />
        </div>
      </div>

      {roomId ? (
        <div className="flex flex-col gap-4">
          {unclearItemCount > 0 && (
            <p className="text-xs text-charcoal/50">
              {unclearItemCount} item{unclearItemCount > 1 ? "s were" : " was"} unclear from the photo — check the
              boxes below against the photo above.
            </p>
          )}
          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setAllChecked(true)} className="text-xs font-medium text-burgundy-600 hover:underline">
              Tick all
            </button>
            <button type="button" onClick={() => setAllChecked(false)} className="text-xs font-medium text-charcoal/50 hover:underline">
              Clear all
            </button>
          </div>
          {CATEGORY_ORDER.filter((cat) => itemsByCategory.has(cat)).map((category) => (
            <div key={category}>
              <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/50">
                {HAZARD_CATEGORY_LABEL[category]}
              </h3>
              <div className="flex flex-col gap-1.5">
                {(itemsByCategory.get(category) ?? []).map((item) => (
                  <label
                    key={item.item_text}
                    className="flex items-start gap-2.5 rounded-lg border border-transparent px-2 py-1.5 text-sm text-charcoal hover:bg-sand-50"
                  >
                    <input
                      type="checkbox"
                      checked={checkedTexts.has(item.item_text)}
                      onChange={() => toggleItem(item.item_text)}
                      className="mt-0.5 h-4 w-4 rounded"
                    />
                    {item.item_text}
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="text-sm text-charcoal/50">Choose a room above to see its checklist.</p>
      )}

      <div>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-charcoal/50">Hazard log</h3>
        <div className="flex flex-col gap-3">
          {logEntries.map((entry) => (
            <div key={entry.id} className="flex flex-col gap-2 rounded-lg border border-charcoal/10 p-3">
              <textarea
                value={entry.hazard_description}
                onChange={(e) => updateLogEntry(entry.id, { hazard_description: e.target.value })}
                rows={2}
                className="input"
                placeholder="Hazard & location, e.g. Loose paving stone by the gate"
              />
              <div className="flex items-center justify-between gap-2">
                <select
                  value={entry.risk_level}
                  onChange={(e) => updateLogEntry(entry.id, { risk_level: e.target.value as HazardRiskLevel })}
                  className="input max-w-[10rem]"
                >
                  <option value="low">Low risk</option>
                  <option value="medium">Medium risk</option>
                  <option value="high">High risk</option>
                </select>
                <button
                  type="button"
                  onClick={() => removeLogEntry(entry.id)}
                  className="text-xs font-medium text-charcoal/50 hover:text-status-action"
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
          <button
            type="button"
            onClick={addLogEntry}
            className="self-start text-sm font-medium text-burgundy-600 hover:underline"
          >
            + Log a hazard
          </button>
        </div>
      </div>

      <div>
        <label className="label" htmlFor="notes">
          Notes
        </label>
        <textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} className="input" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="staff_id">
            Completed by
          </label>
          {draft.staff_name_guess && (
            <div className="mb-1.5 text-xs text-charcoal/50">
              {autoMatchedStaffId && staffId === autoMatchedStaffId ? (
                <p>
                  Matched from photo: <span className="font-medium text-charcoal">{staffMatches[0].full_name}</span>{" "}
                  — not right? pick someone else below.
                </p>
              ) : staffMatches.length > 1 ? (
                <div>
                  <p>
                    The form appears to name:{" "}
                    <span className="font-medium text-charcoal">{draft.staff_name_guess}</span> — did you mean:
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
                    No match found for: <span className="font-medium text-charcoal">{draft.staff_name_guess}</span> —
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
            <option value="">Select who completed this…</option>
            {localStaff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.full_name}
                {s.status === "former" ? " (former)" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="completed_time">
            Time
          </label>
          <input
            id="completed_time"
            type="time"
            value={completedTime}
            onChange={(e) => setCompletedTime(e.target.value)}
            className="input"
          />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-charcoal/70">
        <input
          type="checkbox"
          checked={signedOff}
          onChange={(e) => setSignedOff(e.target.checked)}
          className="h-4 w-4 rounded"
        />
        I confirm this check was completed
        {draft.signed_off_guess === null && (
          <span className="text-xs text-charcoal/40">(unclear from the photo — please check)</span>
        )}
      </label>

      {error && <p className="text-sm text-status-action">{error}</p>}

      <div className="flex justify-end">
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save check"}
        </button>
      </div>
    </form>
  );
}

"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createEmergencyDrill } from "@/lib/actions/emergency-drills";
import { EMERGENCY_DRILL_TYPES, EMERGENCY_DRILL_TYPE_LABEL } from "@/lib/constants";

/** Logging form for a single emergency drill. The fields mirror what current
 * Ministry of Education guidance expects a drill record to capture (date,
 * type, duration, who was involved, what happened, and an evaluation of how
 * it went) so the printed record stands on its own as evidence. */
export function DrillForm() {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [childrenInvolved, setChildrenInvolved] = useState(true);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await createEmergencyDrill(formData);
      if (!result.success) {
        setError(result.error);
        return;
      }
      formRef.current?.reset();
      router.push(`/emergency-drills/${result.id}`);
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="drill_type">
            Drill type
          </label>
          <select id="drill_type" name="drill_type" required className="input" defaultValue="">
            <option value="" disabled>
              Select a drill type…
            </option>
            {EMERGENCY_DRILL_TYPES.map((t) => (
              <option key={t} value={t}>
                {EMERGENCY_DRILL_TYPE_LABEL[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="drill_date">
            Date carried out
          </label>
          <input id="drill_date" name="drill_date" type="date" required className="input" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label className="label" htmlFor="duration_minutes">
            Duration (minutes)
          </label>
          <input id="duration_minutes" name="duration_minutes" type="number" min={0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="children_present">
            Children present
          </label>
          <input id="children_present" name="children_present" type="number" min={0} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="staff_present">
            Staff present
          </label>
          <input id="staff_present" name="staff_present" type="number" min={0} className="input" />
        </div>
      </div>

      <label className="flex w-fit items-center gap-2 text-sm font-medium text-ocean-900">
        <input
          type="checkbox"
          name="children_involved"
          className="h-4 w-4 rounded border-ocean-300 text-ocean-600 focus:ring-ocean-500"
          checked={childrenInvolved}
          onChange={(e) => setChildrenInvolved(e.target.checked)}
        />
        Children took part in this drill
      </label>
      {!childrenInvolved && (
        <p className="-mt-3 text-xs text-ocean-500">
          Lockdown drills are often practised by staff only, without children present — that&apos;s expected and
          doesn&apos;t need an explanation here.
        </p>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="assembly_point">
            Assembly point used
          </label>
          <input id="assembly_point" name="assembly_point" type="text" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="conducted_by">
            Conducted by
          </label>
          <input id="conducted_by" name="conducted_by" type="text" className="input" placeholder="Name(s)" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="what_happened">
          What happened
        </label>
        <textarea
          id="what_happened"
          name="what_happened"
          className="input min-h-[80px]"
          placeholder="Describe how the drill was carried out"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <div>
          <label className="label" htmlFor="what_went_well">
            What went well
          </label>
          <textarea id="what_went_well" name="what_went_well" className="input min-h-[70px]" />
        </div>
        <div>
          <label className="label" htmlFor="improvements_needed">
            Issues encountered / improvements needed
          </label>
          <textarea id="improvements_needed" name="improvements_needed" className="input min-h-[70px]" />
        </div>
      </div>

      <div>
        <label className="label" htmlFor="evaluation_notes">
          Evaluation — how this informs the emergency plan
        </label>
        <textarea
          id="evaluation_notes"
          name="evaluation_notes"
          className="input min-h-[70px]"
          placeholder="Does this drill change anything in the service's emergency plan? Note it here so it feeds into the annual review."
        />
      </div>

      {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" onClick={() => router.push("/emergency-drills")} className="btn-ghost">
          Cancel
        </button>
        <button type="submit" disabled={pending} className="btn-primary">
          {pending ? "Saving…" : "Save drill record"}
        </button>
      </div>
    </form>
  );
}

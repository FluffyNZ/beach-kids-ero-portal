"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { addStaffNote, deleteStaffNote } from "@/lib/actions/staff";
import { TrashIcon } from "@/components/icons";
import { formatDateTime } from "@/lib/utils";
import type { StaffNote, StaffAccessLevel } from "@/lib/types";

/** Dated management notes, each showing who added it — restricted to
 * authorised management, per the brief's "confidential notes" requirement.
 * A restricted viewer never even receives the real `notes` array from the
 * server (see getStaffById) — this component just renders whatever
 * accessLevel/notes it's handed, so there's one clear place that decides
 * what gets shown. */
export function StaffNotesPanel({
  staffId,
  notes,
  accessLevel,
}: {
  staffId: string;
  notes: StaffNote[];
  accessLevel: StaffAccessLevel;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);

  if (accessLevel !== "full") {
    return (
      <div className="card flex flex-col items-center gap-2 p-8 text-center">
        <p className="text-sm font-medium text-charcoal">Restricted — authorised management only</p>
        <p className="max-w-sm text-sm text-charcoal/50">
          Notes on this profile are confidential and only visible to authorised management accounts.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <form
        className="card flex flex-col gap-2 p-4"
        onSubmit={(e) => {
          e.preventDefault();
          setError(null);
          startTransition(async () => {
            const result = await addStaffNote(staffId, body);
            if (!result.success) {
              setError(result.error);
              return;
            }
            setBody("");
            router.refresh();
          });
        }}
      >
        <label className="label">Add a note</label>
        <textarea className="input min-h-[70px]" value={body} onChange={(e) => setBody(e.target.value)} />
        {error && <p className="text-xs text-status-action">{error}</p>}
        <div className="flex justify-end">
          <button type="submit" disabled={pending || !body.trim()} className="btn-primary">
            {pending ? "Saving…" : "Add note"}
          </button>
        </div>
      </form>

      {notes.length === 0 ? (
        <p className="text-sm text-charcoal/50">No notes recorded yet.</p>
      ) : (
        <ul className="flex flex-col gap-3">
          {notes.map((n) => (
            <li key={n.id} className="card flex items-start justify-between gap-3 p-4">
              <div className="min-w-0 flex-1">
                <p className="whitespace-pre-wrap text-sm text-charcoal">{n.body}</p>
                <p className="mt-1.5 text-xs text-charcoal/40">
                  {formatDateTime(n.created_at)}
                  {n.created_by_name ? ` · ${n.created_by_name}` : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={pending}
                className="shrink-0 rounded-lg p-1.5 text-charcoal/30 hover:bg-status-actionBg hover:text-status-action"
                onClick={() =>
                  startTransition(async () => {
                    await deleteStaffNote(staffId, n.id);
                    router.refresh();
                  })
                }
              >
                <TrashIcon className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

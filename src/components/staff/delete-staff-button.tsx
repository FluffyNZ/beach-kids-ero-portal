"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { deleteStaffMember } from "@/lib/actions/staff";
import { TrashIcon } from "@/components/icons";

/** Permanently deletes a staff profile — their documents, qualification
 * record and safety-check status all go with them. There's no undo, so
 * this asks the manager to type the person's exact name before it does
 * anything, rather than a single click or a plain browser confirm(). */
export function DeleteStaffButton({ staffId, fullName }: { staffId: string; fullName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Case- and whitespace-insensitive on purpose — the point is making sure
  // you meant to type this person's name, not a spelling/capitalisation test.
  const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");
  const canDelete = confirmText.trim().length > 0 && normalize(confirmText) === normalize(fullName);

  function handleClose() {
    setOpen(false);
    setConfirmText("");
    setError(null);
  }

  function handleDelete() {
    if (!canDelete) return;
    setError(null);
    startTransition(async () => {
      try {
        const result = await deleteStaffMember(staffId);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push("/staff");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong deleting this profile.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="btn-ghost text-status-action hover:bg-status-actionBg"
      >
        <TrashIcon className="h-4 w-4" />
        Delete staff profile
      </button>

      <Modal open={open} onClose={handleClose} title="Delete staff profile">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-charcoal/70">
            This permanently deletes <span className="font-medium text-charcoal">{fullName}</span>&apos;s profile,
            including every document, their qualification record and their safety-check checklist status. This
            can&apos;t be undone.
          </p>
          <p className="text-sm text-charcoal/70">
            If you just want to record that they no longer work here, close this and use{" "}
            <span className="font-medium text-charcoal">Mark as former staff</span> on their profile instead — it
            keeps their history.
          </p>
          <div>
            <label className="label">
              Type <span className="font-semibold text-charcoal">{fullName}</span> to confirm (not case sensitive)
            </label>
            <input
              className="input"
              value={confirmText}
              onChange={(e) => setConfirmText(e.target.value)}
              autoFocus
              autoComplete="off"
            />
            {confirmText.trim().length > 0 && (
              <p className={`mt-1 text-xs ${canDelete ? "text-status-ready" : "text-charcoal/40"}`}>
                {canDelete ? "✓ Name matches" : "Doesn't match yet"}
              </p>
            )}
          </div>

          {error && <p className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={handleClose} className="btn-ghost">
              Cancel
            </button>
            <button type="button" disabled={!canDelete || pending} className="btn-danger" onClick={handleDelete}>
              {pending ? "Deleting…" : "Permanently delete"}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}

"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { deleteChild } from "@/lib/actions/children";
import { TrashIcon } from "@/components/icons";

/** Permanently deletes a child's profile — their WINZ subsidy record goes
 * with them. There's no undo, so this asks for the child's exact name
 * first, same as the staff delete flow. */
export function DeleteChildButton({ childId, fullName }: { childId: string; fullName: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

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
        const result = await deleteChild(childId);
        if (!result.success) {
          setError(result.error);
          return;
        }
        router.push("/children");
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
        Delete child profile
      </button>

      <Modal open={open} onClose={handleClose} title="Delete child profile">
        <div className="flex flex-col gap-4">
          <p className="text-sm text-charcoal/70">
            This permanently deletes <span className="font-medium text-charcoal">{fullName}</span>&apos;s profile,
            including their fee settings and WINZ subsidy record. This can&apos;t be undone.
          </p>
          <p className="text-sm text-charcoal/70">
            If they&apos;ve just stopped attending, close this and use{" "}
            <span className="font-medium text-charcoal">Mark as no longer attending</span> on their profile instead
            — it keeps their history.
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

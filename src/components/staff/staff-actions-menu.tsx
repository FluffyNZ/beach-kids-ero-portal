"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { MoreIcon } from "@/components/icons";
import { useRecordEdit } from "@/components/ui/record-shell";
import { DeleteStaffButton } from "./delete-staff-button";
import { setStaffStatus } from "@/lib/actions/staff";

/** The staff profile's "More" menu — the less frequent and more sensitive
 * actions, kept out of the header. Changing someone to former staff (or
 * back) asks for confirmation; deleting asks for their name. */
export function StaffActionsMenu({
  staffId,
  fullName,
  status,
}: {
  staffId: string;
  fullName: string;
  status: "active" | "former";
}) {
  const router = useRouter();
  const { openEdit } = useRecordEdit();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const nextStatus = status === "active" ? "former" : "active";

  useEffect(() => {
    if (!open) return;
    menuRef.current?.querySelector<HTMLButtonElement>('[role="menuitem"]')?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        setOpen(false);
        buttonRef.current?.focus();
      }
      if (e.key === "ArrowDown" || e.key === "ArrowUp") {
        e.preventDefault();
        const items = Array.from(menuRef.current?.querySelectorAll<HTMLButtonElement>('[role="menuitem"]') ?? []);
        const idx = items.indexOf(document.activeElement as HTMLButtonElement);
        const next = e.key === "ArrowDown" ? (idx + 1) % items.length : (idx - 1 + items.length) % items.length;
        items[next]?.focus();
      }
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  function choose(action: () => void) {
    setOpen(false);
    action();
  }

  function applyStatus() {
    setError(null);
    startTransition(async () => {
      try {
        await setStaffStatus(staffId, nextStatus);
        setConfirmStatus(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't update this person's status. Please try again.");
      }
    });
  }

  const itemClass =
    "flex w-full items-start rounded-lg px-3 py-2 text-left text-sm text-charcoal transition-colors hover:bg-lilac-50 focus:bg-lilac-50 focus:outline-none";

  return (
    <>
      <div className="relative">
        <button
          ref={buttonRef}
          type="button"
          className="btn-secondary px-3"
          aria-haspopup="menu"
          aria-expanded={open}
          aria-controls={menuId}
          onClick={() => setOpen((o) => !o)}
        >
          <MoreIcon className="h-4 w-4" />
          <span className="sr-only sm:not-sr-only">More</span>
        </button>
        {open && (
          <>
            <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden="true" />
            <div
              ref={menuRef}
              id={menuId}
              role="menu"
              aria-label={`More actions for ${fullName}`}
              className="absolute right-0 z-40 mt-2 w-64 max-w-[calc(100vw-2rem)] rounded-xl border border-charcoal/10 bg-white p-1.5 shadow-cardHover"
            >
              <button type="button" role="menuitem" className={itemClass} onClick={() => choose(openEdit)}>
                Change photo or details
              </button>
              <div className="my-1 border-t border-charcoal/10" role="separator" />
              <button type="button" role="menuitem" className={itemClass} onClick={() => choose(() => setConfirmStatus(true))}>
                {status === "active" ? "Mark as former staff…" : "Mark as active staff…"}
              </button>
              <button
                type="button"
                role="menuitem"
                className={`${itemClass} hover:bg-status-actionBg focus:bg-status-actionBg`}
                onClick={() => choose(() => setDeleteOpen(true))}
              >
                Delete profile…
              </button>
            </div>
          </>
        )}
      </div>

      <Modal
        open={confirmStatus}
        onClose={() => !pending && setConfirmStatus(false)}
        title={status === "active" ? "Mark as former staff?" : "Mark as active staff?"}
      >
        <div className="flex flex-col gap-4">
          {status === "active" ? (
            <p className="text-sm text-charcoal">
              {fullName} will move to <span className="font-medium">Former</span> staff and drop out of active staff
              lists. Their profile, documents, qualifications and notes are all kept, and you can mark them as active
              again at any time. Any shifts already on the roster aren&apos;t changed.
            </p>
          ) : (
            <p className="text-sm text-charcoal">
              {fullName} will move back to <span className="font-medium">Active</span> staff. Check their room,
              employment details and documents afterwards.
            </p>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-status-actionBg px-3 py-2 text-sm text-charcoal">
              {error}
            </p>
          )}
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-secondary" disabled={pending} onClick={() => setConfirmStatus(false)}>
              Cancel
            </button>
            <button type="button" className="btn-primary" disabled={pending} onClick={applyStatus}>
              {pending ? "Saving…" : status === "active" ? "Mark as former staff" : "Mark as active"}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteStaffButton staffId={staffId} fullName={fullName} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

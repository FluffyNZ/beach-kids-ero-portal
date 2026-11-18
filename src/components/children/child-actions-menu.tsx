"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Modal } from "@/components/ui/modal";
import { MoreIcon } from "@/components/icons";
import { DeleteChildButton } from "./delete-child-button";
import { useProfileEdit } from "./child-profile-shell";
import { setChildStatus } from "@/lib/actions/children";

/** The profile's "More" menu: the less frequent and more sensitive actions,
 * kept out of the header so they can't be clicked by accident. Changing
 * attendance asks for confirmation first; deleting asks for the child's
 * name (the existing delete dialog). */
export function ChildActionsMenu({
  childId,
  fullName,
  status,
}: {
  childId: string;
  fullName: string;
  status: "active" | "left";
}) {
  const router = useRouter();
  const { openEdit } = useProfileEdit();
  const menuId = useId();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [confirmStatus, setConfirmStatus] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const firstName = fullName.trim().split(/\s+/)[0] || fullName;
  const nextStatus = status === "active" ? "left" : "active";

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
        await setChildStatus(childId, nextStatus);
        setConfirmStatus(false);
        router.refresh();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Couldn't update attendance. Please try again.");
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
                {status === "active" ? "Mark as no longer attending…" : "Mark as attending again…"}
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
        title={status === "active" ? "Mark as no longer attending?" : "Mark as attending again?"}
      >
        <div className="flex flex-col gap-4">
          {status === "active" ? (
            <p className="text-sm text-charcoal">
              {fullName} will move to <span className="font-medium">Former</span> children and won&apos;t appear in
              active lists, rolls or on the staff-room tablet. Their profile, contacts, bookings and invoices are kept,
              and you can mark them as attending again at any time.
            </p>
          ) : (
            <p className="text-sm text-charcoal">
              {fullName} will move back to <span className="font-medium">Active</span> children and appear in active
              lists, rolls and on the staff-room tablet again. Check {firstName}&apos;s room and booked sessions
              afterwards.
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
              {pending ? "Saving…" : status === "active" ? "Mark as no longer attending" : "Mark as attending"}
            </button>
          </div>
        </div>
      </Modal>

      <DeleteChildButton childId={childId} fullName={fullName} open={deleteOpen} onOpenChange={setDeleteOpen} />
    </>
  );
}

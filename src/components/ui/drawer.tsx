"use client";

import { useEffect, useId, useRef } from "react";
import { CloseIcon } from "@/components/icons";

/** A panel that slides in from the right (full screen on phones) for
 * editing without leaving the page. Escape and the backdrop call
 * `onRequestClose`, which lets the editor check for unsaved changes first.
 * `footer` stays pinned to the bottom (save buttons, save status). */
export function Drawer({
  open,
  onRequestClose,
  title,
  description,
  footer,
  children,
}: {
  open: boolean;
  onRequestClose: () => void;
  title: string;
  description?: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}) {
  const headingId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onRequestClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    panelRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      previouslyFocused?.focus?.();
    };
  }, [open, onRequestClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div className="absolute inset-0 bg-charcoal/40" onClick={onRequestClose} aria-hidden="true" />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={headingId}
        tabIndex={-1}
        className="relative z-10 flex h-full w-full flex-col bg-white shadow-cardHover focus:outline-none sm:max-w-xl sm:rounded-l-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-charcoal/10 px-5 py-4 sm:px-6">
          <div className="min-w-0">
            <h2 id={headingId} className="text-lg font-semibold text-charcoal">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-sm text-charcoal/70">{description}</p>}
          </div>
          <button
            type="button"
            onClick={onRequestClose}
            aria-label="Close"
            className="rounded-lg p-2 text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
          >
            <CloseIcon className="h-5 w-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-5 sm:px-6">{children}</div>
        {footer && <footer className="border-t border-charcoal/10 bg-white px-5 py-3.5 sm:px-6">{footer}</footer>}
      </div>
    </div>
  );
}

"use client";

import { useEffect } from "react";

// Phase 3 (Contra visual refit): narrowed from max-w-lg/max-w-3xl
// (512px/768px) to Contra's ~520-700px modal width band.
const SIZE_CLASS = {
  md: "max-w-xl", // 576px
  lg: "max-w-2xl", // 672px
};

export function Modal({
  open,
  onClose,
  title,
  children,
  size = "md",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  size?: "md" | "lg";
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Phase 3: neutral dark translucent backdrop (was the legacy
          coastal "ocean" blue tint) — matches the rest of the shell's
          near-black/neutral system rather than the old ocean palette. */}
      <div className="absolute inset-0 bg-charcoal/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative z-10 max-h-[90vh] w-full ${SIZE_CLASS[size]} overflow-y-auto rounded-2xl bg-white p-6 shadow-cardHover sm:p-7`}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-charcoal">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full p-1 text-charcoal/40 hover:bg-charcoal/5 hover:text-charcoal"
          >
            ✕
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

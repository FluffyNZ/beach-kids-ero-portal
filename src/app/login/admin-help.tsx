"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { authLinkClass } from "@/components/auth/auth-fields";

/** "Having trouble signing in? Contact your centre administrator." — the
 * link opens a small help panel in place (a disclosure, not a pop-up), so
 * it works with a keyboard and screen readers and never covers the form.
 *
 * Deliberately shows NO contact details: this sign-in page isn't tied to a
 * specific centre (there's no centre-specific login address), so nothing
 * about who runs which centre is known here — and nothing is ever looked up
 * from the email typed above, so the page can't be used to check whether
 * someone has an account. If centre-specific login addresses are added
 * later, that centre's own published contact details could be passed in
 * here. */
export function AdminHelp() {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const headingRef = useRef<HTMLHeadingElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (open) headingRef.current?.focus();
  }, [open]);

  function close() {
    setOpen(false);
    triggerRef.current?.focus();
  }

  return (
    <div className="mt-8 text-center">
      <p className="text-base text-charcoal/75">
        Having trouble signing in?{" "}
        <button
          ref={triggerRef}
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={panelId}
          className={`${authLinkClass} underline decoration-lilac-400 decoration-2 underline-offset-4`}
        >
          Contact your centre administrator
        </button>
        .
      </p>

      <div
        id={panelId}
        hidden={!open}
        onKeyDown={(e) => {
          if (e.key === "Escape") {
            e.stopPropagation();
            close();
          }
        }}
        className="mt-5 rounded-xl border border-lilac-200 bg-lilac-50 p-5 text-left"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 ref={headingRef} tabIndex={-1} className="text-lg font-semibold text-charcoal focus:outline-none">
            Need a hand?
          </h2>
          <button
            type="button"
            onClick={close}
            aria-label="Close help"
            className="-mr-1 -mt-1 flex h-9 w-9 shrink-0 items-center justify-center rounded-md text-charcoal/70 hover:bg-charcoal/5 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
          >
            <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
              <path d="M6 6l12 12M18 6L6 18" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <p className="mt-2 text-base leading-relaxed text-charcoal/80">
          Your centre administrator can help with account access and invitations. If you&apos;ve forgotten your
          password, use the{" "}
          <Link href="/forgot-password" className={`${authLinkClass} underline`}>
            password-reset link
          </Link>
          .
        </p>
      </div>
    </div>
  );
}

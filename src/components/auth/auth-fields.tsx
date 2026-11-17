"use client";

import { useState } from "react";

// Shared field styling for the signed-out pages, matching the sign-in
// design: sentence-case labels, tall rounded inputs, clear focus ring.

export const authLabelClass = "mb-2.5 block text-[1.0625rem] font-semibold text-charcoal";

export const authInputClass =
  "block w-full rounded-[0.6rem] border border-charcoal/50 bg-white px-5 py-4 text-lg text-charcoal placeholder:text-charcoal/65 transition-colors hover:border-charcoal/70 focus:border-charcoal focus:outline-none focus:ring-4 focus:ring-lilac-400/40 aria-[invalid=true]:border-status-action";

export const authButtonClass =
  "flex w-full items-center justify-center gap-2 rounded-[0.6rem] bg-charcoal px-6 py-4 text-lg font-semibold text-white transition-colors hover:bg-charcoal/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-70";

export const authLinkClass =
  "rounded font-medium text-lilac-700 underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-lilac-700 focus-visible:ring-offset-2";

function EyeOpen() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12Z" strokeLinejoin="round" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeClosed() {
  return (
    <svg viewBox="0 0 24 24" className="h-6 w-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <path d="M3 3l18 18" strokeLinecap="round" />
      <path d="M10.6 5.1A10.6 10.6 0 0 1 12 5c6.4 0 10 7 10 7a17.7 17.7 0 0 1-3.2 4.1M6.6 6.6C3.8 8.4 2 12 2 12s3.6 7 10 7a9.9 9.9 0 0 0 5.4-1.6" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2" strokeLinecap="round" />
    </svg>
  );
}

/** A password input with a show/hide eye button inside it. */
export function PasswordInput({
  id,
  name,
  autoComplete,
  placeholder,
  describedBy,
  invalid = false,
  minLength,
}: {
  id: string;
  name: string;
  autoComplete: "current-password" | "new-password";
  placeholder?: string;
  describedBy?: string;
  invalid?: boolean;
  minLength?: number;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="relative">
      <input
        id={id}
        name={name}
        type={visible ? "text" : "password"}
        autoComplete={autoComplete}
        placeholder={placeholder}
        required
        minLength={minLength}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className={`${authInputClass} pr-16`}
      />
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? "Hide password" : "Show password"}
        aria-pressed={visible}
        aria-controls={id}
        className="absolute inset-y-2 right-2 flex w-12 items-center justify-center rounded-md text-charcoal/70 transition-colors hover:bg-charcoal/5 hover:text-charcoal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal"
      >
        {visible ? <EyeClosed /> : <EyeOpen />}
      </button>
    </div>
  );
}

export function FormMessage({ id, tone, children }: { id?: string; tone: "error" | "success"; children: React.ReactNode }) {
  return (
    <p
      id={id}
      role={tone === "error" ? "alert" : "status"}
      className={`rounded-[0.6rem] px-4 py-3 text-base ${
        tone === "error" ? "bg-status-actionBg text-charcoal" : "bg-status-readyBg text-charcoal"
      }`}
    >
      {children}
    </p>
  );
}

export function Spinner() {
  return (
    <span
      className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white motion-reduce:animate-none"
      aria-hidden="true"
    />
  );
}

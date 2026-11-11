"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { unlockStaffroom } from "@/lib/staffroom/actions";

const MAX_LENGTH = 12;
const MIN_LENGTH = 4;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** Full-screen PIN pad for the staff-room tablet — big touch targets, no
 * text field (so the on-screen keyboard never pops up and covers things),
 * and a physical keyboard works too. */
export function PinScreen() {
  const router = useRouter();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const pinRef = useRef("");
  pinRef.current = pin;

  const submit = useCallback(
    (value: string) => {
      if (value.length < MIN_LENGTH) {
        setError(`Enter your ${MIN_LENGTH}+ digit PIN.`);
        return;
      }
      setError(null);
      startTransition(async () => {
        const result = await unlockStaffroom(value);
        if (!result.success) {
          setError(result.error);
          setPin("");
          return;
        }
        router.refresh();
      });
    },
    [router]
  );

  const press = useCallback((digit: string) => {
    setError(null);
    setPin((current) => (current.length >= MAX_LENGTH ? current : current + digit));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((current) => current.slice(0, -1));
      else if (e.key === "Enter") submit(pinRef.current);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, submit]);

  const keyClass =
    "flex h-16 items-center justify-center rounded-2xl border border-charcoal/10 bg-white text-2xl font-semibold text-charcoal transition-colors active:bg-charcoal/10 disabled:opacity-50 sm:h-20";

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <h1 className="font-display text-3xl font-bold text-charcoal">Beach Kids</h1>
          <p className="mt-1 text-sm text-charcoal/60">Staff room contacts — enter the PIN to unlock</p>
        </div>

        <div className="mb-3 flex h-6 items-center justify-center gap-2" aria-hidden="true">
          {Array.from({ length: Math.max(MIN_LENGTH, pin.length) }).map((_, i) => (
            <span
              key={i}
              className={`h-3.5 w-3.5 rounded-full border border-charcoal/30 ${i < pin.length ? "bg-charcoal" : "bg-transparent"}`}
            />
          ))}
        </div>

        <p className="mb-4 h-5 text-center text-sm text-status-action" role="alert" aria-live="polite">
          {error}
        </p>

        <div className="grid grid-cols-3 gap-3">
          {DIGITS.map((digit) => (
            <button key={digit} type="button" className={keyClass} disabled={pending} onClick={() => press(digit)}>
              {digit}
            </button>
          ))}
          <button
            type="button"
            className={`${keyClass} text-base`}
            disabled={pending || pin.length === 0}
            onClick={() => setPin((current) => current.slice(0, -1))}
            aria-label="Delete last digit"
          >
            ⌫
          </button>
          <button type="button" className={keyClass} disabled={pending} onClick={() => press("0")}>
            0
          </button>
          <button
            type="button"
            className={`${keyClass} bg-charcoal text-base text-white active:bg-charcoal/80`}
            disabled={pending || pin.length < MIN_LENGTH}
            onClick={() => submit(pin)}
          >
            {pending ? "…" : "Unlock"}
          </button>
        </div>
      </div>
    </div>
  );
}

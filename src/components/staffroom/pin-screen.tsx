"use client";

import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { unlockStaffroom } from "@/lib/staffroom/actions";
import { Logo } from "@/components/brand/logo";

const MAX_LENGTH = 12;
const MIN_LENGTH = 4;
const DIGITS = ["1", "2", "3", "4", "5", "6", "7", "8", "9"] as const;

/** The contacts PIN keypad on its own — big touch targets, no text field
 * (so the on-screen keyboard never pops up and covers things), and a
 * physical keyboard works too. Used full-screen on /staffroom and inline on
 * the login page's "Contacts PIN" tab. `onUnlocked` decides what happens
 * after a correct PIN. */
export function PinPad({ onUnlocked }: { onUnlocked: () => void }) {
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
        onUnlocked();
      });
    },
    [onUnlocked]
  );

  const press = useCallback((digit: string) => {
    setError(null);
    setPin((current) => (current.length >= MAX_LENGTH ? current : current + digit));
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (/^\d$/.test(e.key)) press(e.key);
      else if (e.key === "Backspace") setPin((current) => current.slice(0, -1));
      else if (e.key === "Enter") submit(pinRef.current);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [press, submit]);

  const keyClass =
    "flex h-16 items-center justify-center rounded-2xl border border-charcoal/10 bg-white text-2xl font-semibold text-charcoal transition-colors active:bg-charcoal/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-charcoal/40 disabled:opacity-50";

  return (
    <div>
      <div className="mb-3 flex h-6 items-center justify-center gap-2" aria-hidden="true">
        {Array.from({ length: Math.max(MIN_LENGTH, pin.length) }).map((_, i) => (
          <span
            key={i}
            className={`h-3.5 w-3.5 rounded-full border border-charcoal/30 ${i < pin.length ? "bg-charcoal" : "bg-transparent"}`}
          />
        ))}
      </div>
      <p className="sr-only" aria-live="polite">
        {pin.length === 0 ? "No digits entered" : `${pin.length} digit${pin.length === 1 ? "" : "s"} entered`}
      </p>

      <p className="mb-4 min-h-5 text-center text-sm text-status-action" role="alert" aria-live="polite">
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
          {pending ? "Checking…" : "Unlock"}
        </button>
      </div>
    </div>
  );
}

/** Full-screen PIN page for /staffroom (the contacts tablet). */
export function PinScreen() {
  const router = useRouter();
  const onUnlocked = useCallback(() => router.refresh(), [router]);

  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex flex-col items-center text-center">
          <Logo variant="full" height={34} />
          <h1 className="mt-6 text-2xl font-semibold tracking-tight text-charcoal">Children&apos;s contacts</h1>
          <p className="mt-1 text-sm text-charcoal/70">Beach Kids · enter the contacts PIN to unlock</p>
        </div>

        <PinPad onUnlocked={onUnlocked} />

        <p className="mt-8 text-center text-sm">
          <Link href="/login" className="font-medium text-charcoal/70 underline-offset-4 hover:text-charcoal hover:underline">
            Staff sign in instead
          </Link>
        </p>
      </div>
    </div>
  );
}

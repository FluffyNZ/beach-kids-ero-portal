import "server-only";
import { headers } from "next/headers";

// Best-effort brake on wrong-PIN guessing: 5 wrong tries from the same
// address locks that address out for 10 minutes.
//
// Honest limitation: this is an in-memory counter, and on Vercel's serverless
// platform each running instance keeps its own — so it slows a casual guesser
// down but is not a hard guarantee against a determined, distributed attack.
// That's why the PIN is required to be 4–12 digits (6+ recommended), every
// wrong try also costs a deliberate ~1 second delay (see actions.ts), and why
// the page itself is not linked from anywhere and is marked noindex.

const MAX_FAILURES = 5;
const WINDOW_MS = 10 * 60 * 1000;
const LOCKOUT_MS = 10 * 60 * 1000;
const MAX_TRACKED = 500;

type Entry = { failures: number; windowStart: number; lockedUntil: number };
const attempts = new Map<string, Entry>();

export function clientKey(): string {
  const h = headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}

function prune(now: number) {
  if (attempts.size <= MAX_TRACKED) return;
  attempts.forEach((entry, key) => {
    if (entry.lockedUntil < now && now - entry.windowStart > WINDOW_MS) attempts.delete(key);
  });
}

/** Seconds left on this address's lockout, or 0 if it isn't locked out. */
export function lockoutSecondsRemaining(key: string): number {
  const entry = attempts.get(key);
  if (!entry) return 0;
  const now = Date.now();
  return entry.lockedUntil > now ? Math.ceil((entry.lockedUntil - now) / 1000) : 0;
}

export function recordFailure(key: string): void {
  const now = Date.now();
  prune(now);
  const entry = attempts.get(key);
  if (!entry || now - entry.windowStart > WINDOW_MS) {
    attempts.set(key, { failures: 1, windowStart: now, lockedUntil: 0 });
    return;
  }
  entry.failures += 1;
  if (entry.failures >= MAX_FAILURES) entry.lockedUntil = now + LOCKOUT_MS;
}

export function clearFailures(key: string): void {
  attempts.delete(key);
}

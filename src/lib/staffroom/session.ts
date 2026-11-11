import "server-only";
import { createHash, createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

// The staff-room tablet page (/staffroom) is deliberately NOT behind the
// portal's normal Supabase login — the tablet stays on in the staff room and
// shouldn't be signed in to the whole portal. It has its own, separate PIN
// gate instead, built from the pieces in this file:
//
//   - The PIN itself lives in the STAFFROOM_PIN environment variable (set in
//     Vercel), not in the database — so there's no schema change, and nothing
//     about it is readable from the app's data.
//   - Entering the right PIN sets a short-lived, signed, HttpOnly cookie
//     scoped to /staffroom only (so it's never sent to any other part of the
//     site). The signing key is derived from the PIN itself, so changing the
//     PIN in Vercel instantly invalidates every tablet that's currently
//     unlocked.
//   - The session is "sliding": the page keeps it alive while someone is
//     actually using it and re-locks itself after a few minutes of no touches
//     (see components/staffroom/staffroom-app.tsx). The server-side expiry
//     below is the backstop if the tablet's browser ever stops running that
//     timer (asleep, frozen, etc).

export const STAFFROOM_COOKIE = "bk_staffroom";
export const STAFFROOM_PATH = "/staffroom";

/** How long the cookie lasts without being refreshed. The page refreshes it
 * about once a minute while it's being used, and locks itself after 5
 * minutes of no activity — this is the server-enforced outer limit. */
export const SESSION_IDLE_SECONDS = 10 * 60;

const PIN_FORMAT = /^\d{4,12}$/;

export type PinConfig = { state: "ready"; pin: string } | { state: "missing" } | { state: "invalid" };

/** Reads STAFFROOM_PIN. A missing or badly-formed value means the page stays
 * locked for everyone — it never falls back to "no PIN needed". */
export function getPinConfig(): PinConfig {
  const raw = process.env.STAFFROOM_PIN?.trim();
  if (!raw) return { state: "missing" };
  if (!PIN_FORMAT.test(raw)) return { state: "invalid" };
  return { state: "ready", pin: raw };
}

export function isWellFormedPin(value: string): boolean {
  return PIN_FORMAT.test(value);
}

function digest(value: string): Buffer {
  return createHash("sha256").update(value).digest();
}

/** Constant-time comparison (both sides hashed first so they're the same
 * length, which timingSafeEqual requires). */
export function pinMatches(candidate: string, pin: string): boolean {
  return timingSafeEqual(digest(candidate), digest(pin));
}

function signingKey(pin: string): Buffer {
  return digest(`staffroom-session-v1|${pin}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ""}`);
}

function sign(pin: string, expiresAt: number): string {
  return createHmac("sha256", signingKey(pin)).update(String(expiresAt)).digest("hex");
}

function makeToken(pin: string, expiresAt: number): string {
  return `${expiresAt}.${sign(pin, expiresAt)}`;
}

function tokenIsValid(pin: string, token: string | undefined): boolean {
  if (!token) return false;
  const [expiresRaw, signature] = token.split(".");
  const expiresAt = Number(expiresRaw);
  if (!signature || !Number.isFinite(expiresAt) || expiresAt < Date.now()) return false;
  const expected = Buffer.from(sign(pin, expiresAt), "hex");
  const given = Buffer.from(signature, "hex");
  return given.length === expected.length && timingSafeEqual(given, expected);
}

/** True only if the PIN is configured AND this request carries a current,
 * correctly-signed staff-room cookie. Read-only, so safe to call from a
 * Server Component. */
export function hasValidStaffroomSession(): boolean {
  const config = getPinConfig();
  if (config.state !== "ready") return false;
  return tokenIsValid(config.pin, cookies().get(STAFFROOM_COOKIE)?.value);
}

const BASE_COOKIE = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "strict" as const,
  path: STAFFROOM_PATH,
};

/** Sets (or refreshes) the session cookie. Server Actions / Route Handlers
 * only — cookies can't be written during a Server Component render. */
export function startStaffroomSession(pin: string): void {
  cookies().set({
    ...BASE_COOKIE,
    name: STAFFROOM_COOKIE,
    value: makeToken(pin, Date.now() + SESSION_IDLE_SECONDS * 1000),
    maxAge: SESSION_IDLE_SECONDS,
  });
}

export function endStaffroomSession(): void {
  cookies().set({ ...BASE_COOKIE, name: STAFFROOM_COOKIE, value: "", maxAge: 0 });
}

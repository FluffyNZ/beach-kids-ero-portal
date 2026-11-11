"use server";

import {
  endStaffroomSession,
  getPinConfig,
  hasValidStaffroomSession,
  isWellFormedPin,
  pinMatches,
  startStaffroomSession,
} from "./session";
import { clearFailures, clientKey, lockoutSecondsRemaining, recordFailure } from "./throttle";

export type UnlockResult = { success: true } | { success: false; error: string };

/** Checks the PIN typed on the tablet and, if it's right, starts a session.
 * Every wrong try costs ~1.2 seconds on purpose (slows guessing) and counts
 * toward a temporary lockout — see throttle.ts. */
export async function unlockStaffroom(pin: string): Promise<UnlockResult> {
  const config = getPinConfig();
  if (config.state !== "ready") {
    return { success: false, error: "This page isn't set up yet — ask the manager." };
  }

  const key = clientKey();
  const waitSeconds = lockoutSecondsRemaining(key);
  if (waitSeconds > 0) {
    const minutes = Math.max(1, Math.ceil(waitSeconds / 60));
    return {
      success: false,
      error: `Too many wrong tries. Please wait ${minutes} minute${minutes === 1 ? "" : "s"} and try again.`,
    };
  }

  const candidate = String(pin ?? "").trim();
  if (!isWellFormedPin(candidate) || !pinMatches(candidate, config.pin)) {
    recordFailure(key);
    await new Promise((resolve) => setTimeout(resolve, 1200));
    return { success: false, error: "That PIN isn't right." };
  }

  clearFailures(key);
  startStaffroomSession(config.pin);
  return { success: true };
}

/** Locks the tablet again immediately (the Lock button, or the idle timer). */
export async function lockStaffroom(): Promise<void> {
  endStaffroomSession();
}

/** Called about once a minute while the page is actually being used, to push
 * the session's server-side expiry forward. Never extends a session that has
 * already expired or been locked. */
export async function keepStaffroomAlive(): Promise<{ active: boolean }> {
  const config = getPinConfig();
  if (config.state !== "ready" || !hasValidStaffroomSession()) return { active: false };
  startStaffroomSession(config.pin);
  return { active: true };
}

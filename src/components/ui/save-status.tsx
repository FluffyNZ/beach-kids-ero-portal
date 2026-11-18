"use client";

import { useCallback, useState } from "react";
import { cn } from "@/lib/utils";

export type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

/** Tracks a form's save state — "unsaved changes", "saving…", "saved" or
 * "not saved" — so every editor in Earlydesk reports it the same way.
 * `run` wraps the save call; any error message is kept for display. */
export function useSaveState() {
  const [state, setState] = useState<SaveState>("idle");
  const [error, setError] = useState<string | null>(null);

  const markDirty = useCallback(() => {
    setState((s) => (s === "saving" ? s : "dirty"));
  }, []);

  const run = useCallback(async (save: () => Promise<void>, fallbackError = "Something went wrong saving this.") => {
    setError(null);
    setState("saving");
    try {
      await save();
      setState("saved");
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : fallbackError);
      setState("error");
      return false;
    }
  }, []);

  const reset = useCallback(() => {
    setState("idle");
    setError(null);
  }, []);

  return { state, error, markDirty, run, reset, setState, setError };
}

/** A small live status line for a form: nothing until something changes,
 * then "Unsaved changes" → "Saving…" → "Saved" (or "Not saved"). */
export function SaveStatus({ state, className }: { state: SaveState; className?: string }) {
  return (
    <p aria-live="polite" className={cn("flex min-h-[1.25rem] items-center gap-1.5 text-sm", className)}>
      {state === "dirty" && (
        <>
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-attention" />
          <span className="text-charcoal">Unsaved changes</span>
        </>
      )}
      {state === "saving" && (
        <>
          <span
            aria-hidden="true"
            className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-charcoal/20 border-t-charcoal motion-reduce:animate-none"
          />
          <span className="text-charcoal">Saving…</span>
        </>
      )}
      {state === "saved" && (
        <>
          <svg viewBox="0 0 16 16" className="h-4 w-4 text-status-ready" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
            <path d="M3.5 8.5l3 3 6-7" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
          <span className="text-charcoal">Saved</span>
        </>
      )}
      {state === "error" && (
        <>
          <span aria-hidden="true" className="h-2 w-2 rounded-full bg-status-action" />
          <span className="text-charcoal">Not saved</span>
        </>
      )}
    </p>
  );
}

/** The standard error box under a form. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p role="alert" className="rounded-xl bg-status-actionBg px-3.5 py-2.5 text-sm text-charcoal">
      {message}
    </p>
  );
}

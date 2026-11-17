"use client";

import { useFormState, useFormStatus } from "react-dom";
import { requestPasswordReset, type ForgotPasswordState } from "./actions";
import { FormMessage, Spinner, authButtonClass, authInputClass, authLabelClass } from "@/components/auth/auth-fields";

const initialState: ForgotPasswordState = { status: "idle", message: null };

export function ForgotPasswordForm() {
  const [state, formAction] = useFormState(requestPasswordReset, initialState);

  if (state.status === "sent") {
    return <FormMessage tone="success">{state.message}</FormMessage>;
  }

  const hasError = state.status === "error";
  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="reset-email" className={authLabelClass}>
          Email address
        </label>
        <input
          id="reset-email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@yourcentre.co.nz"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "reset-error" : undefined}
          className={authInputClass}
        />
      </div>

      {hasError && (
        <FormMessage id="reset-error" tone="error">
          {state.message}
        </FormMessage>
      )}

      <div className="pt-2">
        <SubmitButton />
      </div>
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-disabled={pending} className={authButtonClass}>
      {pending && <Spinner />}
      {pending ? "Sending…" : "Send reset link"}
    </button>
  );
}

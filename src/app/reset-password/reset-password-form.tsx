"use client";

import { useFormState, useFormStatus } from "react-dom";
import { setNewPassword, type ResetPasswordState } from "./actions";
import { FormMessage, PasswordInput, Spinner, authButtonClass, authLabelClass } from "@/components/auth/auth-fields";

const initialState: ResetPasswordState = { error: null };

export function ResetPasswordForm() {
  const [state, formAction] = useFormState(setNewPassword, initialState);
  const hasError = Boolean(state.error);

  return (
    <form action={formAction} className="space-y-6">
      <div>
        <label htmlFor="new-password" className={authLabelClass}>
          New password
        </label>
        <PasswordInput
          id="new-password"
          name="password"
          autoComplete="new-password"
          minLength={8}
          invalid={hasError}
          describedBy={hasError ? "new-password-error new-password-hint" : "new-password-hint"}
        />
        <p id="new-password-hint" className="mt-2 text-sm text-charcoal/75">
          At least 8 characters.
        </p>
      </div>

      <div>
        <label htmlFor="confirm-password" className={authLabelClass}>
          Confirm new password
        </label>
        <PasswordInput
          id="confirm-password"
          name="confirm"
          autoComplete="new-password"
          minLength={8}
          invalid={hasError}
          describedBy={hasError ? "new-password-error" : undefined}
        />
      </div>

      {state.error && (
        <FormMessage id="new-password-error" tone="error">
          {state.error}
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
      {pending ? "Saving…" : "Save new password"}
    </button>
  );
}

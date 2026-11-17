"use client";

import Link from "next/link";
import { useFormState, useFormStatus } from "react-dom";
import { signIn, type LoginState } from "./actions";
import {
  FormMessage,
  PasswordInput,
  Spinner,
  authButtonClass,
  authInputClass,
  authLabelClass,
  authLinkClass,
} from "@/components/auth/auth-fields";

const initialState: LoginState = { error: null };

export default function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useFormState(signIn, initialState);
  const hasError = Boolean(state.error);

  return (
    <form action={formAction} className="space-y-6">
      <input type="hidden" name="next" value={next} />

      <div>
        <label htmlFor="email" className={authLabelClass}>
          Email address
        </label>
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          inputMode="email"
          required
          placeholder="you@yourcentre.co.nz"
          aria-invalid={hasError || undefined}
          aria-describedby={hasError ? "login-error" : undefined}
          className={authInputClass}
        />
      </div>

      <div>
        <div className="mb-2.5 flex items-baseline justify-between gap-4">
          <label htmlFor="password" className="text-[1.0625rem] font-semibold text-charcoal">
            Password
          </label>
          <Link href="/forgot-password" className={`text-base ${authLinkClass}`}>
            Forgot password?
          </Link>
        </div>
        <PasswordInput
          id="password"
          name="password"
          autoComplete="current-password"
          placeholder="Enter your password"
          invalid={hasError}
          describedBy={hasError ? "login-error" : undefined}
        />
      </div>

      {state.error && (
        <FormMessage id="login-error" tone="error">
          {state.error}
        </FormMessage>
      )}

      <div className="pt-4">
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
      {pending ? "Signing in…" : "Sign in"}
    </button>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { FormMessage, authLinkClass } from "@/components/auth/auth-fields";
import { ForgotPasswordForm } from "./forgot-password-form";

export const metadata: Metadata = {
  title: "Reset your password",
};

export default function ForgotPasswordPage({ searchParams }: { searchParams: { error?: string } }) {
  const linkProblem = searchParams?.error === "link";

  return (
    <AuthShell>
      <div className="text-center">
        <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.025em] text-charcoal sm:text-[2.5rem]">
          Reset your password
        </h1>
        <p className="mt-3 text-lg text-charcoal/75">
          Enter the email address you sign in with and we&apos;ll email you a link to choose a new password.
        </p>
      </div>

      {linkProblem && (
        <div className="mt-8">
          <FormMessage tone="error">
            That reset link has expired or has already been used. Request a new one below.
          </FormMessage>
        </div>
      )}

      <div className="mt-10">
        <ForgotPasswordForm />
      </div>

      <p className="mt-8 text-center text-base">
        <Link href="/login" className={authLinkClass}>
          ← Back to sign in
        </Link>
      </p>
    </AuthShell>
  );
}

import type { Metadata } from "next";
import Link from "next/link";
import { AuthShell } from "@/components/auth/auth-shell";
import { authButtonClass } from "@/components/auth/auth-fields";
import { createClient } from "@/lib/supabase/server";
import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = {
  title: "Choose a new password",
};

export const dynamic = "force-dynamic";

/** Reached from the emailed reset link (via /auth/confirm, which signs the
 * person in for this one purpose). Without that session there's nothing to
 * reset, so it says so plainly instead of showing a form that can't work. */
export default async function ResetPasswordPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <AuthShell>
      <div className="text-center">
        <h1 className="text-[2.25rem] font-bold leading-tight tracking-[-0.025em] text-charcoal sm:text-[2.5rem]">
          {user ? "Choose a new password" : "This link has expired"}
        </h1>
        <p className="mt-3 text-lg text-charcoal/75">
          {user
            ? "Pick something you haven't used before. You'll sign in with it straight afterwards."
            : "Password reset links only work once and for a short time. Request a new one and use it straight away."}
        </p>
      </div>

      <div className="mt-10">
        {user ? (
          <ResetPasswordForm />
        ) : (
          <Link href="/forgot-password" className={authButtonClass}>
            Request a new reset link
          </Link>
        )}
      </div>
    </AuthShell>
  );
}

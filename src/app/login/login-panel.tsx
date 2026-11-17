import Link from "next/link";
import LoginForm from "./login-form";
import { AdminHelp } from "./admin-help";
import { FormMessage, authLinkClass } from "@/components/auth/auth-fields";

/** The right-hand side of the sign-in page: heading, form, the
 * administrator help link, and — kept discreet underneath — the separate
 * contacts PIN for staff checking children's contact/pick-up details. The
 * PIN page (/staffroom) only ever shows children's contacts; it never signs
 * anyone in to the rest of Earlydesk. */
export function LoginPanel({ next, notice }: { next: string; notice: "reset" | null }) {
  return (
    <div>
      <div className="text-center">
        <h1 className="text-[2.5rem] font-bold leading-tight tracking-[-0.025em] text-charcoal sm:text-[2.75rem]">
          Welcome back
        </h1>
        <p className="mt-3 text-lg text-charcoal/75 sm:text-xl">Sign in to your Earlydesk account.</p>
      </div>

      {notice === "reset" && (
        <div className="mt-8">
          <FormMessage tone="success">Your password has been changed. Sign in with your new password.</FormMessage>
        </div>
      )}

      <div className="mt-11">
        <LoginForm next={next} />
      </div>

      <AdminHelp />

      <p className="mt-10 border-t border-charcoal/10 pt-6 text-center text-sm text-charcoal/75">
        Checking a child&apos;s contacts?{" "}
        <Link href="/staffroom" className={authLinkClass}>
          Use the contacts PIN
        </Link>
      </p>
    </div>
  );
}

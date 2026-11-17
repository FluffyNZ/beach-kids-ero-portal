import type { Metadata } from "next";
import { AuthShell } from "@/components/auth/auth-shell";
import { safeNextPath } from "@/lib/safe-redirect";
import { LoginPanel } from "./login-panel";

export const metadata: Metadata = {
  title: "Sign in",
};

export default function LoginPage({
  searchParams,
}: {
  searchParams: { next?: string; reset?: string };
}) {
  const next = safeNextPath(searchParams?.next, "/dashboard");
  const notice = searchParams?.reset === "done" ? "reset" : null;

  return (
    <AuthShell>
      <LoginPanel next={next} notice={notice} />
    </AuthShell>
  );
}

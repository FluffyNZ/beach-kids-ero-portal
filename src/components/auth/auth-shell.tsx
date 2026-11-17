import { Logo } from "@/components/brand/logo";
import { AuthDecoration } from "./auth-decoration";

/** Shared layout for the signed-out pages (sign in, forgot password, reset
 * password). Desktop: a pale lilac brand panel on the left (~46%) and the
 * form directly on white on the right (~54%). Mobile: the brand panel is
 * dropped — just the logo above the form, so the form needs no scrolling. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white lg:grid lg:grid-cols-[46fr_54fr]">
      <aside className="relative hidden overflow-hidden bg-lilac-wash lg:flex lg:flex-col lg:px-14 lg:py-14 xl:px-[4.5rem] xl:py-16">
        <div className="self-start">
          <Logo variant="full" height={64} />
        </div>
        <div className="mt-24 max-w-[34rem] xl:mt-28">
          <p className="text-[3.25rem] font-bold leading-[1.08] tracking-[-0.03em] text-charcoal xl:text-[4rem]">
            More time for what matters.
          </p>
          <p className="mt-7 max-w-[30rem] text-[1.375rem] leading-snug text-charcoal/80 xl:text-[1.6rem]">
            Your centre&apos;s people, planning and everyday admin, together.
          </p>
        </div>
        <div className="mt-auto pt-14">
          <AuthDecoration className="h-auto w-full max-w-[30rem] xl:ml-6" />
        </div>
      </aside>

      <div className="flex min-h-screen flex-col px-5 py-8 sm:px-10">
        <div className="flex justify-center pt-2 lg:hidden">
          <Logo variant="full" height={40} />
        </div>

        <main className="mx-auto flex w-full max-w-[35rem] flex-1 flex-col justify-center py-10 lg:py-16">
          {children}
        </main>

        <footer className="pb-2 text-center text-sm text-charcoal/75">Earlydesk · Built for early learning</footer>
      </div>
    </div>
  );
}

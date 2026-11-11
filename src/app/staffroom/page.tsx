import { PinScreen } from "@/components/staffroom/pin-screen";
import { StaffroomApp } from "@/components/staffroom/staffroom-app";
import { getStaffroomDirectory } from "@/lib/staffroom/data";
import { getPinConfig, hasValidStaffroomSession } from "@/lib/staffroom/session";

export const dynamic = "force-dynamic";

/** Minutes of no touches before the tablet locks itself. */
const IDLE_LOCK_MINUTES = 5;

function Notice({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center px-4 py-8">
      <div className="card w-full max-w-md p-6">
        <h1 className="font-display text-xl font-bold text-charcoal">{title}</h1>
        <div className="mt-2 text-sm leading-relaxed text-charcoal/65">{children}</div>
      </div>
    </div>
  );
}

export default async function StaffroomPage() {
  const config = getPinConfig();

  // Fail closed: with no usable PIN configured, nobody gets in.
  if (config.state === "missing") {
    return (
      <Notice title="Staff room page isn't set up yet">
        <p>
          A manager needs to add a <code className="rounded bg-charcoal/5 px-1">STAFFROOM_PIN</code> setting in Vercel
          (4–12 digits — 6 is recommended) and redeploy. Until then this page stays locked for everyone.
        </p>
      </Notice>
    );
  }
  if (config.state === "invalid") {
    return (
      <Notice title="Staff room PIN needs fixing">
        <p>
          The <code className="rounded bg-charcoal/5 px-1">STAFFROOM_PIN</code> setting in Vercel must be digits only,
          4–12 long. Until it&apos;s fixed this page stays locked for everyone.
        </p>
      </Notice>
    );
  }

  if (!hasValidStaffroomSession()) return <PinScreen />;

  try {
    const directory = await getStaffroomDirectory();
    return <StaffroomApp directory={directory} idleMinutes={IDLE_LOCK_MINUTES} />;
  } catch (error) {
    console.error("Staff room directory failed to load", error);
    return (
      <Notice title="Couldn't load the contacts">
        <p>Something went wrong loading the lists. Try refreshing the page; if it keeps happening, tell the manager.</p>
      </Notice>
    );
  }
}

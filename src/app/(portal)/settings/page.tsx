import { getCurrentProfile } from "@/lib/data/profiles";
import { getFeeSettings } from "@/lib/data/fees";
import { ChangePasswordForm } from "@/components/settings/change-password-form";
import { FeeSettingsForm } from "@/components/settings/fee-settings-form";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const [profile, feeSettings] = await Promise.all([getCurrentProfile(), getFeeSettings()]);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-8">
      <div>
        <h1 className="font-display text-2xl font-semibold text-ocean-950 md:text-3xl">Settings</h1>
        <p className="mt-1 text-sm text-ocean-500">Manage your account and how the portal is administered.</p>
      </div>

      <section className="card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ocean-500">Your account</h2>
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-full bg-ocean-100 text-sm font-semibold text-ocean-700">
            {initials(profile?.full_name)}
          </span>
          <div>
            <p className="text-sm font-medium text-ocean-950">{profile?.full_name}</p>
            <p className="text-xs text-ocean-500">{profile?.email}</p>
          </div>
        </div>
      </section>

      <section className="card p-5">
        <h2 className="mb-4 text-xs font-semibold uppercase tracking-wide text-ocean-500">Change password</h2>
        <ChangePasswordForm />
      </section>

      <section className="card p-5">
        <h2 className="mb-1 text-xs font-semibold uppercase tracking-wide text-ocean-500">Fee settings</h2>
        <p className="mb-4 text-sm text-ocean-700">
          The centre-wide numbers every child&apos;s weekly fee is calculated from — a child with their own hourly
          rate or a special weekly amount set on their profile overrides the standard rate here.
        </p>
        <FeeSettingsForm settings={feeSettings} />
      </section>

      <section className="card p-5">
        <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-ocean-500">Management accounts</h2>
        <p className="text-sm text-ocean-700">
          Beach Kids runs on a single authorised login for now. The system is built so more management accounts
          can be added without any schema changes — each Supabase Auth user automatically gets a{" "}
          <code className="rounded bg-ocean-50 px-1.5 py-0.5 text-xs">profiles</code> row and the same private
          access to every table and to the evidence bucket.
        </p>
        <p className="mt-2 text-sm text-ocean-700">
          To add another account today, invite or create the user from the Supabase dashboard under
          Authentication → Users. An in-app &quot;Invite a manager&quot; flow can be added here in a future
          version.
        </p>
      </section>
    </div>
  );
}

import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileNav } from "@/components/mobile-nav";
import { getCurrentProfile } from "@/lib/data/profiles";
import { countOutstandingReminders } from "@/lib/data/email";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  // This layout wraps every page in the app, so a failure here must never
  // take the whole site down. countOutstandingReminders() depends on the
  // 0050 migration (email_messages, children.start_date/leaving_date) —
  // if the code ever ships to Vercel slightly before that migration is run
  // in Supabase, this would otherwise 500 every single page. Caught and
  // defaulted to 0 (badge just doesn't show yet) instead.
  const [profile, emailReminderCount] = await Promise.all([
    getCurrentProfile(),
    countOutstandingReminders().catch(() => 0),
  ]);
  const userName = profile?.full_name ?? "Manager";

  return (
    <div className="flex min-h-screen">
      <Sidebar
        userName={userName}
        userEmail={profile?.email}
        badgeCounts={{ emailReminders: emailReminderCount }}
      />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar userName={userName} />
        <main className="flex-1 px-4 pb-20 pt-6 md:px-8 md:pb-10 print:p-0">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

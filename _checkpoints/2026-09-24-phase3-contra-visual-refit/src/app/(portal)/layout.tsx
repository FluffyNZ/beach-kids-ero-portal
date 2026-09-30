import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { MobileNav } from "@/components/mobile-nav";
import { getCurrentProfile } from "@/lib/data/profiles";

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const profile = await getCurrentProfile();
  const userName = profile?.full_name ?? "Manager";

  return (
    <div className="flex min-h-screen">
      <Sidebar userName={userName} userEmail={profile?.email} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Topbar userName={userName} />
        <main className="flex-1 px-4 pb-20 pt-6 md:px-8 md:pb-10">{children}</main>
      </div>
      <MobileNav />
    </div>
  );
}

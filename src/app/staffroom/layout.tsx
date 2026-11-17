import type { Metadata } from "next";

// A separate, PIN-gated area of the site for checking children's contacts
// (the staff-room tablet, or the "Contacts PIN" tab on the login page). It
// sits outside the (portal) route group on purpose, so none of Earlydesk's
// sidebar, navigation or login-only pages are reachable from here.
export const metadata: Metadata = {
  title: "Children's contacts",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Contacts", statusBarStyle: "default" },
};

export default function StaffroomLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-canvas">{children}</div>;
}

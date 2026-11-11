import type { Metadata } from "next";

// A separate, PIN-gated area of the site for the staff-room tablet — it sits
// outside the (portal) route group on purpose, so none of the portal's
// sidebar, topbar or login-only pages are reachable from here.
export const metadata: Metadata = {
  title: "Beach Kids – Staff Room",
  robots: { index: false, follow: false },
  appleWebApp: { capable: true, title: "Staff Room", statusBarStyle: "default" },
};

export default function StaffroomLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-neutral-50">{children}</div>;
}

import type { Metadata, Viewport } from "next";
import { Inter, Bitter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const bitter = Bitter({
  subsets: ["latin"],
  variable: "--font-bitter",
  display: "swap",
  weight: ["600", "700"],
});

// Product branding is Earlydesk. Pages that set their own `title` keep it,
// shown as "<page> · Earlydesk". The favicon (app/favicon.ico + app/icon.svg)
// and Apple touch icon (app/apple-icon.png) are picked up automatically by
// Next.js from those files — no <link> tags needed here.
export const metadata: Metadata = {
  title: {
    default: "Earlydesk",
    template: "%s · Earlydesk",
  },
  applicationName: "Earlydesk",
  description: "Your centre's people, planning and everyday admin, together.",
  appleWebApp: { title: "Earlydesk", statusBarStyle: "default" },
  robots: {
    index: false,
    follow: false,
  },
};

export const viewport: Viewport = {
  themeColor: "#FAF8F5",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={`${inter.variable} ${bitter.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

import type { Metadata } from "next";
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

export const metadata: Metadata = {
  title: "Beach Kids – ERO Self-Audit Portal",
  description: "Private ERO self-audit and compliance evidence management for Beach Kids ECE.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en-NZ" className={`${inter.variable} ${bitter.variable}`}>
      <body className="min-h-screen font-sans">{children}</body>
    </html>
  );
}

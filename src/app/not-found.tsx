import Link from "next/link";
import { Logo } from "@/components/brand/logo";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-canvas px-4 text-center">
      <Logo variant="full" height={32} className="mb-4" />
      <p className="text-2xl font-semibold tracking-tight text-charcoal">Page not found</p>
      <p className="text-sm text-charcoal/70">That page doesn&apos;t exist, or the criterion code isn&apos;t recognised.</p>
      <Link href="/dashboard" className="btn-primary mt-2">
        Back to Home
      </Link>
    </main>
  );
}

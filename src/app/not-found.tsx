import Link from "next/link";

export default function NotFound() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-3 bg-sand-50 px-4 text-center">
      <p className="font-display text-3xl font-semibold text-ocean-950">Page not found</p>
      <p className="text-sm text-ocean-500">That page doesn&apos;t exist, or the criterion code isn&apos;t recognised.</p>
      <Link href="/dashboard" className="btn-primary mt-2">
        Back to Dashboard
      </Link>
    </main>
  );
}

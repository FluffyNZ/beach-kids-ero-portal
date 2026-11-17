import Link from "next/link";

/** Shown in place of a page whose feature is switched off in
 * lib/features.ts — a calm explanation rather than a 404 or an error. */
export function ParkedFeature({ title, description }: { title: string; description: string }) {
  return (
    <div className="mx-auto flex w-full max-w-xl flex-col items-start gap-4 py-10">
      <span className="badge bg-lilac-100 text-charcoal">Paused</span>
      <h1 className="text-2xl font-semibold tracking-tight text-charcoal md:text-3xl">{title}</h1>
      <p className="text-base leading-relaxed text-charcoal/75">{description}</p>
      <Link href="/dashboard" className="btn-primary mt-2">
        Back to Home
      </Link>
    </div>
  );
}

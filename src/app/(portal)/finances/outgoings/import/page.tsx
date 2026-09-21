import Link from "next/link";
import { ImportOutgoingsForm } from "@/components/finances/import-outgoings-form";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default function ImportOutgoingsPage() {
  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/finances" className="hover:text-charcoal">
          Finances
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <Link href="/finances/outgoings" className="hover:text-charcoal">
          Outgoings
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">Import</span>
      </nav>

      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Import outgoings</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Bring in a batch of real transactions from an accounting export (e.g. Xero) instead of entering them one
          at a time. Nothing here is invented — it only records exactly what&apos;s pasted in.
        </p>
      </div>

      <ImportOutgoingsForm />
    </div>
  );
}

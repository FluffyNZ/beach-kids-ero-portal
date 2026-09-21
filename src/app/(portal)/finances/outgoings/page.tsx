import Link from "next/link";
import { getFinanceOutgoings } from "@/lib/data/finances";
import { AddOutgoingModal } from "@/components/finances/add-outgoing-modal";
import { OutgoingsTable } from "@/components/finances/outgoings-table";
import { ChevronRightIcon } from "@/components/icons";

export const dynamic = "force-dynamic";

export default async function OutgoingsPage() {
  const outgoings = await getFinanceOutgoings();

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <nav className="flex flex-wrap items-center gap-1.5 text-sm text-charcoal/50">
        <Link href="/finances" className="hover:text-charcoal">
          Finances
        </Link>
        <ChevronRightIcon className="h-3.5 w-3.5" />
        <span className="font-medium text-charcoal">Outgoings</span>
      </nav>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Outgoings</h1>
          <p className="mt-1 text-sm text-charcoal/60">Every overhead and bill recorded, most recent first.</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finances/outgoings/import" className="btn-ghost">
            Import from Xero
          </Link>
          <AddOutgoingModal />
        </div>
      </div>

      <OutgoingsTable outgoings={outgoings} />
    </div>
  );
}

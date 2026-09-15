import { getStockOrderSummaries, getStockOrderSettings } from "@/lib/data/stock-orders";
import { updateStockOrderSettings } from "@/lib/actions/stock-orders";
import { StockSupplierCard } from "@/components/stock-orders/stock-supplier-card";

export const dynamic = "force-dynamic";

export default async function StockOrdersPage() {
  const [summaries, settings] = await Promise.all([getStockOrderSummaries(), getStockOrderSettings()]);

  async function saveCleanBossEmail(email: string) {
    "use server";
    await updateStockOrderSettings({ clean_boss_email: email || null });
  }

  return (
    <div className="mx-auto flex w-full max-w-3xl flex-col gap-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-charcoal md:text-3xl">Stock Orders</h1>
        <p className="mt-1 text-sm text-charcoal/60">
          Keep a running order list for each supplier as things run low, then work through the list when it&apos;s
          time to actually order. There&apos;s no direct integration with these suppliers — Gilmours and Qizzle are
          still ordered on their own sites, and Clean Boss by email (this page can draft that email for you).
        </p>
      </div>

      {summaries.map((summary) => (
        <StockSupplierCard
          key={summary.supplier}
          summary={summary}
          cleanBossEmail={summary.supplier === "clean_boss" ? settings.cleanBossEmail : undefined}
          onSaveCleanBossEmail={summary.supplier === "clean_boss" ? saveCleanBossEmail : undefined}
        />
      ))}
    </div>
  );
}

import "server-only";
import { createClient } from "@/lib/supabase/server";
import { STOCK_SUPPLIERS } from "@/lib/constants";
import type { StockOrderItem, StockOrderSettings, StockSupplierSummary } from "@/lib/types";
import type { StockOrderItemStatus, StockSupplier } from "@/lib/supabase/database.types";

type StockOrderItemRow = {
  id: string;
  supplier: StockSupplier;
  item_name: string;
  quantity: number;
  unit: string | null;
  notes: string | null;
  status: StockOrderItemStatus;
  ordered_at: string | null;
  created_at: string;
};

function mapItem(row: StockOrderItemRow): StockOrderItem {
  return {
    id: row.id,
    supplier: row.supplier,
    item_name: row.item_name,
    quantity: row.quantity,
    unit: row.unit,
    notes: row.notes,
    status: row.status,
    ordered_at: row.ordered_at,
    created_at: row.created_at,
  };
}

/** Every supplier's still-to-order items, plus (per supplier) a summary of
 * the most recent order placed — grouped by `ordered_at` since a whole
 * order is marked placed in one action, so every item in that order
 * shares the same timestamp. */
export async function getStockOrderSummaries(): Promise<StockSupplierSummary[]> {
  const supabase = createClient();

  const [{ data: pendingRows }, { data: orderedRows }] = await Promise.all([
    supabase
      .from("stock_order_items")
      .select("id, supplier, item_name, quantity, unit, notes, status, ordered_at, created_at")
      .eq("status", "pending")
      .order("created_at", { ascending: true }),
    supabase
      .from("stock_order_items")
      .select("supplier, ordered_at")
      .eq("status", "ordered")
      .order("ordered_at", { ascending: false })
      .limit(200),
  ]);

  const pendingBySupplier = new Map<StockSupplier, StockOrderItem[]>();
  (pendingRows as StockOrderItemRow[] | null ?? []).forEach((row) => {
    const list = pendingBySupplier.get(row.supplier) ?? [];
    list.push(mapItem(row));
    pendingBySupplier.set(row.supplier, list);
  });

  const lastOrderBySupplier = new Map<StockSupplier, { orderedAt: string; itemCount: number }>();
  (orderedRows ?? []).forEach((row) => {
    if (!row.ordered_at) return;
    const existing = lastOrderBySupplier.get(row.supplier as StockSupplier);
    if (!existing) {
      lastOrderBySupplier.set(row.supplier as StockSupplier, { orderedAt: row.ordered_at, itemCount: 1 });
    } else if (existing.orderedAt === row.ordered_at) {
      existing.itemCount += 1;
    }
    // Rows are ordered newest-first, so the first ordered_at seen per
    // supplier is already the most recent order — anything with a
    // different, older timestamp is a previous order and is ignored here.
  });

  return STOCK_SUPPLIERS.map((supplier) => ({
    supplier,
    pendingItems: pendingBySupplier.get(supplier) ?? [],
    lastOrder: lastOrderBySupplier.get(supplier) ?? null,
  }));
}

export async function getStockOrderSettings(): Promise<StockOrderSettings> {
  const supabase = createClient();
  const { data } = await supabase.from("stock_order_settings").select("*").eq("id", true).maybeSingle();
  return { cleanBossEmail: data?.clean_boss_email ?? null };
}

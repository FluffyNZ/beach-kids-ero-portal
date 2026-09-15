"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import type { StockSupplier } from "@/lib/supabase/database.types";

async function currentUserId(): Promise<string | null> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user?.id ?? null;
}

export async function addStockOrderItem(
  supplier: StockSupplier,
  fields: { item_name: string; quantity: number; unit?: string | null; notes?: string | null }
) {
  const itemName = fields.item_name.trim();
  if (!itemName) throw new Error("Enter an item name.");

  const supabase = createClient();
  const userId = await currentUserId();

  const { error } = await supabase.from("stock_order_items").insert({
    supplier,
    item_name: itemName,
    quantity: fields.quantity > 0 ? fields.quantity : 1,
    unit: fields.unit?.trim() || null,
    notes: fields.notes?.trim() || null,
    status: "pending",
    created_by: userId,
  } as any);

  if (error) throw new Error(`Could not add this item: ${error.message}`);
  revalidatePath("/stock-orders");
}

export async function removeStockOrderItem(itemId: string) {
  const supabase = createClient();
  const { error } = await supabase.from("stock_order_items").delete().eq("id", itemId);
  if (error) throw new Error(`Could not remove this item: ${error.message}`);
  revalidatePath("/stock-orders");
}

/** Marks every currently-pending item for a supplier as ordered, all with
 * the same timestamp — that's what groups them together as "one order" on
 * the page's order-history summary. This doesn't place the order itself;
 * it just records that you've now gone and placed it (on the supplier's
 * own site, or by the Clean Boss email) so the list can start fresh. */
export async function markSupplierOrdered(supplier: StockSupplier) {
  const supabase = createClient();
  const userId = await currentUserId();
  const orderedAt = new Date().toISOString();

  const { error } = await supabase
    .from("stock_order_items")
    .update({ status: "ordered", ordered_at: orderedAt, ordered_by: userId } as any)
    .eq("supplier", supplier)
    .eq("status", "pending");

  if (error) throw new Error(`Could not mark this order as placed: ${error.message}`);
  revalidatePath("/stock-orders");
}

export async function updateStockOrderSettings(fields: { clean_boss_email?: string | null }) {
  const supabase = createClient();
  const userId = await currentUserId();

  const { error } = await supabase
    .from("stock_order_settings")
    .update({ ...fields, updated_by: userId } as any)
    .eq("id", true);

  if (error) throw new Error(`Could not save this setting: ${error.message}`);
  revalidatePath("/stock-orders");
}

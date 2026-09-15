"use client";

import { useState, useTransition } from "react";
import { addStockOrderItem, removeStockOrderItem, markSupplierOrdered } from "@/lib/actions/stock-orders";
import { STOCK_SUPPLIER_LABEL } from "@/lib/constants";
import { TrashIcon, PlusIcon } from "@/components/icons";
import { formatDateTime } from "@/lib/utils";
import type { StockSupplierSummary } from "@/lib/types";

/** Builds the mailto: link for a Clean Boss order — opens in the user's
 * own email app with the list pre-filled, so nothing is sent from here;
 * they still review and hit send themselves. */
function buildOrderMailto(email: string, items: StockSupplierSummary["pendingItems"]) {
  const today = new Intl.DateTimeFormat("en-NZ", { day: "numeric", month: "short", year: "numeric" }).format(
    new Date()
  );
  const subject = `Stock order — Beach Kids Waihi — ${today}`;
  const lines = items.map((item) => {
    const qty = `${item.quantity}${item.unit ? ` ${item.unit}` : ""}`;
    const notes = item.notes ? ` (${item.notes})` : "";
    return `- ${item.item_name} x ${qty}${notes}`;
  });
  const body = ["Hi Clean Boss team,", "", "Could we please get the following on our next order:", "", ...lines, "", "Thanks,", "Beach Kids Waihi"].join(
    "\n"
  );
  return `mailto:${encodeURIComponent(email)}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

export function StockSupplierCard({
  summary,
  cleanBossEmail,
  onSaveCleanBossEmail,
}: {
  summary: StockSupplierSummary;
  cleanBossEmail?: string | null;
  onSaveCleanBossEmail?: (email: string) => Promise<void>;
}) {
  const { supplier, pendingItems, lastOrder } = summary;
  const isCleanBoss = supplier === "clean_boss";

  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  const [itemName, setItemName] = useState("");
  const [quantity, setQuantity] = useState("1");
  const [unit, setUnit] = useState("");
  const [notes, setNotes] = useState("");

  const [editingEmail, setEditingEmail] = useState(false);
  const [emailDraft, setEmailDraft] = useState(cleanBossEmail ?? "");

  function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!itemName.trim()) return;
    setError(null);
    startTransition(async () => {
      try {
        await addStockOrderItem(supplier, {
          item_name: itemName,
          quantity: Number(quantity) || 1,
          unit: unit || null,
          notes: notes || null,
        });
        setItemName("");
        setQuantity("1");
        setUnit("");
        setNotes("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong adding that item.");
      }
    });
  }

  function handleRemove(itemId: string) {
    setError(null);
    startTransition(async () => {
      try {
        await removeStockOrderItem(itemId);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong removing that item.");
      }
    });
  }

  function handleMarkOrdered() {
    setError(null);
    startTransition(async () => {
      try {
        await markSupplierOrdered(supplier);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong marking this order as placed.");
      }
    });
  }

  function handleSaveEmail() {
    if (!onSaveCleanBossEmail) return;
    setError(null);
    startTransition(async () => {
      try {
        await onSaveCleanBossEmail(emailDraft.trim());
        setEditingEmail(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Something went wrong saving that email address.");
      }
    });
  }

  return (
    <section className="card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-charcoal/50">
          {STOCK_SUPPLIER_LABEL[supplier]}
        </h2>
        <p className="text-xs text-charcoal/40">
          {lastOrder
            ? `Last ordered ${formatDateTime(lastOrder.orderedAt)} (${lastOrder.itemCount} item${lastOrder.itemCount === 1 ? "" : "s"})`
            : "No orders placed yet"}
        </p>
      </div>

      {isCleanBoss && (
        <div className="mb-4 rounded-lg bg-sand-50 px-3 py-2 text-xs text-charcoal/60">
          {editingEmail ? (
            <div className="flex flex-wrap items-center gap-2">
              <span>Order email:</span>
              <input
                type="email"
                className="input flex-1"
                style={{ minWidth: "12rem" }}
                value={emailDraft}
                onChange={(e) => setEmailDraft(e.target.value)}
                placeholder="orders@cleanboss.co.nz"
                autoFocus
              />
              <button type="button" disabled={pending} className="btn-primary" onClick={handleSaveEmail}>
                Save
              </button>
              <button type="button" className="btn-ghost" onClick={() => { setEditingEmail(false); setEmailDraft(cleanBossEmail ?? ""); }}>
                Cancel
              </button>
            </div>
          ) : (
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                Order email: {cleanBossEmail || <span className="italic text-charcoal/40">not set yet</span>}
              </span>
              <button type="button" className="text-burgundy-600 underline" onClick={() => setEditingEmail(true)}>
                {cleanBossEmail ? "Change" : "Set email"}
              </button>
            </div>
          )}
        </div>
      )}

      {pendingItems.length === 0 ? (
        <p className="mb-4 text-sm text-charcoal/40">Nothing on the list yet.</p>
      ) : (
        <ul className="mb-4 flex flex-col divide-y divide-charcoal/5">
          {pendingItems.map((item) => (
            <li key={item.id} className="flex items-center justify-between gap-2 py-2">
              <div className="text-sm text-charcoal">
                <span className="font-medium">{item.item_name}</span>
                <span className="text-charcoal/50">
                  {" "}
                  × {item.quantity}
                  {item.unit ? ` ${item.unit}` : ""}
                </span>
                {item.notes && <span className="block text-xs text-charcoal/40">{item.notes}</span>}
              </div>
              <button
                type="button"
                disabled={pending}
                onClick={() => handleRemove(item.id)}
                className="shrink-0 rounded-lg p-1.5 text-charcoal/30 hover:bg-status-actionBg hover:text-status-action"
                aria-label={`Remove ${item.item_name}`}
              >
                <TrashIcon className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={handleAdd} className="mb-4 flex flex-wrap items-end gap-2">
        <div className="flex-1" style={{ minWidth: "10rem" }}>
          <label className="label">Item</label>
          <input className="input" value={itemName} onChange={(e) => setItemName(e.target.value)} placeholder="e.g. Paper towels" />
        </div>
        <div style={{ width: "5rem" }}>
          <label className="label">Qty</label>
          <input type="number" min={0.5} step="0.5" className="input" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
        </div>
        <div style={{ width: "6.5rem" }}>
          <label className="label">Unit</label>
          <input className="input" value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="boxes" />
        </div>
        <div className="flex-1" style={{ minWidth: "8rem" }}>
          <label className="label">Notes</label>
          <input className="input" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Optional" />
        </div>
        <button type="submit" disabled={pending || !itemName.trim()} className="btn-primary">
          <PlusIcon className="h-4 w-4" />
          Add
        </button>
      </form>

      {error && <p className="mb-3 rounded-lg bg-status-actionBg px-3 py-2 text-sm text-status-action">{error}</p>}

      <div className="flex flex-wrap items-center justify-end gap-2">
        {isCleanBoss && cleanBossEmail && pendingItems.length > 0 && (
          <a href={buildOrderMailto(cleanBossEmail, pendingItems)} className="btn-ghost">
            Email this order
          </a>
        )}
        <button
          type="button"
          disabled={pending || pendingItems.length === 0}
          onClick={handleMarkOrdered}
          className="btn-primary"
        >
          Mark order as placed
        </button>
      </div>
    </section>
  );
}

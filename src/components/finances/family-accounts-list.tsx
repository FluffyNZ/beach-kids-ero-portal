"use client";

import { useState } from "react";
import Link from "next/link";
import { EmptyState } from "@/components/ui/empty-state";
import { FilterChips, SearchField } from "@/components/finances/finance-page";
import { formatCurrency } from "@/lib/utils";
import type { FamilyAccountRow } from "@/lib/data/finance-hub";

export type FamilyFilter = "enrolled" | "balance" | "overdue" | "no_email" | "all";

/** Searchable list of family accounts with their current balances. */
export function FamilyAccountsList({ rows, initialFilter }: { rows: FamilyAccountRow[]; initialFilter: FamilyFilter }) {
  const [filter, setFilter] = useState<FamilyFilter>(initialFilter);
  const [query, setQuery] = useState("");

  const test: Record<FamilyFilter, (r: FamilyAccountRow) => boolean> = {
    enrolled: (r) => r.children.length > 0,
    balance: (r) => r.outstanding > 0,
    overdue: (r) => r.overdue > 0,
    no_email: (r) => r.children.length > 0 && !r.email,
    all: () => true,
  };
  const options: Array<{ value: FamilyFilter; label: string; count: number }> = [
    { value: "enrolled", label: "With enrolled children", count: rows.filter(test.enrolled).length },
    { value: "balance", label: "With a balance", count: rows.filter(test.balance).length },
    { value: "overdue", label: "Overdue", count: rows.filter(test.overdue).length },
    { value: "no_email", label: "No email", count: rows.filter(test.no_email).length },
    { value: "all", label: "All", count: rows.length },
  ];
  const q = query.trim().toLowerCase();
  const visible = rows.filter(
    (r) =>
      test[filter](r) &&
      (!q || r.name.toLowerCase().includes(q) || (r.email ?? "").toLowerCase().includes(q) || r.children.some((c) => c.toLowerCase().includes(q)))
  );

  return (
    <section aria-label="Family accounts" className="flex flex-col rounded-2xl border border-charcoal/10 bg-white">
      <div className="flex flex-col gap-3 border-b border-charcoal/10 px-4 py-3 sm:px-5">
        <SearchField id="family-search" label="Search family accounts" value={query} onChange={setQuery} placeholder="Name, email or child" />
        <FilterChips label="Show" options={options} value={filter} onChange={setFilter} />
      </div>
      {visible.length === 0 ? (
        <EmptyState title="No family accounts match" description="Try another search or filter." />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-charcoal/10 text-left text-xs font-medium text-charcoal/70">
                <th scope="col" className="px-5 py-2.5">Family account</th>
                <th scope="col" className="px-3 py-2.5">Linked children</th>
                <th scope="col" className="px-3 py-2.5">Contact</th>
                <th scope="col" className="px-3 py-2.5 text-right">Outstanding</th>
                <th scope="col" className="px-3 py-2.5 pr-5 text-right">Overdue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-charcoal/10">
              {visible.map((r) => (
                <tr key={r.id} className="hover:bg-lilac-50">
                  <th scope="row" className="px-5 py-2.5 text-left">
                    <Link href={`/finances/clients/${r.id}`} className="font-medium text-lilac-700 underline-offset-4 hover:underline">
                      {r.name}
                    </Link>
                  </th>
                  <td className="px-3 py-2.5 text-charcoal">
                    {r.children.length ? r.children.join(", ") : <span className="text-charcoal/70">No enrolled children</span>}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className="block max-w-[16rem] truncate text-charcoal">{r.email ?? <span className="text-charcoal/70">No email</span>}</span>
                    {r.phone && <span className="block text-xs text-charcoal/70">{r.phone}</span>}
                  </td>
                  <td className="px-3 py-2.5 text-right tabular-nums">{r.invoiceCount === 0 ? <span className="text-charcoal/70">No invoices</span> : formatCurrency(r.outstanding)}</td>
                  <td className="px-3 py-2.5 pr-5 text-right tabular-nums">{r.overdue > 0 ? <span className="font-semibold">{formatCurrency(r.overdue)}</span> : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="border-t border-charcoal/10 px-5 py-3 text-sm text-charcoal/70">
        Showing {visible.length} of {rows.length} family accounts
      </p>
    </section>
  );
}

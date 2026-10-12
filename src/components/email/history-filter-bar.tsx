"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useState, useTransition } from "react";
import { SearchIcon } from "@/components/icons";
import type { EmailTemplate } from "@/lib/types";
import { EMAIL_MESSAGE_STATUS_LABEL } from "@/lib/constants";

export function HistoryFilterBar({ templates }: { templates: EmailTemplate[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [query, setQuery] = useState(searchParams.get("q") ?? "");
  const [, startTransition] = useTransition();

  function pushParams(next: { q?: string; status?: string; template?: string }) {
    const params = new URLSearchParams(searchParams.toString());
    (["q", "status", "template"] as const).forEach((key) => {
      if (next[key] !== undefined) {
        if (next[key]) params.set(key, next[key] as string);
        else params.delete(key);
      }
    });
    startTransition(() => router.push(`${pathname}?${params.toString()}`));
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row">
      <form
        className="relative flex-1"
        onSubmit={(e) => {
          e.preventDefault();
          pushParams({ q: query });
        }}
      >
        <SearchIcon className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-charcoal/40" />
        <input
          type="text"
          className="input pl-9"
          placeholder="Search by subject, recipient name or email…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
      </form>

      <select className="input sm:w-40" value={searchParams.get("status") ?? ""} onChange={(e) => pushParams({ status: e.target.value })}>
        <option value="">Any status</option>
        {Object.entries(EMAIL_MESSAGE_STATUS_LABEL).map(([value, label]) => (
          <option key={value} value={value}>
            {label}
          </option>
        ))}
      </select>

      <select className="input sm:w-52" value={searchParams.get("template") ?? ""} onChange={(e) => pushParams({ template: e.target.value })}>
        <option value="">Any template</option>
        {templates.map((t) => (
          <option key={t.key} value={t.key}>
            {t.label}
          </option>
        ))}
      </select>
    </div>
  );
}

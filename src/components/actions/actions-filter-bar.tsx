"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ACTION_PRIORITY_LABEL } from "@/lib/constants";
import { SECTION_META } from "@/lib/constants";

const STATUS_OPTIONS = [
  { value: "", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
  { value: "overdue", label: "Overdue" },
  { value: "due_soon", label: "Due soon (14 days)" },
];

export function ActionsFilterBar({ responsiblePeople }: { responsiblePeople: string[] }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function setParam(key: string, value: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`${pathname}?${params.toString()}`);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <select className="input w-auto" value={searchParams.get("status") ?? ""} onChange={(e) => setParam("status", e.target.value)}>
        {STATUS_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>{o.label}</option>
        ))}
      </select>

      <select className="input w-auto" value={searchParams.get("priority") ?? ""} onChange={(e) => setParam("priority", e.target.value)}>
        <option value="">All priorities</option>
        {Object.entries(ACTION_PRIORITY_LABEL).map(([value, label]) => (
          <option key={value} value={value}>{label}</option>
        ))}
      </select>

      <select className="input w-auto" value={searchParams.get("section") ?? ""} onChange={(e) => setParam("section", e.target.value)}>
        <option value="">All sections</option>
        {Object.entries(SECTION_META).map(([code, meta]) => (
          <option key={code} value={code}>{meta.short}</option>
        ))}
      </select>

      <select className="input w-auto" value={searchParams.get("responsible") ?? ""} onChange={(e) => setParam("responsible", e.target.value)}>
        <option value="">Everyone</option>
        {responsiblePeople.map((p) => (
          <option key={p} value={p}>{p}</option>
        ))}
      </select>
    </div>
  );
}
